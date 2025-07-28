import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type HealthCheck = {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
};

export async function databaseHealthCheck(): Promise<HealthCheck> {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      healthy: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    logError(error, { component: "health-check", dependency: "database" });
    return {
      healthy: false,
      error: "Database connection failed",
    };
  }
}

export async function runCoreChecks(): Promise<Record<string, HealthCheck>> {
  return {
    database: await databaseHealthCheck(),
  };
}
