import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";
import { ContestAntiCheatFlagStatus } from "@prisma/client";

const MAX_SUBMISSIONS_PER_PROBLEM = 60;
const SIMILARITY_THRESHOLD = 0.92;

type SubmissionEntry = {
  id: string;
  userId: string;
  problemId: string;
  code: string;
};

type ClusterCandidate = {
  problemId: string;
  similarityScore: number;
  members: Array<{ submissionId: string; userId: string; similarity: number }>;
};

export async function generateContestSimilarityClusters(contestId: string) {
  try {
    const submissions = await prisma.submission.findMany({
      where: { contestId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        userId: true,
        problemId: true,
        metadata: true,
      },
    });
    const entries = submissions
      .map((submission) => ({
        id: submission.id,
        userId: submission.userId,
        problemId: submission.problemId,
        code: extractCode(submission.metadata),
      }))
      .filter((entry) => entry.code.length > 0);
    const clusters: ClusterCandidate[] = [];
    const problems = groupBy(entries, (entry) => entry.problemId);
    for (const [problemId, list] of problems) {
      const trimmed = list.slice(0, MAX_SUBMISSIONS_PER_PROBLEM);
      const tokens = trimmed.map((entry) => ({
        entry,
        tokens: tokenize(entry.code),
      }));
      const adjacency = new Map<string, Set<string>>();
      const pairScore = new Map<string, number>();
      for (let i = 0; i < tokens.length; i += 1) {
        for (let j = i + 1; j < tokens.length; j += 1) {
          const similarity = computeSimilarity(tokens[i].tokens, tokens[j].tokens);
          if (similarity >= SIMILARITY_THRESHOLD) {
            if (!adjacency.has(tokens[i].entry.id)) {
              adjacency.set(tokens[i].entry.id, new Set());
            }
            if (!adjacency.has(tokens[j].entry.id)) {
              adjacency.set(tokens[j].entry.id, new Set());
            }
            adjacency.get(tokens[i].entry.id)?.add(tokens[j].entry.id);
            adjacency.get(tokens[j].entry.id)?.add(tokens[i].entry.id);
            pairScore.set(makePairKey(tokens[i].entry.id, tokens[j].entry.id), similarity);
          }
        }
      }
      const visited = new Set<string>();
      for (const { entry } of tokens) {
        if (visited.has(entry.id)) continue;
        const component = traverse(entry.id, adjacency, visited);
        if (component.length > 1) {
          const members = component.map((submissionId) => {
            const node = tokens.find((token) => token.entry.id === submissionId);
            return {
              submissionId,
              userId: node?.entry.userId ?? "",
              similarity: averageSimilarity(submissionId, component, pairScore),
            };
          });
          const similarityScore =
            members.reduce((acc, node) => acc + node.similarity, 0) / members.length;
          clusters.push({ problemId, similarityScore, members });
        }
      }
    }
    await prisma.$transaction(async (tx) => {
      await tx.contestAntiCheatClusterMember.deleteMany({
        where: { cluster: { contestId } },
      });
      await tx.contestAntiCheatCluster.deleteMany({ where: { contestId } });
      for (const cluster of clusters) {
        const created = await tx.contestAntiCheatCluster.create({
          data: {
            contestId,
            problemId: cluster.problemId,
            similarityScore: cluster.similarityScore,
            size: cluster.members.length,
          },
        });
        for (const member of cluster.members) {
          const submission = submissions.find((sub) => sub.id === member.submissionId);
          if (!submission) continue;
          const registration = await tx.contestRegistration.findFirst({
            where: { contestId, userId: submission.userId, deletedAt: null },
            select: { id: true, userId: true },
          });
          if (!registration) {
            continue;
          }
          const flag = await tx.contestAntiCheatFlag.upsert({
            where: { registrationId: registration.id },
            update: { status: { set: ContestAntiCheatFlagStatus.UNDER_REVIEW } },
            create: {
              contestId,
              registrationId: registration.id,
              userId: registration.userId,
              status: ContestAntiCheatFlagStatus.UNDER_REVIEW,
            },
          });
          await tx.contestAntiCheatClusterMember.create({
            data: {
              clusterId: created.id,
              flagId: flag.id,
              submissionId: member.submissionId,
              similarity: member.similarity,
            },
          });
        }
      }
    });
  } catch (error) {
    logger.error({ err: error }, "similarity cluster generation failed");
  }
}

function extractCode(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }
  if ("sourceCode" in metadata && typeof metadata.sourceCode === "string") {
    return metadata.sourceCode;
  }
  return "";
}

function tokenize(code: string) {
  return normalizeCode(code).split(/\W+/).filter(Boolean);
}

function normalizeCode(code: string) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function computeSimilarity(aTokens: string[], bTokens: string[]) {
  if (!aTokens.length || !bTokens.length) {
    return 0;
  }
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }
  return (2 * intersection) / (setA.size + setB.size);
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(item);
  }
  return map;
}

function traverse(start: string, adjacency: Map<string, Set<string>>, visited: Set<string>) {
  const stack = [start];
  const nodes: string[] = [];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || visited.has(node)) continue;
    visited.add(node);
    nodes.push(node);
    const neighbors = adjacency.get(node);
    if (neighbors) {
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      });
    }
  }
  return nodes;
}

function makePairKey(a: string, b: string) {
  return [a, b].sort().join("::");
}

function averageSimilarity(nodeId: string, component: string[], pairScore: Map<string, number>) {
  const others = component.filter((id) => id !== nodeId);
  if (others.length === 0) return 1;
  const total = others.reduce((acc, other) => {
    return acc + (pairScore.get(makePairKey(nodeId, other)) ?? 0);
  }, 0);
  return total / others.length;
}
