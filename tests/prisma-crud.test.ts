import {
  BadgeAwardSource,
  DiscussionState,
  PrismaClient,
  ProblemProposalStatus,
  ProblemReviewDecision,
  ProblemState,
  ProblemVisibility,
  SubmissionStatus,
  UserRole,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const unique = (prefix: string) =>
  `${prefix}_${randomUUID().toString().replace(/-/g, "").slice(0, 12)}`;

async function createUser(overrides?: Partial<Prisma.UserCreateInput>) {
  const suffix = unique("user");
  return prisma.user.create({
    data: {
      email: `${suffix}@test.dev`,
      handle: suffix,
      hashedPassword: "hashed-password",
      ...overrides,
    },
  });
}

async function createDifficulty() {
  return prisma.difficulty.create({
    data: {
      code: unique("DIFF").toUpperCase(),
      name: "Test Difficulty",
      weight: Math.floor(Math.random() * 2000),
    },
  });
}

async function createTag() {
  return prisma.tag.create({
    data: {
      name: `Tag ${unique("tag")}`,
      slug: unique("tag-slug"),
    },
  });
}

async function createProblemGraph() {
  const author = await createUser();
  const difficulty = await createDifficulty();
  const tag = await createTag();
  const problem = await prisma.problem.create({
    data: {
      slug: unique("problem"),
      state: ProblemState.DRAFT,
      visibility: ProblemVisibility.INTERNAL,
      authorId: author.id,
      difficultyId: difficulty.id,
    },
  });
  const version = await prisma.problemVersion.create({
    data: {
      problemId: problem.id,
      versionNumber: 1,
      title: `Sample ${problem.slug}`,
      statement: "Problem statement",
      constraints: "Constraints",
      samples: [],
    },
  });
  await prisma.problem.update({
    where: { id: problem.id },
    data: { currentVersionId: version.id },
  });
  await prisma.problemTag.create({
    data: {
      problemId: problem.id,
      tagId: tag.id,
    },
  });
  return { author, difficulty, tag, problem, version };
}

async function createLanguage() {
  return prisma.language.create({
    data: {
      code: unique("lang"),
      displayName: "Test Lang",
      compileCmd: "echo compile",
      runCmd: "node Main",
      timeMultiplier: 1,
      memoryCeilingMb: 512,
      fileExtension: "txt",
      sandboxProfile: "test",
    },
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Problem domain tables", () => {
  test("supports creating, reading, updating and soft-deleting problems with versions and tags", async () => {
    const { problem, version, tag } = await createProblemGraph();

    const fetched = await prisma.problem.findUnique({
      where: { id: problem.id },
      include: {
        difficulty: true,
        currentVersion: true,
        tags: { include: { tag: true } },
      },
    });

    expect(fetched).toBeTruthy();
    expect(fetched?.currentVersion?.id).toEqual(version.id);
    expect(fetched?.tags[0]?.tag.id).toEqual(tag.id);

    const updated = await prisma.problem.update({
      where: { id: problem.id },
      data: {
        state: ProblemState.PUBLISHED,
        visibility: ProblemVisibility.PUBLIC,
      },
    });

    expect(updated.state).toBe(ProblemState.PUBLISHED);
    expect(updated.visibility).toBe(ProblemVisibility.PUBLIC);

    await prisma.problem.update({
      where: { id: problem.id },
      data: { deletedAt: new Date() },
    });

    const activeProblems = await prisma.problem.findMany({
      where: { id: problem.id, deletedAt: null },
    });
    expect(activeProblems).toHaveLength(0);
  });
});

describe("Language catalog", () => {
  test("languages can be created, read, updated, and soft-deleted", async () => {
    const language = await createLanguage();

    const fetched = await prisma.language.findUnique({
      where: { code: language.code },
    });
    expect(fetched?.displayName).toBe("Test Lang");

    const updated = await prisma.language.update({
      where: { code: language.code },
      data: { isEnabled: false, timeMultiplier: 1.5 },
    });
    expect(updated.isEnabled).toBe(false);
    expect(updated.timeMultiplier).toBeCloseTo(1.5);

    await prisma.language.update({
      where: { code: language.code },
      data: { deletedAt: new Date() },
    });

    const languages = await prisma.language.findMany({
      where: { code: language.code, deletedAt: null },
    });
    expect(languages).toHaveLength(0);
  });
});

describe("Submissions", () => {
  test("submissions and case results support CRUD", async () => {
    const { author, problem, version } = await createProblemGraph();
    const language = await createLanguage();
    const verdict = await prisma.verdict.create({
      data: {
        code: unique("VER"),
        label: "Accepted",
        rank: 1,
        isTerminal: true,
      },
    });

    const submission = await prisma.submission.create({
      data: {
        userId: author.id,
        problemId: problem.id,
        problemVersionId: version.id,
        languageCode: language.code,
        status: SubmissionStatus.PENDING,
        sourceCodeRef: `inline://${unique("src")}`,
        codeHash: unique("hash"),
      },
    });

    await prisma.submissionCaseResult.create({
      data: {
        submissionId: submission.id,
        testOrdinal: 1,
        verdictCode: verdict.code,
        timeMs: 12,
        memoryKb: 256,
      },
    });

    const fetched = await prisma.submission.findUnique({
      where: { id: submission.id },
      include: { caseResults: true },
    });
    expect(fetched?.caseResults).toHaveLength(1);

    const completed = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.COMPLETED,
        verdictCode: verdict.code,
        score: 100,
        timeUsedMs: 45,
      },
    });
    expect(completed.status).toBe(SubmissionStatus.COMPLETED);
    expect(completed.verdictCode).toBe(verdict.code);

    await prisma.submission.update({
      where: { id: submission.id },
      data: { deletedAt: new Date() },
    });
    const visible = await prisma.submission.findMany({
      where: { id: submission.id, deletedAt: null },
    });
    expect(visible).toHaveLength(0);
  });
});

