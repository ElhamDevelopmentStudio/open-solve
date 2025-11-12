import { parseProblemSamples } from "@/lib/problems/samples";
import { prisma } from "@/lib/prisma";
import { protectedProcedure, publicProcedure, router } from "@/lib/trpc/trpc";
import {
  getSubmissionDetailForViewer,
  getSubmissionDetailForShare,
  mapTestCases,
} from "@/lib/submissions/detail";
import { hashSourceCode } from "@/lib/submissions/hash";
import { simulateSampleRun } from "@/lib/submissions/simulator";
import {
  type SampleRunResult,
  type SubmissionFilterMetadata,
  type SubmissionHistoryEntry,
  type SubmissionListEntry,
  type SubmissionListSummary,
} from "@/lib/submissions/types";
import {
  ACCEPTED_VERDICTS,
  SUBMISSION_CONTEST_FILTERS,
  SUBMISSION_LIST_SORTS,
  SUBMISSION_VERDICTS,
} from "@/lib/submissions/constants";
import { Prisma, SubmissionStatus, TestCaseKind } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  dispatchSubmissionToJudge,
  publishManualReviewMessage,
} from "@/lib/judge/dispatcher";
import { isStaffRole } from "@/lib/auth/permissions";
import { recordSubmissionEvent } from "@/lib/observability/metrics";

const codeInputSchema = z.object({
  problemId: z.string().cuid(),
  languageCode: z.string().min(2).max(32),
  sourceCode: z.string().min(8).max(40_000),
  stdin: z.string().max(5_000).optional(),
});

const submissionIdSchema = z.object({
  submissionId: z.string().cuid(),
});

const submissionListInput = z.object({
  problemId: z.string().cuid().optional(),
  problemSlug: z.string().min(1).max(128).optional(),
  verdicts: z.array(z.enum(SUBMISSION_VERDICTS)).max(8).optional(),
  statuses: z.array(z.nativeEnum(SubmissionStatus)).max(6).optional(),
  languages: z.array(z.string().min(2).max(32)).max(6).optional(),
  contest: z.enum(SUBMISSION_CONTEST_FILTERS).default("all"),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(SUBMISSION_LIST_SORTS).default("recent"),
  cursor: z.string().cuid().optional(),
  limit: z.number().int().min(5).max(50).default(20),
});

const problemHistoryInput = submissionListInput
  .extend({
    slug: z.string().min(1).max(128),
  })
  .omit({ problemId: true, problemSlug: true });

const draftSaveSchema = z.object({
  problemId: z.string().cuid(),
  languageCode: z.string().min(2).max(32),
  sourceCode: z.string().min(1).max(80_000),
  cursorOffset: z.number().int().min(0).max(1_000_000).default(0),
  savedVia: z.enum(["autosave", "manual"]).default("autosave"),
});

const draftGetSchema = z.object({
  problemId: z.string().cuid(),
  languageCode: z.string().min(2).max(32),
});

const publicShareSchema = z.object({
  publicId: z.string().min(16).max(64),
});

const hideVisibilitySchema = z.object({
  submissionId: z.string().cuid(),
  hidden: z.boolean().default(true),
});

