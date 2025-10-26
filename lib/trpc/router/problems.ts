import { z } from "zod";
import { DIFFICULTIES, SUBMISSION_STATUSES } from "@/lib/problems/constants";
import { DEFAULT_PAGINATION_LIMIT } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { router, publicProcedure } from "@/lib/trpc/trpc";

const problemFiltersInput = z.object({
  q: z.string().default(""),
  difficulty: z.array(z.enum(DIFFICULTIES)).default([]),
  status: z.array(z.enum(SUBMISSION_STATUSES)).default([]),
  tags: z.array(z.string()).default([]),
  page: z.number().int().min(1).default(1),
});

const DEFAULT_PAGE_SIZE = DEFAULT_PAGINATION_LIMIT;

const baseProblemWhere: Prisma.ProblemWhereInput = {
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

  return andFilters.length > 0 ? { ...baseProblemWhere, AND: andFilters } : baseProblemWhere;
}

export const problemsRouter = router({
  list: publicProcedure.input(problemFiltersInput).query(async ({ input }) => {
    const where = buildProblemWhere(input);
    const page = Math.max(input.page, 1);
    const skip = (page - 1) * DEFAULT_PAGE_SIZE;

    const [total, rows] = await prisma.$transaction([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: DEFAULT_PAGE_SIZE,
        include: {
          difficulty: { select: { code: true } },
          stats: { select: { acceptanceRate: true, submissionCount: true, acceptedCount: true } },
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
          currentVersion: {
            select: {
              title: true,
              versionNumber: true,
            },
          },
        },
      }),
    ]);

    const items = rows.map((problem) => ({
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
      createdAt: problem.createdAt,
    }));

    return {
      filters: input,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      total,
      pageCount: Math.ceil(total / DEFAULT_PAGE_SIZE),
      items,
    };
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
        ? (difficultyRows.map((row) => row.code) as (typeof DIFFICULTIES)[number][])
        : DIFFICULTIES;

    const tags = tagRows.map((tag) => ({
      slug: tag.slug,
      name: tag.name,
      problemCount: tag.stats?.problemCount ?? 0,
    }));

    return {
      difficulties,
      statuses: SUBMISSION_STATUSES,
      tags,
    };
  }),
});

export type ProblemFiltersInput = z.infer<typeof problemFiltersInput>;
