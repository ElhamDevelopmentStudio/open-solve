import { prisma } from "@/lib/prisma";
import { isStaffRole } from "@/lib/auth/permissions";
import type { TrailGraphPayload, TrailViewer, TrailReportInput } from "@/lib/trails/types";
import type { Prisma, TrailInsightCategory, UserRole, UserStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

const authorSelect = {
  id: true,
  handle: true,
  avatarUrl: true,
  status: true,
} satisfies Prisma.UserSelect;

export async function getTrailGraph(params: {
  problemId?: string;
  slug?: string;
  viewer?: TrailViewer | null;
}): Promise<TrailGraphPayload> {
  const problem = await prisma.problem.findFirst({
    where: params.problemId ? { id: params.problemId } : { slug: params.slug },
  });
  if (!problem) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Problem not found" });
  }
  const viewerIsStaff = params.viewer ? isStaffRole(params.viewer.role) : false;
  const visibilityFilter: Prisma.TrailInsightWhereInput = viewerIsStaff
    ? { problemId: problem.id }
    : {
        problemId: problem.id,
        OR: params.viewer?.id
          ? [{ isHidden: false }, { authorId: params.viewer.id }]
          : [{ isHidden: false }],
      };
  const insights = await prisma.trailInsight.findMany({
    where: visibilityFilter,
    include: {
      author: { select: authorSelect },
      votes: params.viewer
        ? {
            where: { userId: params.viewer.id },
            select: { value: true },
          }
        : false,
    },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
  });
  const filteredInsights = insights.filter((insight) =>
    viewerIsStaff || insight.author.status !== "SHADOW_BANNED" || insight.authorId === params.viewer?.id,
  );
  const edges = await prisma.trailEdge.findMany({
    where: { problemId: problem.id },
    orderBy: [{ weight: "desc" }],
  });
  return {
    insights: filteredInsights.map((insight) => ({
      id: insight.id,
      content: insight.content,
      category: insight.category,
      score: insight.score,
      isHidden: insight.isHidden,
      author: {
        id: insight.author.id,
        handle: insight.author.handle,
        avatarUrl: insight.author.avatarUrl,
      },
      viewerVote: insight.votes?.[0]?.value === 1 ? 1 : insight.votes?.[0]?.value === -1 ? -1 : 0,
      createdAt: insight.createdAt,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      fromInsightId: edge.fromInsightId,
      toInsightId: edge.toInsightId,
      weight: edge.weight,
    })),
  };
}

export async function addTrailInsight(params: {
  problemId: string;
  authorId: string;
  content: string;
  category: TrailInsightCategory;
  connectFrom?: string[];
  authorStatus: UserStatus;
}) {
  const problem = await prisma.problem.findUnique({ where: { id: params.problemId }, select: { id: true } });
  if (!problem) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Problem not found" });
  }
  const content = params.content.trim();
  if (!content) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Insight text is required" });
  }
  if (content.length > 200) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Insight must be under 200 characters" });
  }
  const connectIds = params.connectFrom?.slice(0, 5) ?? [];
  await prisma.$transaction(async (tx) => {
    const insight = await tx.trailInsight.create({
      data: {
        problemId: problem.id,
        authorId: params.authorId,
        content,
        category: params.category,
        isHidden: params.authorStatus === "SHADOW_BANNED",
      },
    });
    if (connectIds.length > 0) {
      const existing = await tx.trailInsight.findMany({
        where: { id: { in: connectIds }, problemId: problem.id },
        select: { id: true },
      });
      await Promise.all(
        existing.map((node) =>
          tx.trailEdge.upsert({
            where: {
              problemId_fromInsightId_toInsightId: {
                problemId: problem.id,
                fromInsightId: node.id,
                toInsightId: insight.id,
              },
            },
            update: { weight: { increment: 1 } },
            create: {
              problemId: problem.id,
              fromInsightId: node.id,
              toInsightId: insight.id,
            },
          }),
        ),
      );
    }
  });
}