export const submissionsRouter = router({
  runSample: protectedProcedure.input(codeInputSchema).mutation(async ({ input }) => {
    const [problem, language] = await Promise.all([
      getRunnableProblem(input.problemId),
      ensureLanguage(input.languageCode),
    ]);

    const samples = parseProblemSamples(problem.currentVersion.samples);
    const testCases = mapTestCases(problem.currentVersion.testCases, samples);

    const sampleRun: SampleRunResult = simulateSampleRun({
      problemId: problem.id,
      languageCode: language.code,
      sourceCode: input.sourceCode,
      stdin: input.stdin,
      testCases,
      mode: "sample",
    });

    return sampleRun;
  }),

  create: protectedProcedure.input(codeInputSchema).mutation(async ({ ctx, input }) => {
    const submissionId = await enqueueSubmission({
      userId: ctx.user.id,
      problemId: input.problemId,
      languageCode: input.languageCode,
      sourceCode: input.sourceCode,
      stdin: input.stdin,
    });
    return { submissionId };
  }),

  resubmit: protectedProcedure.input(submissionIdSchema).mutation(async ({ ctx, input }) => {
    const previous = await prisma.submission.findFirst({
      where: {
        id: input.submissionId,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        problemId: true,
        languageCode: true,
        metadata: true,
      },
    });
    if (!previous) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Submission no longer exists" });
    }
    if (previous.userId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot resubmit another user’s code" });
    }
    const metadata = (previous.metadata ?? {}) as Record<string, unknown>;
    const sourceCode =
      typeof metadata.sourceCode === "string" ? (metadata.sourceCode as string) : null;
    if (!sourceCode) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Original source code is unavailable for this submission",
      });
    }
    const stdin = typeof metadata.stdin === "string" ? (metadata.stdin as string) : undefined;
    const submissionId = await enqueueSubmission({
      userId: ctx.user.id,
      problemId: previous.problemId,
      languageCode: previous.languageCode,
      sourceCode,
      stdin,
    });
    return { submissionId };
  }),

  get: protectedProcedure.input(submissionIdSchema).query(async ({ ctx, input }) => {
    const payload = await getSubmissionDetailForViewer(input.submissionId, {
      id: ctx.user.id,
      role: ctx.user.role,
    });
    if (!payload) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
    }
    return payload;
  }),

  getShare: publicProcedure.input(publicShareSchema).query(async ({ input }) => {
    const payload = await getSubmissionDetailForShare(input.publicId);
    if (!payload) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Share link is invalid or expired" });
    }
    return payload;
  }),

  listMine: protectedProcedure.input(submissionListInput).query(async ({ ctx, input }) => {
    const response = await buildSubmissionList({
      userId: ctx.user.id,
      input,
    });
    return response;
  }),

  listByProblem: protectedProcedure.input(problemHistoryInput).query(async ({ ctx, input }) => {
    const problem = await prisma.problem.findFirst({
      where: {
        slug: input.slug,
        deletedAt: null,
        state: "PUBLISHED",
        visibility: "PUBLIC",
      },
      select: {
        id: true,
        slug: true,
        difficulty: { select: { name: true } },
        currentVersion: { select: { title: true } },
      },
    });
    if (!problem) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Problem not found" });
    }
    const { slug: _slug, ...rest } = input;
    const response = await buildSubmissionList({
      userId: ctx.user.id,
      input: { ...rest, problemId: problem.id },
    });
    const stats = await prisma.submission.aggregate({
      where: {
        userId: ctx.user.id,
        deletedAt: null,
        problemId: problem.id,
      },
      _count: { _all: true },
    });

    return {
      ...response,
      context: {
        problem: {
          id: problem.id,
          slug: problem.slug,
          title: problem.currentVersion?.title ?? problem.slug,
          difficulty: problem.difficulty?.name ?? null,
        },
        attempts: stats._count._all,
      },
    };
  }),

  filters: protectedProcedure.query(async ({ ctx }) => {
    const metadata = await buildFilterMetadata(ctx.user.id);
    return metadata;
  }),

  shareEnable: protectedProcedure.input(submissionIdSchema).mutation(async ({ ctx, input }) => {
    const submission = await prisma.submission.findFirst({
      where: { id: input.submissionId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        contest: {
          select: { startsAt: true, endsAt: true },
        },
      },
    });
    if (!submission) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
    }
    if (submission.userId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot share another user’s code" });
    }
    ensureContestShareAllowed(submission.contest);
    const publicId = nanoid(32);
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        isShareEnabled: true,
        sharePublicId: publicId,
        shareEnabledAt: new Date(),
        shareRevokedAt: null,
      },
    });
    return { publicId };
  }),

  shareDisable: protectedProcedure.input(submissionIdSchema).mutation(async ({ ctx, input }) => {
    const submission = await prisma.submission.findFirst({
      where: { id: input.submissionId, deletedAt: null },
      select: { id: true, userId: true },
    });
    if (!submission) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
    }
    if (submission.userId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify another user’s submission" });
    }
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        isShareEnabled: false,
        shareRevokedAt: new Date(),
        sharePublicId: null,
      },
    });
    return { ok: true };
  }),

  hideFromProfile: protectedProcedure.input(hideVisibilitySchema).mutation(async ({ ctx, input }) => {
    const submission = await prisma.submission.findFirst({
      where: { id: input.submissionId, deletedAt: null },
      select: { id: true, userId: true },
    });
    if (!submission) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
    }
    if (submission.userId !== ctx.user.id && !isStaffRole(ctx.user.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }
    await prisma.submission.update({
      where: { id: submission.id },
      data: { hiddenFromProfile: input.hidden },
    });
    return { ok: true };
  }),

  saveDraft: protectedProcedure.input(draftSaveSchema).mutation(async ({ ctx, input }) => {
    await getRunnableProblem(input.problemId);
    await ensureLanguage(input.languageCode);
    const draft = await prisma.submissionDraft.create({
      data: {
        userId: ctx.user.id,
        problemId: input.problemId,
        languageCode: input.languageCode,
        sourceCode: input.sourceCode,
        cursorOffset: input.cursorOffset,
        savedVia: input.savedVia,
        sourceHash: hashSourceCode(input.sourceCode),
      },
    });

    await pruneDrafts(ctx.user.id, input.problemId, input.languageCode);

    return draft;
  }),

  getDrafts: protectedProcedure.input(draftGetSchema).query(async ({ ctx, input }) => {
    const drafts = await prisma.submissionDraft.findMany({
      where: {
        userId: ctx.user.id,
        problemId: input.problemId,
        languageCode: input.languageCode,
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    return drafts;
  }),
});

type RunnableProblem = {
  id: string;
  slug: string;
  currentVersionId: string;
  judgeMode: "AUTO" | "MANUAL" | "HYBRID";
  currentVersion: {
    id: string;
    samples: Prisma.JsonValue | null;
    testCases: Array<{ ordinal: number; kind: TestCaseKind }>;
  };
};

async function getRunnableProblem(problemId: string): Promise<RunnableProblem> {
  const problem = await prisma.problem.findFirst({
    where: {
      id: problemId,
      state: "PUBLISHED",
      visibility: "PUBLIC",
      deletedAt: null,
    },
    select: {
      id: true,
      slug: true,
      judgeMode: true,
      currentVersionId: true,
      currentVersion: {
        select: {
          id: true,
          samples: true,
          testCases: {
            select: {
              ordinal: true,
              kind: true,
            },
            orderBy: { ordinal: "asc" },
          },
        },
      },
    },
  });

  if (!problem || !problem.currentVersionId || !problem.currentVersion) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Problem is not available for submissions",
    });
  }

  return problem as RunnableProblem;
}

