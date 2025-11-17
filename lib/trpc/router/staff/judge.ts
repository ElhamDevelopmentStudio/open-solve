import { prisma } from "@/lib/prisma";
import { moderatorProcedure, router } from "@/lib/trpc/trpc";
import { Prisma, SubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { dispatchSubmissionToJudge } from "@/lib/judge/dispatcher";
import { TRPCError } from "@trpc/server";
import type { JudgeSummary } from "@/lib/submissions/types";
import { notifySubmissionUpdate } from "@/lib/realtime/notifications";

export const staffJudgeRouter = router({
  manualQueue: moderatorProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(25),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const submissions = await prisma.submission.findMany({
        where: {
          status: SubmissionStatus.MANUAL_PENDING,
          deletedAt: null,
        },
        orderBy: { queuedAt: "asc" },
        take: input?.limit ?? 25,
        include: {
          user: { select: { id: true, handle: true, name: true, avatarUrl: true } },
          problem: {
            select: {
              slug: true,
              currentVersion: { select: { title: true } },
            },
          },
          language: { select: { code: true, displayName: true } },
        },
      });
      return submissions.map((submission) => {
        const metadata = (submission.metadata ?? {}) as Record<string, unknown>;
        return {
          id: submission.id,
          createdAt: submission.createdAt,
          user: submission.user,
          problem: {
            slug: submission.problem.slug,
            title: submission.problem.currentVersion?.title ?? submission.problem.slug,
          },
          language: submission.language,
          autoSummary: (metadata.autoSummary as JudgeSummary) ?? null,
          sourceCode: typeof metadata.sourceCode === "string" ? (metadata.sourceCode as string) : "",
        };
      });
    }),
  manualSetVerdict: moderatorProcedure
    .input(
      z.object({
        submissionId: z.string().cuid(),
        verdict: z.enum(["MANUAL_ACCEPTED", "MANUAL_REJECTED", "MANUAL_PARTIAL"]),
        notes: z.string().max(2000).optional(),
        score: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const submission = await prisma.submission.findUnique({
        where: { id: input.submissionId },
        select: {
          id: true,
          status: true,
          metadata: true,
        },
      });
      if (!submission || submission.status !== SubmissionStatus.MANUAL_PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Submission is not awaiting manual review",
        });
      }
      const metadata = (submission.metadata ?? {}) as Prisma.JsonObject;
      if (input.notes) {
        metadata.manualNotes = input.notes;
      }
      if (typeof input.score === "number") {
        metadata.manualScore = input.score;
      }
      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status:
            input.verdict === "MANUAL_ACCEPTED" || input.verdict === "MANUAL_PARTIAL"
              ? SubmissionStatus.SUCCEEDED
              : SubmissionStatus.FAILED,
          verdictCode: input.verdict,
          manualReviewerId: ctx.user.id,
          manualReviewedAt: new Date(),
          manualNotes: input.notes,
          manualScore: input.score,
          metadata,
          finishedAt: new Date(),
          requiresManualReview: false,
        },
      });
      await notifySubmissionUpdate(submission.id);
      return { ok: true };
    }),
  rejudge: moderatorProcedure
    .input(
      z.object({
        submissionId: z.string().cuid(),
        reason: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
      await notifySubmissionUpdate(submission.id);
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
});
