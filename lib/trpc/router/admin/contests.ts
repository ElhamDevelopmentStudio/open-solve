import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import { ContestState, ContestVisibility } from "@prisma/client";
import { z } from "zod";
import { dispatchSubmissionToJudge } from "@/lib/judge/dispatcher";

const listContestsInput = z
  .object({
    state: z.array(z.nativeEnum(ContestState)).optional(),
    limit: z.number().int().min(5).max(100).default(25),
  })
  .optional();

export const adminContestsRouter = router({
  list: adminProcedure.input(listContestsInput).query(async ({ input }) => {
    const contests = await prisma.contest.findMany({
      where: {
        deletedAt: null,
        ...(input?.state && input.state.length > 0 ? { state: { in: input.state } } : {}),
      },
      orderBy: [{ startsAt: "desc" }],
      take: input?.limit ?? 25,
      include: {
        _count: { select: { problems: true, registrations: true } },
      },
    });
    return contests;
  }),
  startNow: adminProcedure.input(z.object({ contestId: z.string().cuid() })).mutation(({ input }) =>
    prisma.contest.update({
      where: { id: input.contestId },
      data: {
        state: "RUNNING",
        startsAt: new Date(),
      },
    }),
  ),
  endNow: adminProcedure.input(z.object({ contestId: z.string().cuid() })).mutation(({ input }) =>
    prisma.contest.update({
      where: { id: input.contestId },
      data: {
        state: "FINISHED",
        endsAt: new Date(),
      },
    }),
  ),
  setFreeze: adminProcedure
    .input(
      z.object({
        contestId: z.string().cuid(),
        freeze: z.boolean(),
      }),
    )
    .mutation(({ input }) =>
      prisma.contest.update({
        where: { id: input.contestId },
        data: {
          freezeAt: input.freeze ? new Date() : null,
        },
      }),
    ),
  toggleVisibility: adminProcedure
    .input(
      z.object({
        contestId: z.string().cuid(),
        visibility: z.nativeEnum(ContestVisibility),
      }),
    )
    .mutation(({ input }) =>
      prisma.contest.update({
        where: { id: input.contestId },
        data: { visibility: input.visibility },
      }),
    ),
  dqParticipant: adminProcedure
    .input(
      z.object({
        registrationId: z.string().cuid(),
        reason: z.string().max(200).optional(),
      }),
    )
    .mutation(({ input }) =>
      prisma.contestRegistration.update({
        where: { id: input.registrationId },
        data: {
          isDisqualified: true,
          dqReason: input.reason,
          disqualifiedAt: new Date(),
        },
      }),
    ),
  rejudgeContest: adminProcedure
    .input(
      z.object({
        contestId: z.string().cuid(),
        limit: z.number().int().min(1).max(500).default(200),
        reason: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const submissions = await prisma.submission.findMany({
        where: { contestId: input.contestId },
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
        if (!submission.problemVersionId) {
          continue;
        }
        await prisma.submission.update({
          where: { id: submission.id },
          data: {
            status: "QUEUED",
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
          reason: input.reason ?? "contest-rejudge",
        });
      }
      return { count: submissions.length };
    }),
});
