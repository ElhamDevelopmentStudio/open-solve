import { router, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import { getEditorialByProblem } from "@/lib/editorials/service";

export const editorialsRouter = router({
  getByProblem: publicProcedure
    .input(z.object({ slug: z.string().optional(), problemId: z.string().cuid().optional() }))
    .query(({ input, ctx }) =>
      getEditorialByProblem({
        problemId: input.problemId,
        slug: input.slug,
        viewer: ctx.user ? { id: ctx.user.id, role: ctx.user.role } : null,
      }),
    ),
});
