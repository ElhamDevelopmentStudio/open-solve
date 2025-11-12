import { prisma } from "@/lib/prisma";
import { getDefaultCodeStub } from "@/lib/problems/editor-presets";
import { generateUniqueProblemSlug } from "@/lib/problems/slugify";
import { staffProcedure, router } from "@/lib/trpc/trpc";
import {
  Prisma,
  ProblemJudgeMode,
  ProblemState,
  ProblemVisibility,
  TestCaseKind,
  type UserRole,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const baseProblemSelect = {
  id: true,
  slug: true,
  state: true,
  visibility: true,
  createdAt: true,
  updatedAt: true,
  authorId: true,
  difficulty: {
    select: { code: true, name: true },
  },
  author: {
    select: { id: true, name: true, handle: true },
  },
  stats: {
    select: { submissionCount: true, acceptedCount: true },
  },
};

const testCaseSchema = z.object({
  ordinal: z.number().int().min(1),
  input: z.string().max(10_000),
  output: z.string().max(10_000),
  timeLimitMs: z.number().int().min(100).max(10_000).default(2000),
  memoryLimitMb: z.number().int().min(32).max(2048).default(256),
  strength: z.number().int().min(0).max(2_000).nullable().optional(),
});

const buildProblemAccessWhere = (
  userId: string,
  role: UserRole,
): Prisma.ProblemWhereInput | undefined => {
  if (role === "ADMIN") {
    return undefined;
  }
  return {
    OR: [{ authorId: userId }, { curators: { some: { userId } } }],
  };
};

async function assertProblemAccess(problemId: string, userId: string, role: UserRole) {
  if (role === "ADMIN") {
    return;
  }
  const access = await prisma.problem.count({
    where: {
      id: problemId,
      ...buildProblemAccessWhere(userId, role),
    },
  });
  if (access === 0) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

async function assertCuratorManager(problemId: string, userId: string, role: UserRole) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    select: { id: true, authorId: true },
  });
  if (!problem) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (role !== "ADMIN" && problem.authorId !== userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the author or an admin can manage access.",
    });
  }
  return problem;
}

