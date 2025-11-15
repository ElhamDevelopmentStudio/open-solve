import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import type { Prisma } from "@prisma/client";
import { runCoreChecks } from "@/lib/health";
import { subDays } from "date-fns";

type MaintenanceSetting = {
  enabled: boolean;
  message?: string;
  allowSubmissions?: boolean;
};

type SubmissionLimitSetting = {
  perMinute: number;
  perHour: number;
  contestMultiplier?: number;
};

const maintenanceDefaults: MaintenanceSetting = {
  enabled: false,
  message: "",
  allowSubmissions: true,
};

const submissionLimitDefaults: SubmissionLimitSetting = {
  perMinute: 25,
  perHour: 250,
  contestMultiplier: 2,
};

const parseJsonSetting = <T,>(value: Prisma.JsonValue | null | undefined, fallback: T): T => {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  return value as T;
};

export const adminDashboardRouter = router({
  overview: adminProcedure.query(async () => {
    const now = new Date();
    const dayAgo = subDays(now, 1);
    const [
      totalUsers,
      usersLastDay,
      usersByRole,
      usersByStatus,
      totalProblems,
      problemsByState,
      submissionsLastDay,
      acceptedLastDay,
      queuedCount,
      runningCount,
      manualCount,
      incidents,
      auditLogs,
      featureFlagsTotal,
      featureFlagsEnabled,
      maintenanceSetting,
      submissionLimitSetting,
      activeSessions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: dayAgo } },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      prisma.user.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.problem.count({ where: { deletedAt: null } }),
      prisma.problem.groupBy({
        by: ["state"],
        where: { deletedAt: null },
        _count: true,
      }),
      prisma.submission.count({
        where: { createdAt: { gte: dayAgo } },
      }),
      prisma.submission.count({
        where: { createdAt: { gte: dayAgo }, verdictCode: "AC" },
      }),
      prisma.submission.count({ where: { status: "QUEUED" } }),
      prisma.submission.count({ where: { status: "RUNNING" } }),
      prisma.submission.count({ where: { status: "MANUAL_PENDING" } }),
      prisma.incident.findMany({
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          summary: true,
          status: true,
          severity: true,
          impact: true,
          startedAt: true,
          resolvedAt: true,
          timeline: true,
        },
      }),
      prisma.authAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: { select: { id: true, handle: true, email: true } },
        },
      }),
      prisma.featureFlag.count(),
      prisma.featureFlag.count({ where: { enabled: true } }),
      prisma.systemSetting.findUnique({ where: { key: "maintenance_mode" } }),
      prisma.systemSetting.findUnique({ where: { key: "submission_limits" } }),
      prisma.session.count({
        where: {
          expires: { gt: now },
        },
      }),
    ]);

    const maintenance = parseJsonSetting<MaintenanceSetting>(
      maintenanceSetting?.value,
      maintenanceDefaults,
    );
    const submissionLimits = parseJsonSetting<SubmissionLimitSetting>(
      submissionLimitSetting?.value,
      submissionLimitDefaults,
    );
    const systemHealth = await runCoreChecks();

    return {
      users: {
        total: totalUsers,
        newLast24h: usersLastDay,
        byRole: usersByRole.reduce<Record<string, number>>((acc, group) => {
          acc[group.role] = group._count;
          return acc;
        }, {}),
        byStatus: usersByStatus.reduce<Record<string, number>>((acc, group) => {
          acc[group.status] = group._count;
          return acc;
        }, {}),
      },
      problems: {
        total: totalProblems,
        byState: problemsByState.reduce<Record<string, number>>((acc, group) => {
          acc[group.state] = group._count;
          return acc;
        }, {}),
      },
      submissions: {
        last24h: submissionsLastDay,
        acceptedLast24h: acceptedLastDay,
        acceptanceRateLast24h:
          submissionsLastDay > 0 ? acceptedLastDay / submissionsLastDay : 0,
        queued: queuedCount,
        running: runningCount,
        manualPending: manualCount,
      },
      featureFlags: {
        total: featureFlagsTotal,
        enabled: featureFlagsEnabled,
      },
      maintenance,
      submissionLimits,
      systemHealth,
      activeSessions,
      incidents,
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        user: log.user,
      })),
    };
  }),
});
