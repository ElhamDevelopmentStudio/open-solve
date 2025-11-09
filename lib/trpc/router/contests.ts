import { router, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import {
  getContestDetail,
  getContestOverview,
  getContestStandings,
  listContestClarifications,
  registerForContest,
  submitContestClarification,
  unregisterFromContest,
} from "@/lib/contests/service";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { ClarificationStatus } from "@prisma/client";

const standingsInput = z.object({
  slug: z.string().optional(),
  contestId: z.string().optional(),
  cursor: z.string().nullable().optional(),
  limit: z.number().int().min(5).max(100).optional(),
});

export const contestsRouter = router({
  overview: protectedProcedure.query(({ ctx }) => getContestOverview(ctx.user.id)),
  detail: protectedProcedure.input(z.object({ slug: z.string() })).query(({ ctx, input }) =>
    getContestDetail({ slug: input.slug, viewerId: ctx.user.id, viewerRole: ctx.user.role }),
  ),
  standings: protectedProcedure.input(standingsInput).query(async ({ ctx, input }) => {
    let contestId = input.contestId ?? null;
    if (!contestId) {
      if (!input.slug) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contest identifier required" });
      }
      const contest = await prisma.contest.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (!contest) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      contestId = contest.id;
    }
    return getContestStandings({
      contestId,
      viewerId: ctx.user.id,
      cursor: input.cursor,
      limit: input.limit,
      viewerRole: ctx.user.role,
    });
  }),
  register: protectedProcedure
    .input(
      z.object({
        contestId: z.string(),
        asVirtual: z.boolean().optional(),
        accessCode: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      registerForContest({
        contestId: input.contestId,
        userId: ctx.user.id,
        asVirtual: input.asVirtual,
        accessCode: input.accessCode,
      }),
    ),
  unregister: protectedProcedure
    .input(z.object({ contestId: z.string() }))
    .mutation(({ ctx, input }) => unregisterFromContest(input.contestId, ctx.user.id)),
  clarifications: protectedProcedure
    .input(
      z.object({
        contestId: z.string(),
        status: z.nativeEnum(ClarificationStatus).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      listContestClarifications({
        contestId: input.contestId,
        viewerRole: ctx.user.role,
        viewerId: ctx.user.id,
        status: input.status,
      }),
    ),
  submitClarification: protectedProcedure
    .input(
      z.object({
        contestId: z.string(),
        problemId: z.string().optional(),
        question: z.string().min(8).max(1200),
      }),
    )
    .mutation(({ ctx, input }) =>
      submitContestClarification({
        contestId: input.contestId,
        userId: ctx.user.id,
        question: input.question,
        problemId: input.problemId,
      }),
    ),
});
