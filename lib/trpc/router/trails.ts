import { router, publicProcedure, protectedProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import {
  getTrailGraph,
  addTrailInsight,
  voteTrailInsight,
  reportTrailInsight,
} from "@/lib/trails/service";
import type { UserRole } from "@prisma/client";

const categoryEnum = z.enum(["IDEA", "PATTERN", "DATA_STRUCTURE", "PITFALL"]);
const reportEnum = z.enum(["SPAM", "SPOILER", "MISLEADING"]);

const viewerFromCtx = (ctxUser?: { id: string; role: UserRole } | null) =>
  ctxUser ? { id: ctxUser.id, role: ctxUser.role } : null;

export const trailsRouter = router({
  getForProblem: publicProcedure
    .input(z.object({ slug: z.string().optional(), problemId: z.string().cuid().optional() }))
    .query(({ input, ctx }) => getTrailGraph({ problemId: input.problemId, slug: input.slug, viewer: viewerFromCtx(ctx.user) })),
  addInsight: protectedProcedure
    .input(
      z.object({
        problemId: z.string().cuid(),
        content: z.string().min(4).max(200),
        category: categoryEnum,
        connectFrom: z.array(z.string().cuid()).max(5).optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      addTrailInsight({
        problemId: input.problemId,
        authorId: ctx.user.id,
        content: input.content,
        category: input.category,
        connectFrom: input.connectFrom,
        authorStatus: ctx.user.status,
      }),
    ),
  vote: protectedProcedure
    .input(z.object({ insightId: z.string().cuid(), direction: z.enum(["UP", "DOWN"]) }))
    .mutation(({ input, ctx }) => voteTrailInsight({ insightId: input.insightId, userId: ctx.user.id, direction: input.direction })),
  report: protectedProcedure
    .input(z.object({ insightId: z.string().cuid(), reason: reportEnum, note: z.string().max(500).optional() }))
    .mutation(({ input, ctx }) => reportTrailInsight({ insightId: input.insightId, reason: input.reason, note: input.note, reporterId: ctx.user.id })),
});
