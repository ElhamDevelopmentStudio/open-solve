import { healthRouter } from "@/lib/trpc/router/health";
import { problemsRouter } from "@/lib/trpc/router/problems";
import { router } from "@/lib/trpc/trpc";

export const appRouter = router({
  health: healthRouter,
  problems: problemsRouter,
});

export type AppRouter = typeof appRouter;
