import { z } from "zod";
import { DIFFICULTIES, SUBMISSION_STATUSES } from "@/lib/problems/constants";
import { router, publicProcedure } from "@/lib/trpc/trpc";

const problemFiltersInput = z.object({
  q: z.string().default(""),
  difficulty: z.array(z.enum(DIFFICULTIES)).default([]),
  status: z.array(z.enum(SUBMISSION_STATUSES)).default([]),
  tags: z.array(z.string()).default([]),
  page: z.number().int().min(1).default(1),
});

export const problemsRouter = router({
  list: publicProcedure
    .input(problemFiltersInput)
    .query(async ({ input }) => {
      // TODO: Replace with actual Prisma query once problem records exist.
      return {
        filters: input,
        total: 0,
        items: [],
      };
    }),
  filterMetadata: publicProcedure.query(async () => {
    return {
      difficulties: DIFFICULTIES,
      statuses: SUBMISSION_STATUSES,
      tags: [],
    };
  }),
});

export type ProblemFiltersInput = z.infer<typeof problemFiltersInput>;
