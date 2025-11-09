import { healthRouter } from "@/lib/trpc/router/health";
import { problemsRouter } from "@/lib/trpc/router/problems";
import { authRouter } from "@/lib/trpc/router/auth";
import { proposalsRouter } from "@/lib/trpc/router/proposals";
import { staffRouter } from "@/lib/trpc/router/staff";
import { router } from "@/lib/trpc/trpc";

export const appRouter = router({
  health: healthRouter,
  problems: problemsRouter,
  auth: authRouter,
  proposals: proposalsRouter,
  staff: staffRouter,
});

export type AppRouter = typeof appRouter;
