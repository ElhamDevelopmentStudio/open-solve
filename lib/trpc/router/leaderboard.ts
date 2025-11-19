import { router, publicProcedure } from "@/lib/trpc/trpc";
import { z } from "zod";
import {
  LEADERBOARD_WINDOWS,
  getLeaderboardOverview,
  getSnapshotLeaderboard,
  getDifficultyLeaderboard,
  getTagLeaderboard,
} from "@/lib/leaderboard/service";
import { DIFFICULTIES } from "@/lib/problems/constants";

const leaderboardWindowEnum = z.enum(LEADERBOARD_WINDOWS);
const difficultyEnum = z.enum(DIFFICULTIES);

const paginationSchema = z.object({
  cursor: z.number().int().min(1).optional(),
  limit: z.number().int().min(5).max(100).optional(),
});

export const leaderboardRouter = router({
  overview: publicProcedure.query(({ ctx }) =>
    getLeaderboardOverview({ role: ctx.user?.role ?? null }),
  ),
  global: publicProcedure
    .input(
      z
        .object({
          window: leaderboardWindowEnum,
        })
        .merge(paginationSchema),
    )
    .query(({ input, ctx }) =>
      getSnapshotLeaderboard({
        window: input.window,
        cursor: input.cursor,
        limit: input.limit,
        viewer: { id: ctx.user?.id, role: ctx.user?.role ?? null },
      }),
    ),
  difficulty: publicProcedure
    .input(
      z
        .object({
          difficulty: difficultyEnum,
          window: leaderboardWindowEnum,
        })
        .merge(paginationSchema),
    )
    .query(({ input, ctx }) =>
      getDifficultyLeaderboard({
        difficulty: input.difficulty,
        window: input.window,
        cursor: input.cursor,
        limit: input.limit,
        viewer: { id: ctx.user?.id, role: ctx.user?.role ?? null },
      }),
    ),
  tag: publicProcedure
    .input(
      z
        .object({
          slug: z.string().min(1),
          window: leaderboardWindowEnum,
        })
        .merge(paginationSchema),
    )
    .query(({ input, ctx }) =>
      getTagLeaderboard({
        slug: input.slug,
        window: input.window,
        cursor: input.cursor,
        limit: input.limit,
        viewer: { id: ctx.user?.id, role: ctx.user?.role ?? null },
      }),
    ),
});