async function ensureLanguage(languageCode: string) {
  const language = await prisma.language.findFirst({
    where: { code: languageCode, isEnabled: true, deletedAt: null },
    select: { code: true, displayName: true },
  });
  if (!language) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported language" });
  }
  return language;
}

async function pruneDrafts(userId: string, problemId: string, languageCode: string) {
  const drafts = await prisma.submissionDraft.findMany({
    where: { userId, problemId, languageCode },
    orderBy: { createdAt: "desc" },
    skip: 3,
    take: 10,
    select: { id: true },
  });
  if (drafts.length === 0) return;
  await prisma.submissionDraft.deleteMany({
    where: { id: { in: drafts.map((draft) => draft.id) } },
  });
}

async function enqueueSubmission(params: {
  userId: string;
  problemId: string;
  languageCode: string;
  sourceCode: string;
  stdin?: string;
}) {
  const [problem, language] = await Promise.all([
    getRunnableProblem(params.problemId),
    ensureLanguage(params.languageCode),
  ]);

  const requiresManualReview = problem.judgeMode !== "AUTO";
  const manualOnly = problem.judgeMode === "MANUAL";
  const codeHash = hashSourceCode(params.sourceCode);
  const submission = await prisma.submission.create({
    data: {
      userId: params.userId,
      problemId: problem.id,
      problemVersionId: problem.currentVersionId,
      languageCode: language.code,
      status: manualOnly ? SubmissionStatus.MANUAL_PENDING : SubmissionStatus.QUEUED,
      verdictCode: manualOnly ? "MANUAL_PENDING" : null,
      requiresManualReview,
      sourceCodeRef: `inline://submissions/${params.userId}/${Date.now()}`,
      codeHash,
      metadata: {
        sourceCode: params.sourceCode,
        stdin: params.stdin ?? "",
        language: language.displayName,
      },
      createdById: params.userId,
      updatedById: params.userId,
    },
    select: {
      id: true,
      problemId: true,
      problemVersionId: true,
      languageCode: true,
      userId: true,
    },
  });

  recordSubmissionEvent({
    event: "enqueued",
    language: submission.languageCode,
    manual: requiresManualReview,
  });

  if (manualOnly) {
    await publishManualReviewMessage({
      submissionId: submission.id,
      problemId: submission.problemId,
      userId: submission.userId,
      reason: "MANUAL_ONLY",
    });
  } else {
    await dispatchSubmissionToJudge({
      submissionId: submission.id,
      problemId: submission.problemId,
      problemVersionId: submission.problemVersionId!,
      languageCode: submission.languageCode,
      requiresManualReview,
      manualOnly: false,
      userId: submission.userId,
    });
  }

  return submission.id;
}

