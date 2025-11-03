import { DEFAULT_PAGINATION_LIMIT } from "@/lib/constants";
import {
  DIFFICULTIES,
  PROBLEM_SORT_OPTIONS,
  PROBLEM_STATUS_FILTERS,
} from "@/lib/problems/constants";
import { prisma } from "@/lib/prisma";
import { publicProcedure, router } from "@/lib/trpc/trpc";
import { Prisma, SubmissionStatus, TestCaseKind } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const problemFiltersInput = z.object({
  q: z.string().default(""),
  difficulty: z.array(z.enum(DIFFICULTIES)).default([]),
  status: z.array(z.enum(PROBLEM_STATUS_FILTERS)).default([]),
  tags: z.array(z.string()).default([]),
  onlyWithEditorial: z.boolean().default(false),
  sort: z.enum(PROBLEM_SORT_OPTIONS).default("newest"),
  page: z.number().int().min(1).default(1),
});

const problemDetailInput = z.object({
  slug: z.string().min(1),
});

export type ProblemListItem = {
  id: string;
  slug: string;
  title: string;
  version: number | null;
  difficulty: string | null;
  acceptanceRate: number | null;
  submissionCount: number;
  tags: Array<{ slug: string; name: string }>;
  status: (typeof PROBLEM_STATUS_FILTERS)[number];
  hasEditorial: boolean;
  createdAt: Date;
  lastSubmissionAt: Date | null;
};

export type ProblemListResponse = {
  filters: ProblemFiltersInput;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  items: ProblemListItem[];
};

