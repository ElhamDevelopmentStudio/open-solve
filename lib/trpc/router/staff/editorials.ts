import { router, staffProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { saveEditorialSchedule, publishEditorialNow } from "@/lib/editorials/service";

export const staffEditorialsRouter = router({
  save: staffProcedure
    .input(
      z.object({
        problemId: z.string().cuid(),
        content: z.string().min(20),
        releaseStrategy: z.enum(["ON_PUBLISH", "OFFSET_DAYS", "AFTER_CONTEST", "MANUAL"]),
        releaseAt: z.coerce.date().optional(),
        offsetDays: z.number().int().min(0).max(60).optional(),
        contestId: z.string().cuid().optional(),
        publishNow: z.boolean().optional(),
      }),
    )
    .mutation(({ input }) =>
      saveEditorialSchedule({
        problemId: input.problemId,
        content: input.content,
        releaseStrategy: input.releaseStrategy,
        releaseAt: input.releaseAt ?? null,
        offsetDays: input.offsetDays,
        contestId: input.contestId,
        publishNow: input.publishNow,
      }),
    ),
  publishNow: staffProcedure
    .input(z.object({ problemId: z.string().cuid() }))
    .mutation(({ input }) => publishEditorialNow(input.problemId)),
});