type SubmissionListQueryInput = z.infer<typeof submissionListInput>;

async function buildSubmissionList({
  userId,
  input,
}: {
  userId: string;
  input: SubmissionListQueryInput;
}) {
  const where = buildListWhere(userId, input);
  const orderBy = buildOrderBy(input.sort);
  const take = input.limit + 1;

  const submissions = await prisma.submission.findMany({
    where,
    orderBy,
    take,
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : undefined,
    include: {
      problem: {
        select: {
          id: true,
          slug: true,
          difficulty: { select: { name: true } },
          currentVersion: { select: { title: true } },
        },
      },
      language: { select: { code: true, displayName: true } },
      contest: { select: { id: true, slug: true, name: true } },
    },
  });

  let nextCursor: string | undefined;
  if (submissions.length > input.limit) {
    const next = submissions.pop();
    nextCursor = next?.id;
  }

  const problemIds = Array.from(new Set(submissions.map((submission) => submission.problemId)));
  const earliestMap = await getEarliestAcceptedMap(userId, problemIds);
  const items: SubmissionListEntry[] = submissions.map((submission) =>
    mapSubmissionToListEntry(submission, earliestMap),
  );
  const entries: SubmissionHistoryEntry[] = items.map(
    (item): SubmissionHistoryEntry => ({
      id: item.id,
      createdAt: item.createdAt,
      verdictCode: item.verdictCode,
      status: item.status,
      runtimeMs: item.runtimeMs,
      languageCode: item.languageCode,
    }),
  );

  const summary = !input.cursor ? await buildSubmissionSummary(userId) : null;

  return {
    items,
    entries,
    nextCursor,
    summary,
  };
}