export const staffProblemsRouter = router({
  list: staffProcedure
    .input(
      z
        .object({
          state: z.nativeEnum(ProblemState).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const problems = await prisma.problem.findMany({
        where: {
          deletedAt: null,
          state: input?.state ?? undefined,
          ...(buildProblemAccessWhere(ctx.user.id, ctx.user.role) ?? {}),
        },
        orderBy: { updatedAt: "desc" },
        select: baseProblemSelect,
      });
      return problems;
    }),
  create: staffProcedure
    .input(
      z.object({
        title: z.string().min(8).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const slug = await generateUniqueProblemSlug(input.title, async (candidate) => {
        const count = await prisma.problem.count({ where: { slug: candidate } });
        return count > 0;
      });

      const problem = await prisma.$transaction(async (tx) => {
        const created = await tx.problem.create({
          data: {
            slug,
            state: ProblemState.DRAFT,
            visibility: ProblemVisibility.INTERNAL,
            authorId: ctx.user.id,
            createdById: ctx.user.id,
            updatedById: ctx.user.id,
            versions: {
              create: {
                versionNumber: 1,
                title: input.title,
                statement: "Describe the problem statement here.",
                constraints: "List the constraints.",
                hints: null,
                editorial: null,
                samples: [],
                createdById: ctx.user.id,
              },
            },
          },
          select: baseProblemSelect,
        });

        const enabledLanguages = await tx.language.findMany({
          where: { deletedAt: null, isEnabled: true },
          select: { code: true },
        });
        if (enabledLanguages.length > 0) {
          await tx.problemLanguage.createMany({
            data: enabledLanguages.map((language) => ({
              problemId: created.id,
              languageCode: language.code,
              codeStub: getDefaultCodeStub(language.code),
              createdById: ctx.user.id,
              updatedById: ctx.user.id,
            })),
          });
        }
        return created;
      });
      return problem;
    }),
  get: staffProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const problem = await prisma.problem.findFirst({
      where: {
        id: input.id,
        deletedAt: null,
        ...(buildProblemAccessWhere(ctx.user.id, ctx.user.role) ?? {}),
      },
      include: {
        author: {
          select: { id: true, name: true, handle: true, avatarUrl: true, role: true },
        },
        difficulty: true,
        tags: {
          select: {
            tag: true,
          },
        },
        versions: {
          where: { deletedAt: null },
          orderBy: { versionNumber: "desc" },
          include: {
            testCases: {
              where: { deletedAt: null },
              orderBy: { ordinal: "asc" },
            },
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: {
            reviewer: { select: { id: true, name: true, handle: true } },
          },
        },
        curators: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, handle: true, avatarUrl: true, role: true } },
          },
        },
        languages: {
          where: { deletedAt: null },
          orderBy: { language: { displayName: "asc" } },
          include: {
            language: {
              select: { code: true, displayName: true, fileExtension: true },
            },
          },
        },
      },
    });

    if (!problem) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const latestVersion = problem.versions[0];
    if (!latestVersion) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Problem is missing content" });
    }

    const samples = latestVersion.testCases
      .filter((test) => test.kind === TestCaseKind.SAMPLE)
      .map((test) => ({
        id: test.id,
        ordinal: test.ordinal,
        input: test.inputBlobRef,
        output: test.outputBlobRef,
        timeLimitMs: test.timeLimitMs,
        memoryLimitMb: test.memoryLimitMb,
        strength: test.strength,
      }));

    const hidden = latestVersion.testCases
      .filter((test) => test.kind === TestCaseKind.HIDDEN)
      .map((test) => ({
        id: test.id,
        ordinal: test.ordinal,
        input: test.inputBlobRef,
        output: test.outputBlobRef,
        timeLimitMs: test.timeLimitMs,
        memoryLimitMb: test.memoryLimitMb,
        strength: test.strength,
      }));

    const curatorRoster = [
      {
        id: problem.author.id,
        userId: problem.author.id,
        handle: problem.author.handle,
        name: problem.author.name,
        avatarUrl: problem.author.avatarUrl,
        role: problem.author.role,
        isOwner: true,
      },
      ...problem.curators
        .filter((entry) => entry.userId !== problem.authorId)
        .map((entry) => ({
          id: entry.id,
          userId: entry.userId,
          handle: entry.user.handle,
          name: entry.user.name,
          avatarUrl: entry.user.avatarUrl,
          role: entry.user.role,
          isOwner: false,
        })),
    ];

    return {
      id: problem.id,
      slug: problem.slug,
      state: problem.state,
      visibility: problem.visibility,
      judgeMode: problem.judgeMode,
      authorId: problem.authorId,
      difficulty: problem.difficulty?.code ?? null,
      tags: problem.tags.map((entry) => entry.tag),
      curators: curatorRoster,
      languages: problem.languages.map((entry) => ({
        id: entry.id,
        code: entry.languageCode,
        displayName: entry.language.displayName,
        codeStub: entry.codeStub ?? getDefaultCodeStub(entry.languageCode),
        fileExtension: entry.language.fileExtension,
      })),
      version: {
        id: latestVersion.id,
        versionNumber: latestVersion.versionNumber,
        title: latestVersion.title,
        statement: latestVersion.statement,
        constraints: latestVersion.constraints,
        hints: latestVersion.hints,
        editorial: latestVersion.editorial,
        samples: latestVersion.samples as unknown[],
      },
      tests: {
        samples,
        hidden,
      },
      reviews: problem.reviews,
    };
  }),
  saveContent: staffProcedure
    .input(
      z.object({
        problemId: z.string(),
        title: z.string().min(8).max(80),
        statement: z.string().min(50),
        constraints: z.string().min(10),
        hints: z.string().nullable().optional(),
        editorial: z.string().nullable().optional(),
        samples: z.array(
          z.object({
            input: z.string(),
            output: z.string(),
            explanation: z.string().optional().nullable(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      const version = await prisma.problemVersion.findFirst({
        where: { problemId: input.problemId },
        orderBy: { versionNumber: "desc" },
      });
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await prisma.problemVersion.update({
        where: { id: version.id },
        data: {
          title: input.title,
          statement: input.statement,
          constraints: input.constraints,
          hints: input.hints,
          editorial: input.editorial,
          samples: input.samples,
          updatedById: ctx.user.id,
        },
      });
      return true;
    }),
  saveMetadata: staffProcedure
    .input(
      z.object({
        problemId: z.string(),
        slug: z.string().min(3).max(80),
        visibility: z.nativeEnum(ProblemVisibility),
        difficultyCode: z.string().nullable(),
        tagSlugs: z.array(z.string()).min(1),
        judgeMode: z.nativeEnum(ProblemJudgeMode),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      const problem = await prisma.problem.findUnique({ where: { id: input.problemId } });
      if (!problem) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (problem.slug !== input.slug) {
        const slug = await generateUniqueProblemSlug(input.slug, async (candidate) => {
          const count = await prisma.problem.count({
            where: { slug: candidate, id: { not: problem.id } },
          });
          return count > 0;
        });
        problem.slug = slug;
      }

      const difficulty = input.difficultyCode
        ? await prisma.difficulty.findUnique({ where: { code: input.difficultyCode } })
        : null;
      if (input.difficultyCode && !difficulty) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown difficulty" });
      }

      const tags = await prisma.tag.findMany({
        where: { slug: { in: input.tagSlugs } },
      });
      if (tags.length !== input.tagSlugs.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown tag" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.problem.update({
          where: { id: problem.id },
          data: {
            slug: problem.slug,
            visibility: input.visibility,
            judgeMode: input.judgeMode,
            difficultyId: difficulty?.id,
            updatedById: ctx.user.id,
          },
        });
        await tx.problemTag.deleteMany({ where: { problemId: problem.id } });
        await tx.problemTag.createMany({
          data: tags.map((tag) => ({
            problemId: problem.id,
            tagId: tag.id,
            createdById: ctx.user.id,
            updatedById: ctx.user.id,
          })),
        });
      });
      return true;
    }),
  updateTests: staffProcedure
    .input(
      z.object({
        problemId: z.string(),
        samples: z.array(testCaseSchema),
        hidden: z.array(testCaseSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      const version = await prisma.problemVersion.findFirst({
        where: { problemId: input.problemId },
        orderBy: { versionNumber: "desc" },
      });
      if (!version) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.testCase.deleteMany({
          where: {
            problemVersionId: version.id,
          },
        });

        const createPayload = (cases: z.infer<typeof testCaseSchema>[], kind: TestCaseKind) =>
          cases.map((test) => ({
            problemVersionId: version.id,
            kind,
            ordinal: test.ordinal,
            inputBlobRef: test.input,
            outputBlobRef: test.output,
            timeLimitMs: test.timeLimitMs,
            memoryLimitMb: test.memoryLimitMb,
            strength: kind === TestCaseKind.SAMPLE ? 0 : Math.max(test.strength ?? 0, 0),
            createdById: ctx.user.id,
            updatedById: ctx.user.id,
          }));

        await tx.testCase.createMany({
          data: [
            ...createPayload(input.samples, TestCaseKind.SAMPLE),
            ...createPayload(input.hidden, TestCaseKind.HIDDEN),
          ],
        });
      });

      return true;
    }),
  updateLanguages: staffProcedure
    .input(
      z.object({
        problemId: z.string(),
        languages: z
          .array(
            z.object({
              code: z.string().min(2),
              codeStub: z.string().max(50_000).optional(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      const uniqueLanguages = Array.from(
        input.languages
          .reduce<Map<string, { code: string; codeStub?: string }>>((acc, lang) => {
            acc.set(lang.code, { code: lang.code, codeStub: lang.codeStub });
            return acc;
          }, new Map())
          .values(),
      );

      const validLanguages = await prisma.language.findMany({
        where: {
          code: { in: uniqueLanguages.map((lang) => lang.code) },
          deletedAt: null,
          isEnabled: true,
        },
        select: { code: true },
      });
      if (validLanguages.length !== uniqueLanguages.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown language in payload." });
      }

      await prisma.problemLanguage.deleteMany({ where: { problemId: input.problemId } });
      await prisma.problemLanguage.createMany({
        data: uniqueLanguages.map((lang) => ({
          problemId: input.problemId,
          languageCode: lang.code,
          codeStub:
            lang.codeStub === undefined || lang.codeStub === null
              ? getDefaultCodeStub(lang.code)
              : lang.codeStub,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
        })),
      });
      return true;
    }),
  addCurator: staffProcedure
    .input(
      z.object({
        problemId: z.string(),
        handle: z.string().min(2).max(40),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const problem = await assertCuratorManager(input.problemId, ctx.user.id, ctx.user.role);
      const user = await prisma.user.findUnique({
        where: { handle: input.handle },
        select: { id: true, role: true },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }
      if (user.id === problem.authorId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Author already has access." });
      }
      if (user.role !== "PROBLEM_CURATOR" && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only problem curators or admins can be added.",
        });
      }
      await prisma.problemCurator.upsert({
        where: {
          problemId_userId: {
            problemId: input.problemId,
            userId: user.id,
          },
        },
        update: {
          updatedById: ctx.user.id,
        },
        create: {
          problemId: input.problemId,
          userId: user.id,
          createdById: ctx.user.id,
          updatedById: ctx.user.id,
        },
      });
      return true;
    }),
  removeCurator: staffProcedure
    .input(
      z.object({
        problemId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const problem = await assertCuratorManager(input.problemId, ctx.user.id, ctx.user.role);
      if (input.userId === problem.authorId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove the author." });
      }
      const result = await prisma.problemCurator.deleteMany({
        where: { problemId: input.problemId, userId: input.userId },
      });
      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Curator assignment not found." });
      }
      return true;
    }),
  languagesCatalog: staffProcedure.query(async () => {
    const languages = await prisma.language.findMany({
      where: { deletedAt: null, isEnabled: true },
      orderBy: { displayName: "asc" },
      select: { code: true, displayName: true, fileExtension: true },
    });
    return languages;
  }),
  submitForReview: staffProcedure
    .input(z.object({ problemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      const problem = await prisma.problem.findUnique({ where: { id: input.problemId } });
      if (!problem) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await prisma.problem.update({
        where: { id: problem.id },
        data: { state: ProblemState.REVIEW, updatedById: ctx.user.id },
      });
      return true;
    }),
  requestChanges: staffProcedure
    .input(z.object({ problemId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      await prisma.problem.update({
        where: { id: input.problemId },
        data: { state: ProblemState.DRAFT, updatedById: ctx.user.id },
      });
      if (input.notes) {
        await prisma.problemReview.create({
          data: {
            problemId: input.problemId,
            reviewerId: ctx.user.id,
            decision: "CHANGES_REQUESTED",
            notes: input.notes,
          },
        });
      }
      return true;
    }),
  approve: staffProcedure
    .input(
      z.object({
        problemId: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      const problem = await prisma.problem.findUnique({ where: { id: input.problemId } });
      if (!problem) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (problem.authorId === ctx.user.id && ctx.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Another curator must approve your problem.",
        });
      }

      await prisma.problemReview.create({
        data: {
          problemId: problem.id,
          reviewerId: ctx.user.id,
          decision: "APPROVED",
          notes: input.notes,
        },
      });

      return true;
    }),
  publish: staffProcedure
    .input(
      z.object({
        problemId: z.string(),
        visibility: z.nativeEnum(ProblemVisibility).default(ProblemVisibility.PUBLIC),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      const problem = await prisma.problem.findUnique({
        where: { id: input.problemId },
        include: {
          reviews: {
            orderBy: { createdAt: "desc" },
          },
          versions: {
            orderBy: { versionNumber: "desc" },
          },
        },
      });
      if (!problem) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const approval = problem.reviews.find((review) => review.decision === "APPROVED");
      if (!approval) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "At least one approval is required.",
        });
      }
      if (approval.reviewerId === problem.authorId && ctx.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Approval must come from another curator.",
        });
      }
      const latestVersion = problem.versions[0];
      if (!latestVersion) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      await prisma.problem.update({
        where: { id: problem.id },
        data: {
          state: ProblemState.PUBLISHED,
          visibility: input.visibility,
          currentVersionId: latestVersion.id,
          updatedById: ctx.user.id,
        },
      });
      return true;
    }),
  archive: staffProcedure
    .input(z.object({ problemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertProblemAccess(input.problemId, ctx.user.id, ctx.user.role);
      await prisma.problem.update({
        where: { id: input.problemId },
        data: { state: ProblemState.ARCHIVED, updatedById: ctx.user.id },
      });
      return true;
    }),
});
