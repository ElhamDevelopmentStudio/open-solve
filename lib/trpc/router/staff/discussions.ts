import { moderatorProcedure, router } from "@/lib/trpc/trpc";
import { z } from "zod";
import {
  updateDiscussionState,
  setThreadLock,
  resolveDiscussionReportAction,
  shadowBanUser,
} from "@/lib/discussions/service";

export const staffDiscussionsRouter = router({
  hide: moderatorProcedure
    .input(z.object({ discussionId: z.string().cuid() }))
    .mutation(({ input }) => updateDiscussionState({ discussionId: input.discussionId, state: "HIDDEN" })),
  unhide: moderatorProcedure
    .input(z.object({ discussionId: z.string().cuid() }))
    .mutation(({ input }) => updateDiscussionState({ discussionId: input.discussionId, state: "VISIBLE" })),
  lockThread: moderatorProcedure
    .input(z.object({ threadId: z.string().cuid(), locked: z.boolean() }))
    .mutation(({ input, ctx }) => setThreadLock({ threadId: input.threadId, locked: input.locked, moderatorId: ctx.user.id })),
  shadowBan: moderatorProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .mutation(({ input }) => shadowBanUser(input.userId)),
  resolveReport: moderatorProcedure
    .input(
      z.object({
        reportId: z.string().cuid(),
        status: z.enum(["OPEN", "VALID", "INVALID"]),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(({ input, ctx }) =>
      resolveDiscussionReportAction({
        reportId: input.reportId,
        status: input.status,
        note: input.note,
        resolverId: ctx.user.id,
      }),
    ),
});
