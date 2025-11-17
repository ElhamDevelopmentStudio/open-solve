import { moderatorProcedure, router } from "@/lib/trpc/trpc";
import { z } from "zod";
import {
  setTrailInsightHidden,
  resolveTrailReport,
  mergeTrailInsights,
} from "@/lib/trails/service";

export const staffTrailsRouter = router({
  hide: moderatorProcedure
    .input(z.object({ insightId: z.string().cuid(), hidden: z.boolean() }))
    .mutation(({ input }) => setTrailInsightHidden(input.insightId, input.hidden)),
  merge: moderatorProcedure
    .input(z.object({ sourceId: z.string().cuid(), targetId: z.string().cuid() }))
    .mutation(({ input, ctx }) => mergeTrailInsights({ sourceId: input.sourceId, targetId: input.targetId, moderatorId: ctx.user.id })),
  resolveReport: moderatorProcedure
    .input(z.object({ reportId: z.string().cuid(), status: z.enum(["OPEN", "VALID", "INVALID"]), note: z.string().max(500).optional() }))
    .mutation(({ input, ctx }) =>
      resolveTrailReport({ reportId: input.reportId, status: input.status, note: input.note, resolverId: ctx.user.id }),
    ),
});