function buildListWhere(
  userId: string,
  input: SubmissionListQueryInput,
): Prisma.SubmissionWhereInput {
  const where: Prisma.SubmissionWhereInput = {
    userId,
    deletedAt: null,
  };

  if (input.problemId) {
    where.problemId = input.problemId;
  }
  if (input.problemSlug) {
    where.problem = { slug: input.problemSlug };
  }

  if (input.languages?.length) {
    where.languageCode = { in: input.languages };
  }

  let verdictFilter: string[] | null = input.verdicts?.length ? input.verdicts : null;
  if (input.sort === "first_ac") {
    verdictFilter = ACCEPTED_VERDICTS;
  }
  if (verdictFilter?.length) {
    where.verdictCode = { in: verdictFilter };
  }

  if (input.statuses?.length) {
    where.status = { in: input.statuses };
  }

  if (input.contest === "contest") {
    where.contestId = { not: null };
  } else if (input.contest === "practice") {
    where.contestId = null;
  }

  if (input.from || input.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (input.from) {
      createdAt.gte = input.from;
    }
    if (input.to) {
      createdAt.lte = input.to;
    }
    where.createdAt = createdAt;
  }

  if (input.sort === "fastest") {
    where.timeUsedMs = { not: null };
  }
  if (input.sort === "memory") {
    where.memoryUsedKb = { not: null };
  }

  return where;
}

function buildOrderBy(sort: (typeof SUBMISSION_LIST_SORTS)[number]) {
  if (sort === "fastest") {
    return [
      { timeUsedMs: "asc" as Prisma.SortOrder },
      { createdAt: "asc" as Prisma.SortOrder },
      { id: "asc" as Prisma.SortOrder },
    ];
  }
  if (sort === "memory") {
    return [
      { memoryUsedKb: "asc" as Prisma.SortOrder },
      { createdAt: "asc" as Prisma.SortOrder },
      { id: "asc" as Prisma.SortOrder },
    ];
  }
  if (sort === "first_ac") {
    return [
      { createdAt: "asc" as Prisma.SortOrder },
      { id: "asc" as Prisma.SortOrder },
    ];
  }
  return [
    { createdAt: "desc" as Prisma.SortOrder },
    { id: "desc" as Prisma.SortOrder },
  ];
}