describe("Discussions & votes", () => {
  test("discussion threads can be created, replied to, voted on, and moderated", async () => {
    const { author, problem } = await createProblemGraph();
    const anotherUser = await createUser();

    const thread = await prisma.discussion.create({
      data: {
        problemId: problem.id,
        authorId: author.id,
        content: "Root discussion thread",
      },
    });

    await prisma.discussion.create({
      data: {
        problemId: problem.id,
        authorId: author.id,
        parentId: thread.id,
        content: "Reply",
      },
    });

    const vote = await prisma.vote.create({
      data: {
        discussionId: thread.id,
        userId: anotherUser.id,
        value: 1,
      },
    });

    const hydrated = await prisma.discussion.findUnique({
      where: { id: thread.id },
      include: { replies: true, votes: true },
    });
    expect(hydrated?.replies).toHaveLength(1);
    expect(hydrated?.votes[0]?.id).toBe(vote.id);

    const moderated = await prisma.discussion.update({
      where: { id: thread.id },
      data: { state: DiscussionState.HIDDEN },
    });
    expect(moderated.state).toBe(DiscussionState.HIDDEN);

    await prisma.discussion.update({
      where: { id: thread.id },
      data: { deletedAt: new Date() },
    });

    const visibleThreads = await prisma.discussion.findMany({
      where: { id: thread.id, deletedAt: null },
    });
    expect(visibleThreads).toHaveLength(0);
  });
});

describe("Badges & awards", () => {
  test("badges can be awarded, updated, and revoked", async () => {
    const user = await createUser();
    const badge = await prisma.badge.create({
      data: {
        slug: unique("badge"),
        name: "Test Badge",
        criteria: { threshold: 1 },
        icon: "⭐️",
      },
    });

    const award = await prisma.badgeAward.create({
      data: {
        badgeId: badge.id,
        userId: user.id,
        source: BadgeAwardSource.SYSTEM,
      },
    });

    const fetched = await prisma.badge.findUnique({
      where: { id: badge.id },
      include: { awards: true },
    });
    expect(fetched?.awards[0]?.id).toBe(award.id);

    const updatedBadge = await prisma.badge.update({
      where: { id: badge.id },
      data: { description: "Updated description" },
    });
    expect(updatedBadge.description).toBe("Updated description");

    await prisma.badgeAward.update({
      where: { id: award.id },
      data: { deletedAt: new Date() },
    });
    const activeAwards = await prisma.badgeAward.findMany({
      where: { id: award.id, deletedAt: null },
    });
    expect(activeAwards).toHaveLength(0);
  });
});

describe("Problem proposals workflow", () => {
  test("proposals support review lifecycle", async () => {
    const author = await createUser();
    const reviewer = await createUser({ role: UserRole.PROBLEM_CURATOR });

    const proposal = await prisma.problemProposal.create({
      data: {
        slug: unique("proposal"),
        title: "Grid Escape",
        intendedDifficulty: "Medium",
        statement: "Detailed statement".repeat(20),
        samples: [],
        authorId: author.id,
      },
    });
    expect(proposal.status).toBe(ProblemProposalStatus.SUBMITTED);

    await prisma.problemProposalComment.create({
      data: {
        proposalId: proposal.id,
        authorId: reviewer.id,
        body: "Needs stronger constraints.",
      },
    });

    const accepted = await prisma.problemProposal.update({
      where: { id: proposal.id },
      data: {
        status: ProblemProposalStatus.ACCEPTED,
        reviewerId: reviewer.id,
      },
    });
    expect(accepted.status).toBe(ProblemProposalStatus.ACCEPTED);

    const problem = await prisma.problem.create({
      data: {
        slug: unique("accepted-problem"),
        state: ProblemState.DRAFT,
        visibility: ProblemVisibility.INTERNAL,
        authorId: reviewer.id,
        versions: {
          create: {
            versionNumber: 1,
            title: accepted.title,
            statement: accepted.statement,
            constraints: "TBD",
            samples: accepted.samples as Prisma.InputJsonValue,
          },
        },
      },
      include: { versions: true },
    });
    await prisma.problemReview.create({
      data: {
        problemId: problem.id,
        reviewerId: reviewer.id,
        decision: ProblemReviewDecision.APPROVED,
        notes: "Looks good.",
      },
    });

    const reviews = await prisma.problemReview.findMany({ where: { problemId: problem.id } });
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.decision).toBe(ProblemReviewDecision.APPROVED);
  });
});
