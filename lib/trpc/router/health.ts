import { env } from "@/lib/env";
import { runCoreChecks } from "@/lib/health";
import { publicProcedure, router } from "@/lib/trpc/trpc";

export const healthRouter = router({
  status: publicProcedure.query(async ({ ctx }) => {
    const checks = await runCoreChecks();
    const healthy = Object.values(checks).every((check) => check.healthy);

    return {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.SENTRY_ENVIRONMENT,
      requestId: ctx.requestId,
      rateLimit: {
        windowSeconds: env.RATE_LIMIT_WINDOW_SECONDS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      },
      checks,
    };
  }),
  readiness: publicProcedure.query(async ({ ctx }) => {
    const checks = await runCoreChecks();
    const healthy = Object.values(checks).every((check) => check.healthy);

    return {
      status: healthy ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      environment: env.SENTRY_ENVIRONMENT,
      requestId: ctx.requestId,
      checks,
    };
  }),
});