export type ProblemDetailPayload = {
  id: string;
  slug: string;
  title: string;
  difficulty: string | null;
  status: (typeof PROBLEM_STATUS_FILTERS)[number];
  lastSubmissionAt: Date | null;
  tags: Array<{ slug: string; name: string }>;
  author: {
    handle: string | null;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  stats: {
    acceptanceRate: number | null;
    submissionCount: number;
    acceptedCount: number;
  } | null;
  hasEditorial: boolean;
  version: {
    number: number;
  };
  content: {
    statement: string;
    constraints: string;
    hints: string | null;
    samples: Sample[];
    editorial: string | null;
    sampleTestCases: Array<{
      ordinal: number;
      input: string;
      output: string;
      points: number | null;
      kind: "SAMPLE" | "HIDDEN";
    }>;
  };
  relatedProblems: Array<{
    slug: string;
    title: string;
    difficulty: string | null;
    tags: Array<{ slug: string; name: string }>;
  }>;
  createdAt: Date;
};

export type ProblemFilterMetadata = {
  difficulties: (typeof DIFFICULTIES)[number][];
  statuses: typeof PROBLEM_STATUS_FILTERS;
  tags: Array<{ slug: string; name: string; problemCount: number }>;
};

export type ProblemSample = Sample;

const DIFFICULTY_DEFAULTS: ProblemFiltersInput["difficulty"] = ["EASY", "MEDIUM", "HARD"];

const DEFAULT_PAGE_SIZE = DEFAULT_PAGINATION_LIMIT;

const PUBLIC_PROBLEM_WHERE: Prisma.ProblemWhereInput = {
  state: "PUBLISHED",
  visibility: "PUBLIC",
  deletedAt: null,
};

function buildProblemWhere(input: ProblemFiltersInput): Prisma.ProblemWhereInput {
  const andFilters: Prisma.ProblemWhereInput[] = [];
  const searchTerm = input.q.trim();

  if (searchTerm) {
    andFilters.push({
      OR: [
        {
          slug: {
            contains: searchTerm,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          currentVersion: {
            title: {
              contains: searchTerm,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        },
        {
          tags: {
            some: {
              tag: {
                name: {
                  contains: searchTerm,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          },
        },
      ],
    });
  }

  if (input.difficulty.length > 0) {
    andFilters.push({
      difficulty: {
        code: {
          in: input.difficulty,
        },
      },
    });
  }

  if (input.tags.length > 0) {
    andFilters.push({
      tags: {
        some: {
          tag: {
            slug: {
              in: input.tags,
            },
          },
        },
      },
    });
  }

  if (input.onlyWithEditorial) {
    andFilters.push({
      currentVersion: {
        editorial: {
          not: null,
        },
      },
    });
  }

  return andFilters.length > 0
    ? { ...PUBLIC_PROBLEM_WHERE, AND: andFilters }
    : PUBLIC_PROBLEM_WHERE;
}

function buildSortOrder(sort: ProblemFiltersInput["sort"], searchTerm: string) {
  const orderBy: Prisma.ProblemOrderByWithRelationInput[] = [];

  if (sort === "difficulty") {
    orderBy.push({ difficulty: { weight: "asc" } }, { createdAt: "desc" });
    return orderBy;
  }

  if (sort === "difficulty_desc") {
    orderBy.push({ difficulty: { weight: "desc" } }, { createdAt: "desc" });
    return orderBy;
  }

  if (sort === "relevance" && searchTerm) {
    orderBy.push({ createdAt: "desc" });
    return orderBy;
  }

  orderBy.push({ createdAt: "desc" });
  return orderBy;
}

async function getUserProblemStatus(userId: string) {
  const [solvedRows, attemptedRows, lastSubmissionRows] = await Promise.all([
    prisma.submission.findMany({
      where: {
        userId,
        deletedAt: null,
        status: SubmissionStatus.COMPLETED,
        verdictCode: "AC",
      },
      distinct: ["problemId"],
      select: { problemId: true },
    }),
    prisma.submission.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      distinct: ["problemId"],
      select: { problemId: true },
    }),
    prisma.submission.groupBy({
      where: {
        userId,
        deletedAt: null,
      },
      by: ["problemId"],
      _max: { createdAt: true },
    }),
  ]);

  const solved = new Set(solvedRows.map((row) => row.problemId));
  const attempted = new Set(
    attemptedRows.map((row) => row.problemId).filter((problemId) => !solved.has(problemId)),
  );

  const lastSubmission = new Map<string, Date>();
  lastSubmissionRows.forEach((row) => {
    if (row._max?.createdAt) {
      lastSubmission.set(row.problemId, row._max.createdAt);
    }
  });

  return {
    solved,
    attempted,
    lastSubmission,
  };
}

function applyStatusFilter(
  statuses: ProblemFiltersInput["status"],
  userStatus: Awaited<ReturnType<typeof getUserProblemStatus>> | null,
): Prisma.ProblemWhereInput | null {
  if (statuses.length === 0) {
    return null;
  }

  if (!userStatus) {
    return { id: { in: [] } };
  }

  const clauses: Prisma.ProblemWhereInput[] = [];
  const seen = new Set([...userStatus.solved, ...userStatus.attempted]);

  if (statuses.includes("SOLVED") && userStatus.solved.size > 0) {
    clauses.push({ id: { in: Array.from(userStatus.solved) } });
  }

  if (statuses.includes("ATTEMPTED") && userStatus.attempted.size > 0) {
    clauses.push({ id: { in: Array.from(userStatus.attempted) } });
  }

  if (statuses.includes("UNSEEN")) {
    clauses.push({ id: { notIn: Array.from(seen) } });
  }

  if (clauses.length === 0) {
    return { id: { in: [] } };
  }

  return { OR: clauses };
}

function inferProblemStatus(
  problemId: string,
  userStatus: Awaited<ReturnType<typeof getUserProblemStatus>> | null,
): (typeof PROBLEM_STATUS_FILTERS)[number] {
  if (!userStatus) {
    return "UNSEEN";
  }
  if (userStatus.solved.has(problemId)) {
    return "SOLVED";
  }
  if (userStatus.attempted.has(problemId)) {
    return "ATTEMPTED";
  }
  return "UNSEEN";
}

type Sample = { input: string; output: string; explanation?: string };

function parseSamples(samples: Prisma.JsonValue | null | undefined): Sample[] {
  if (!samples || !Array.isArray(samples)) {
    return [];
  }

  return samples
    .map((raw) => {
      if (typeof raw !== "object" || raw === null) return null;
      const value = raw as Record<string, unknown>;
      const input = typeof value.input === "string" ? (value.input as string) : "";
      const output = typeof value.output === "string" ? (value.output as string) : "";
      const explanation =
        typeof value.explanation === "string" ? (value.explanation as string) : undefined;
      if (!input && !output) return null;
      return { input, output, explanation };
    })
    .filter(Boolean) as Sample[];
}

export const problemsRouter = router({
  list: publicProcedure.input(problemFiltersInput).query(async ({ ctx, input }) => {
    const baseWhere = buildProblemWhere(input);
    const page = Math.max(input.page, 1);
    const skip = (page - 1) * DEFAULT_PAGE_SIZE;
    const searchTerm = input.q.trim();

    const userStatus = ctx.user ? await getUserProblemStatus(ctx.user.id) : null;
    const statusWhere = applyStatusFilter(input.status, userStatus);
    const where = statusWhere ? { AND: [baseWhere, statusWhere] } : baseWhere;

    if (!ctx.user && input.status.length > 0) {
      return {
        filters: input,
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        pageCount: 0,
        items: [],
      };
    }

    const orderBy = buildSortOrder(input.sort, searchTerm);

    const [total, rows] = await prisma.$transaction([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        orderBy,
        skip,
        take: DEFAULT_PAGE_SIZE,
        include: {
          difficulty: { select: { code: true } },
          stats: { select: { acceptanceRate: true, submissionCount: true, acceptedCount: true } },
          tags: {
            select: {
              tagId: true,
              tag: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          },
          currentVersion: {
            select: {
              title: true,
              versionNumber: true,
              editorial: true,
            },
          },
        },
      }),
    ]);

    const items: ProblemListItem[] = rows.map((problem) => {
      const problemStatus = inferProblemStatus(problem.id, userStatus);
      const lastSubmissionAt = userStatus?.lastSubmission.get(problem.id) ?? null;
      const hasEditorial = Boolean(problem.currentVersion?.editorial);

      return {
        id: problem.id,
        slug: problem.slug,
        title: problem.currentVersion?.title ?? problem.slug,
        version: problem.currentVersion?.versionNumber ?? null,
        difficulty: problem.difficulty?.code ?? null,
        acceptanceRate: problem.stats?.acceptanceRate ?? null,
        submissionCount: problem.stats?.submissionCount ?? 0,
        tags: problem.tags.map(({ tag }) => ({
          slug: tag.slug,
          name: tag.name,
        })),
        status: problemStatus,
        hasEditorial,
        createdAt: problem.createdAt,
        lastSubmissionAt,
      };
    });

    const response: ProblemListResponse = {
      filters: input,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      total,
      pageCount: Math.ceil(total / DEFAULT_PAGE_SIZE),
      items,
    };
    return response;
  }),
  detail: publicProcedure.input(problemDetailInput).query(async ({ ctx, input }) => {
    const problem = await prisma.problem.findFirst({
      where: {
        ...PUBLIC_PROBLEM_WHERE,
        slug: input.slug,
      },
      include: {
        difficulty: { select: { code: true, weight: true } },
        stats: { select: { acceptanceRate: true, submissionCount: true, acceptedCount: true } },
        tags: {
          select: {
            tagId: true,
            tag: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
        },
        author: {
          select: {
            handle: true,
            name: true,
            avatarUrl: true,
          },
        },
        currentVersion: {
          include: {
            testCases: {
              where: { kind: TestCaseKind.SAMPLE },
              orderBy: { ordinal: "asc" },
              select: {
                ordinal: true,
                inputBlobRef: true,
                outputBlobRef: true,
                points: true,
                kind: true,
              },
            },
          },
        },
      },
    });

    if (!problem || !problem.currentVersion) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Problem not found" });
    }

    const userStatus = ctx.user ? await getUserProblemStatus(ctx.user.id) : null;
    const status = inferProblemStatus(problem.id, userStatus);
    const lastSubmissionAt = userStatus?.lastSubmission.get(problem.id) ?? null;

    const samplesFromVersion = parseSamples(problem.currentVersion.samples);

    const tagIds = problem.tags
      .map((entry) => entry.tagId)
      .filter((id): id is string => typeof id === "string");

    const relatedWhere: Prisma.ProblemWhereInput = {
      ...PUBLIC_PROBLEM_WHERE,
      id: { not: problem.id },
    };

    if (tagIds.length > 0) {
      relatedWhere.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    } else if (problem.difficultyId) {
      relatedWhere.difficultyId = problem.difficultyId;
    }

    const related = await prisma.problem.findMany({
      where: relatedWhere,
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      include: {
        difficulty: { select: { code: true } },
        currentVersion: { select: { title: true } },
        tags: {
          select: {
            tag: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const relatedProblems = related.map((item) => ({
      slug: item.slug,
      title: item.currentVersion?.title ?? item.slug,
      difficulty: item.difficulty?.code ?? null,
      tags: item.tags.map(({ tag }) => ({ slug: tag.slug, name: tag.name })),
    }));

    let sampleCursor = 0;
    const sampleTestCasesForDisplay = problem.currentVersion.testCases
      .filter((test) => test.kind === TestCaseKind.SAMPLE)
      .map((test) => {
        const sampleOverride = samplesFromVersion[sampleCursor];
        const input = sampleOverride?.input ?? test.inputBlobRef ?? "";
        const output = sampleOverride?.output ?? test.outputBlobRef ?? "";
        sampleCursor += 1;
        return {
          ordinal: test.ordinal,
          input,
          output,
          points: test.points,
          kind: test.kind,
        };
      });

    const payload: ProblemDetailPayload = {
      id: problem.id,
      slug: problem.slug,
      title: problem.currentVersion.title,
      difficulty: problem.difficulty?.code ?? null,
      status,
      lastSubmissionAt,
      tags: problem.tags.map(({ tag }) => ({ slug: tag.slug, name: tag.name })),
      author: problem.author,
      stats: problem.stats
        ? {
            acceptanceRate: problem.stats.acceptanceRate,
            submissionCount: problem.stats.submissionCount,
            acceptedCount: problem.stats.acceptedCount,
          }
        : null,
      hasEditorial: Boolean(problem.currentVersion.editorial),
      version: {
        number: problem.currentVersion.versionNumber,
      },
      content: {
        statement: problem.currentVersion.statement,
        constraints: problem.currentVersion.constraints,
        hints: problem.currentVersion.hints,
        samples:
          samplesFromVersion.length > 0
            ? samplesFromVersion
            : problem.currentVersion.testCases.map((test) => ({
                input: test.inputBlobRef,
                output: test.outputBlobRef,
                explanation: test.points ? `${test.points} pts` : undefined,
              })),
        editorial: problem.currentVersion.editorial,
        sampleTestCases: sampleTestCasesForDisplay,
      },
      relatedProblems,
      createdAt: problem.createdAt,
    };
    return payload;
  }),
  filterMetadata: publicProcedure.query(async () => {
    const [difficultyRows, tagRows] = await Promise.all([
      prisma.difficulty.findMany({
        where: { deletedAt: null },
        orderBy: { weight: "asc" },
        select: { code: true },
      }),
      prisma.tag.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: {
          slug: true,
          name: true,
          stats: {
            select: {
              problemCount: true,
            },
          },
        },
      }),
    ]);

    const difficulties =
      difficultyRows.length > 0
        ? (difficultyRows.map((row) => row.code) as ProblemFiltersInput["difficulty"])
        : DIFFICULTY_DEFAULTS;

    const tags = tagRows.map((tag) => ({
      slug: tag.slug,
      name: tag.name,
      problemCount: tag.stats?.problemCount ?? 0,
    }));

    const payload: ProblemFilterMetadata = {
      difficulties,
      statuses: PROBLEM_STATUS_FILTERS,
      tags,
    };
    return payload;
  }),
});

export type ProblemFiltersInput = z.infer<typeof problemFiltersInput>;