export async function voteTrailInsight(params: { insightId: string; userId: string; direction: "UP" | "DOWN" }) {
  const value = params.direction === "UP" ? 1 : -1;
  const existing = await prisma.trailInsightVote.findUnique({
    where: {
      insightId_userId: {
        insightId: params.insightId,
        userId: params.userId,
      },
    },
  });
  const delta = existing ? (existing.value === value ? -value : value - existing.value) : value;
  const compound = { insightId: params.insightId, userId: params.userId } as const;
  await prisma.$transaction([
    existing
      ? existing.value === value
        ? prisma.trailInsightVote.delete({ where: { insightId_userId: compound } })
        : prisma.trailInsightVote.update({ where: { insightId_userId: compound }, data: { value } })
      : prisma.trailInsightVote.create({ data: { insightId: params.insightId, userId: params.userId, value } }),
    prisma.trailInsight.update({ where: { id: params.insightId }, data: { score: { increment: delta } } }),
  ]);
}

export async function reportTrailInsight(params: TrailReportInput & { reporterId: string }) {
  await prisma.trailReport.create({
    data: {
      insightId: params.insightId,
      reporterId: params.reporterId,
      reason: params.reason,
      note: params.note?.trim() || null,
    },
  });
}

export async function setTrailInsightHidden(insightId: string, hidden: boolean) {
  await prisma.trailInsight.update({ where: { id: insightId }, data: { isHidden: hidden } });
}

export async function resolveTrailReport(params: {
  reportId: string;
  status: "OPEN" | "VALID" | "INVALID";
  note?: string;
  resolverId: string;
}) {
  await prisma.trailReport.update({
    where: { id: params.reportId },
    data: {
      status: params.status,
      note: params.note?.trim() || null,
      resolvedById: params.resolverId,
      resolvedAt: new Date(),
    },
  });
}

export async function mergeTrailInsights(params: { sourceId: string; targetId: string; moderatorId: string }) {
  if (params.sourceId === params.targetId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Source and target must differ" });
  }
  await prisma.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.trailInsight.findUnique({ where: { id: params.sourceId }, select: { id: true, problemId: true } }),
      tx.trailInsight.findUnique({ where: { id: params.targetId }, select: { id: true, problemId: true } }),
    ]);
    if (!source || !target || source.problemId !== target.problemId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Insights must belong to same problem" });
    }
    const outgoing = await tx.trailEdge.findMany({ where: { fromInsightId: source.id } });
    const incoming = await tx.trailEdge.findMany({ where: { toInsightId: source.id } });
    await Promise.all(
      outgoing.map((edge) => {
        if (edge.toInsightId === target.id) {
          return Promise.resolve();
        }
        return tx.trailEdge.upsert({
          where: {
            problemId_fromInsightId_toInsightId: {
              problemId: source.problemId,
              fromInsightId: target.id,
              toInsightId: edge.toInsightId,
            },
          },
          update: { weight: { increment: edge.weight } },
          create: {
            problemId: source.problemId,
            fromInsightId: target.id,
            toInsightId: edge.toInsightId,
            weight: edge.weight,
          },
        });
      }),
    );
    await Promise.all(
      incoming.map((edge) => {
        if (edge.fromInsightId === target.id) {
          return Promise.resolve();
        }
        return tx.trailEdge.upsert({
          where: {
            problemId_fromInsightId_toInsightId: {
              problemId: source.problemId,
              fromInsightId: edge.fromInsightId,
              toInsightId: target.id,
            },
          },
          update: { weight: { increment: edge.weight } },
          create: {
            problemId: source.problemId,
            fromInsightId: edge.fromInsightId,
            toInsightId: target.id,
            weight: edge.weight,
          },
        });
      }),
    );
    await tx.trailInsight.update({ where: { id: source.id }, data: { isHidden: true, deletedAt: new Date() } });
    await tx.trailEdge.deleteMany({ where: { OR: [{ fromInsightId: source.id }, { toInsightId: source.id }] } });
  });
}
