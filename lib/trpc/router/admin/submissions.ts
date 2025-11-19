import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import { dispatchSubmissionToJudge } from "@/lib/judge/dispatcher";
import { TRPCError } from "@trpc/server";
import { SubmissionStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const listSubmissionsInput = z.object({
  query: z.string().max(80).optional(),
  status: z.array(z.nativeEnum(SubmissionStatus)).optional(),
  limit: z.number().int().min(10).max(100).default(25),
});

export const adminSubmissionsRouter = router({
  list: adminProcedure.input(listSubmissionsInput).query(async ({ input }) => {
    const where = {
      ...(input.status && input.status.length > 0 ? { status: { in: input.status } } : {}),
      ...(input.query
        ? {
            OR: [
              { id: input.query },
              {
                user: {
                  is: {
                    handle: { contains: input.query, mode: "insensitive" as Prisma.QueryMode },
                  },
                },
              },
              {
                problem: {
                  is: {
                    slug: { contains: input.query, mode: "insensitive" as Prisma.QueryMode },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: input.limit,
      select: {
        id: true,
        status: true,
        verdictCode: true,
        createdAt: true,
        user: {
          select: { id: true, handle: true },
        },
        problem: {
          select: {
            slug: true,
            currentVersion: { select: { title: true } },
          },
        },
        language: { select: { displayName: true } },
        requiresManualReview: true,
        hiddenFromProfile: true,
      },
    });
    return submissions.map((submission) => ({
      id: submission.id,
      status: submission.status,
      verdictCode: submission.verdictCode,
      createdAt: submission.createdAt,
      user: submission.user,
      problem: submission.problem,
      language: submission.language,
      hiddenFromProfile: submission.hiddenFromProfile,
    }));
  }),

  rejudge: adminProcedure
    .input(
      z.object({
        submissionId: z.string().cuid(),
        reason: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const submission = await prisma.submission.findUnique({
        where: { id: input.submissionId },
        select: {
          id: true,
          problemId: true,
          problemVersionId: true,
          languageCode: true,
          userId: true,
          requiresManualReview: true,
        },
      });
      if (!submission || !submission.problemVersionId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }
      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: SubmissionStatus.QUEUED,
          verdictCode: null,
          startedAt: null,
          finishedAt: null,
          timeUsedMs: null,
          memoryUsedKb: null,
        },
      });
      await dispatchSubmissionToJudge({
        submissionId: submission.id,
        problemId: submission.problemId,
        problemVersionId: submission.problemVersionId,
        languageCode: submission.languageCode,
        requiresManualReview: submission.requiresManualReview,
        manualOnly: false,
        userId: submission.userId,
        trigger: "rejudge",
        reason: input.reason,
      });
      return { ok: true };
    }),

  toggleVisibility: adminProcedure
    .input(
      z.object({
        submissionId: z.string().cuid(),
        hiddenFromProfile: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const submission = await prisma.submission.update({
        where: { id: input.submissionId },
        data: { hiddenFromProfile: input.hiddenFromProfile },
        select: { id: true, hiddenFromProfile: true },
      });
      return submission;
    }),
  rejudgeScope: adminProcedure
    .input(
      z.object({
        userId: z.string().cuid().optional(),
        problemSlug: z.string().optional(),
        contestSlug: z.string().optional(),
        languageCode: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        reason: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!input.userId && !input.problemSlug && !input.contestSlug && !input.languageCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one constraint for batch rejudge",
        });
      }

      let problemId: string | undefined;
      if (input.problemSlug) {
        const problem = await prisma.problem.findUnique({
          where: { slug: input.problemSlug },
          select: { id: true },
        });
        if (!problem) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Problem not found" });
        }
        problemId = problem.id;
      }

      let contestId: string | undefined;
      if (input.contestSlug) {
        const contest = await prisma.contest.findUnique({
          where: { slug: input.contestSlug },
          select: { id: true },
        });
        if (!contest) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Contest not found" });
        }
        contestId = contest.id;
      }

      const submissions = await prisma.submission.findMany({
        where: {
          userId: input.userId,
          problemId,
          contestId,
          languageCode: input.languageCode,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          problemId: true,
          problemVersionId: true,
          languageCode: true,
          userId: true,
          requiresManualReview: true,
        },
      });

      for (const submission of submissions) {
        if (!submission.problemVersionId) continue;
        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: SubmissionStatus.QUEUED,
            verdictCode: null,
            startedAt: null,
            finishedAt: null,
            timeUsedMs: null,
            memoryUsedKb: null,
          },
        });
        await dispatchSubmissionToJudge({
          submissionId: submission.id,
          problemId: submission.problemId,
          problemVersionId: submission.problemVersionId,
          languageCode: submission.languageCode,
          requiresManualReview: submission.requiresManualReview,
          manualOnly: false,
          userId: submission.userId,
          trigger: "rejudge",
          reason: input.reason ?? "batch-rejudge",
        });
      }

      return { count: submissions.length };
    }),
});
