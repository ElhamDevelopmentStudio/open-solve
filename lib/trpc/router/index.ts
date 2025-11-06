import { healthRouter } from "@/lib/trpc/router/health";
import { problemsRouter } from "@/lib/trpc/router/problems";
import { authRouter } from "@/lib/trpc/router/auth";
import { router } from "@/lib/trpc/trpc";

export const appRouter = router({
  health: healthRouter,
  problems: problemsRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
