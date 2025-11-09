import { healthRouter } from "@/lib/trpc/router/health";
import { problemsRouter } from "@/lib/trpc/router/problems";
import { authRouter } from "@/lib/trpc/router/auth";
import { proposalsRouter } from "@/lib/trpc/router/proposals";
import { staffRouter } from "@/lib/trpc/router/staff";
import { router } from "@/lib/trpc/trpc";
import { submissionsRouter } from "@/lib/trpc/router/submissions";
import { profileRouter } from "@/lib/trpc/router/profile";
import { leaderboardRouter } from "@/lib/trpc/router/leaderboard";
import { discussionsRouter } from "@/lib/trpc/router/discussions";
import { editorialsRouter } from "@/lib/trpc/router/editorials";
import { trailsRouter } from "@/lib/trpc/router/trails";
import { contestsRouter } from "@/lib/trpc/router/contests";

export const appRouter = router({
  health: healthRouter,
  problems: problemsRouter,
  auth: authRouter,
  proposals: proposalsRouter,
  staff: staffRouter,
  submissions: submissionsRouter,
  profile: profileRouter,
  leaderboard: leaderboardRouter,
  discussions: discussionsRouter,
  editorials: editorialsRouter,
  trails: trailsRouter,
  contests: contestsRouter,
});

export type AppRouter = typeof appRouter;