async function getEarliestAcceptedMap(userId: string, problemIds: string[]) {
  if (problemIds.length === 0) {
    return new Map<string, number>();
  }
  const rows = await prisma.submission.groupBy({
    by: ["problemId"],
    where: {
      userId,
      deletedAt: null,
      verdictCode: { in: ACCEPTED_VERDICTS },
      problemId: { in: problemIds },
    },
    _min: { createdAt: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row._min.createdAt) {
      map.set(row.problemId, row._min.createdAt.getTime());
    }
  }
  return map;
}

type SubmissionListRecord = Prisma.SubmissionGetPayload<{
  include: {
    problem: {
      select: {
        id: true;
        slug: true;
        difficulty: { select: { name: true } };
        currentVersion: { select: { title: true } };
      };
    };
    language: { select: { code: true; displayName: true } };
    contest: { select: { id: true; slug: true; name: true } };
  };
}>;

function mapSubmissionToListEntry(
  submission: SubmissionListRecord,
  earliestMap: Map<string, number>,
): SubmissionListEntry {
  const createdAt = submission.createdAt;
  const earliest = earliestMap.get(submission.problemId);
  const verdict = (submission.verdictCode as SubmissionListEntry["verdictCode"]) ?? null;
  const firstAccepted =
    Boolean(verdict && ACCEPTED_VERDICTS.includes(verdict)) &&
    Boolean(earliest && createdAt.getTime() === earliest);

  return {
    id: submission.id,
    createdAt,
    verdictCode: verdict,
    status: submission.status as SubmissionHistoryEntry["status"],
    runtimeMs: submission.timeUsedMs,
    memoryKb: submission.memoryUsedKb,
    languageCode: submission.languageCode,
    languageDisplayName: submission.language?.displayName ?? submission.languageCode,
    problemId: submission.problemId,
    problem: {
      id: submission.problem?.id ?? submission.problemId,
      slug: submission.problem?.slug ?? "",
      title: submission.problem?.currentVersion?.title ?? submission.problem?.slug ?? "",
      difficulty: submission.problem?.difficulty?.name ?? null,
    },
    contest: submission.contest
      ? {
          id: submission.contest.id,
          slug: submission.contest.slug,
          name: submission.contest.name,
        }
      : null,
    firstAccepted,
    codeHash: submission.codeHash,
  };
}

async function buildSubmissionSummary(userId: string): Promise<SubmissionListSummary> {
  const baseWhere: Prisma.SubmissionWhereInput = {
    userId,
    deletedAt: null,
  };
  const [totalAttempts, acceptedAttempts, solvedProblems, manualPending, extremes] =
    await prisma.$transaction([
      prisma.submission.count({ where: baseWhere }),
      prisma.submission.count({
        where: {
          ...baseWhere,
          verdictCode: { in: ACCEPTED_VERDICTS },
        },
      }),
      prisma.submission.groupBy({
        where: {
          ...baseWhere,
          verdictCode: { in: ACCEPTED_VERDICTS },
        },
        by: ["problemId"],
        orderBy: {
          problemId: "asc",
        },
        _min: { createdAt: true },
      }),
      prisma.submission.count({
        where: {
          ...baseWhere,
          status: SubmissionStatus.MANUAL_PENDING,
        },
      }),
      prisma.submission.aggregate({
        where: baseWhere,
        _min: { createdAt: true, timeUsedMs: true, memoryUsedKb: true },
        _max: { createdAt: true },
      }),
    ]);

  return {
    totalAttempts,
    acceptedAttempts,
    solvedProblems: solvedProblems.length,
    manualPending,
    lastSubmissionAt: extremes._max.createdAt ?? null,
    fastestRuntimeMs: extremes._min.timeUsedMs ?? null,
    bestMemoryKb: extremes._min.memoryUsedKb ?? null,
  };
}

async function buildFilterMetadata(userId: string): Promise<SubmissionFilterMetadata> {
  const [languageGroups, problems, range] = await prisma.$transaction([
    prisma.submission.groupBy({
      where: { userId, deletedAt: null },
      by: ["languageCode"],
      orderBy: {
        languageCode: "asc",
      },
      _count: { _all: true },
    }),
    prisma.problem.findMany({
      where: {
        submissions: { some: { userId, deletedAt: null } },
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        currentVersion: { select: { title: true } },
      },
      take: 50,
      orderBy: { slug: "asc" },
    }),
    prisma.submission.aggregate({
      where: { userId, deletedAt: null },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
  ]);

  const languageMeta = await prisma.language.findMany({
    where: { code: { in: languageGroups.map((group) => group.languageCode) } },
    select: { code: true, displayName: true },
  });
  const languageMap = new Map(languageMeta.map((entry) => [entry.code, entry.displayName]));

  return {
    languages: languageGroups.map((group) => {
      const count =
        typeof group._count === "object" && group._count
          ? group._count._all ?? 0
          : 0;
      return {
        code: group.languageCode,
        displayName: languageMap.get(group.languageCode) ?? group.languageCode,
        usageCount: count,
      };
    }),
    problems: problems.map((problem) => ({
      id: problem.id,
      slug: problem.slug,
      title: problem.currentVersion?.title ?? problem.slug,
    })),
    range: {
      firstSubmissionAt: range._min.createdAt ?? null,
      lastSubmissionAt: range._max.createdAt ?? null,
    },
  };
}

function ensureContestShareAllowed(
  contest: { startsAt: Date; endsAt: Date } | null,
) {
  if (!contest) {
    return;
  }
  const now = new Date();
  if (contest.startsAt <= now && contest.endsAt > now) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Share links are disabled until the contest ends",
    });
  }
}
