import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import { z } from "zod";
import { ProblemState, ProblemVisibility } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

const listProblemsInput = z.object({
  query: z.string().max(80).optional(),
  state: z.array(z.nativeEnum(ProblemState)).optional(),
  visibility: z.array(z.nativeEnum(ProblemVisibility)).optional(),
  limit: z.number().int().min(5).max(100).default(25),
});

export const adminProblemsRouter = router({
  list: adminProcedure.input(listProblemsInput).query(async ({ input }) => {
    const where = {
      deletedAt: null,
      state: input.state && input.state.length > 0 ? { in: input.state } : undefined,
      visibility:
        input.visibility && input.visibility.length > 0 ? { in: input.visibility } : undefined,
      ...(input.query
        ? {
            OR: [
              { slug: { contains: input.query, mode: "insensitive" as Prisma.QueryMode } },
              {
                currentVersion: {
                  title: { contains: input.query, mode: "insensitive" as Prisma.QueryMode },
                },
              },
            ],
          }
        : {}),
    };
    const problems = await prisma.problem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: input.limit,
      select: {
        id: true,
        slug: true,
        state: true,
        visibility: true,
        difficulty: { select: { code: true, name: true } },
        updatedAt: true,
        stats: {
          select: {
            submissionCount: true,
            acceptedCount: true,
          },
        },
        currentVersion: {
          select: {
            title: true,
            versionNumber: true,
          },
        },
        author: {
          select: { id: true, handle: true },
        },
      },
    });
    return problems.map((problem) => ({
      id: problem.id,
      slug: problem.slug,
      state: problem.state,
      visibility: problem.visibility,
      updatedAt: problem.updatedAt,
      stats: problem.stats,
      difficulty: problem.difficulty,
      currentVersion: problem.currentVersion,
    }));
  }),

  updateState: adminProcedure
    .input(
      z.object({
        problemId: z.string().cuid(),
        state: z.nativeEnum(ProblemState),
      }),
    )
    .mutation(async ({ input }) => {
      const updated = await prisma.problem.update({
        where: { id: input.problemId },
        data: { state: input.state },
        select: { id: true, state: true },
      });
      return updated;
    }),

  updateVisibility: adminProcedure
    .input(
      z.object({
        problemId: z.string().cuid(),
        visibility: z.nativeEnum(ProblemVisibility),
      }),
    )
    .mutation(async ({ input }) => {
      const problem = await prisma.problem.update({
        where: { id: input.problemId },
        data: { visibility: input.visibility },
        select: { id: true, visibility: true },
      });
      return problem;
    }),

  get: adminProcedure.input(z.object({ problemId: z.string().cuid() })).query(async ({ input }) => {
    const problem = await prisma.problem.findUnique({
      where: { id: input.problemId },
      include: {
        currentVersion: {
          select: {
            versionNumber: true,
            title: true,
            statement: true,
            constraints: true,
          },
        },
        tags: {
          select: { tag: { select: { name: true } } },
        },
        stats: true,
      },
    });
    if (!problem) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Problem not found" });
    }
    return problem;
  }),
});
