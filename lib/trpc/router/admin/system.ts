import { createAuditLog } from "@/lib/auth/audit";
import { env } from "@/lib/env";
import { getDeploymentMeta } from "@/lib/deployment";
import { runCoreChecks } from "@/lib/health";
import { inspectJudgeQueues } from "@/lib/judge/queue";
import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const maintenanceInput = z.object({
  enabled: z.boolean(),
  message: z.string().max(240).optional(),
  allowSubmissions: z.boolean(),
});

const submissionLimitsInput = z.object({
  perMinute: z.number().int().min(1).max(200),
  perHour: z.number().int().min(10).max(2000),
  contestMultiplier: z.number().int().min(1).max(10).default(2),
});

const parseSetting = <T>(value: Prisma.JsonValue | null | undefined, fallback: T): T => {
  if (!value || typeof value !== "object") {
    return fallback;
  }
  return value as T;
};

export const adminSystemRouter = router({
  overview: adminProcedure.query(async () => {
    const [
      maintenanceSetting,
      submissionLimitSetting,
      submissionStatusCounts,
      systemHealth,
      activeSessions,
      judgeQueues,
    ] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "maintenance_mode" } }),
      prisma.systemSetting.findUnique({ where: { key: "submission_limits" } }),
      prisma.submission.groupBy({
        by: ["status"],
        _count: true,
      }),
      runCoreChecks(),
      prisma.session.count(),
      inspectJudgeQueues(),
    ]);

    return {
      maintenance: parseSetting(maintenanceSetting?.value, {
        enabled: false,
        message: "",
        allowSubmissions: true,
      }),
      submissionLimits: parseSetting(submissionLimitSetting?.value, {
        perMinute: 25,
        perHour: 250,
        contestMultiplier: 2,
      }),
      submissionStatusCounts,
      judgeQueues:
        judgeQueues ??
        (["submissions", "rejudge", "manual"] as const).map((name) => ({
          name,
          messages: 0,
          consumers: 0,
        })),
      systemHealth,
      activeSessions,
      deployment: getDeploymentMeta(),
      environment: env.DEPLOYMENT_ENVIRONMENT,
    };
  }),

  updateMaintenance: adminProcedure.input(maintenanceInput).mutation(async ({ ctx, input }) => {
    await prisma.systemSetting.upsert({
      where: { key: "maintenance_mode" },
      update: {
        label: "Maintenance Mode",
        description: "Controls end-user read-only banner and gating.",
        value: input,
        updatedById: ctx.session?.impersonatorId ?? ctx.user?.id,
      },
      create: {
        key: "maintenance_mode",
        label: "Maintenance Mode",
        description: "Controls end-user read-only banner and gating.",
        value: input,
        createdById: ctx.session?.impersonatorId ?? ctx.user?.id,
        updatedById: ctx.session?.impersonatorId ?? ctx.user?.id,
      },
    });
    await createAuditLog({
      userId: ctx.session?.impersonatorId ?? ctx.user?.id,
      action: "SYSTEM_SETTING_UPDATED",
      metadata: {
        key: "maintenance_mode",
        value: input,
      },
    });
    return { ok: true };
  }),

  updateSubmissionLimits: adminProcedure
    .input(submissionLimitsInput)
    .mutation(async ({ ctx, input }) => {
      await prisma.systemSetting.upsert({
        where: { key: "submission_limits" },
        update: {
          label: "Submission Limits",
          description: "Safety valves for judge throughput.",
          value: input,
          updatedById: ctx.session?.impersonatorId ?? ctx.user?.id,
        },
        create: {
          key: "submission_limits",
          label: "Submission Limits",
          description: "Safety valves for judge throughput.",
          value: input,
          createdById: ctx.session?.impersonatorId ?? ctx.user?.id,
          updatedById: ctx.session?.impersonatorId ?? ctx.user?.id,
        },
      });
      await createAuditLog({
        userId: ctx.session?.impersonatorId ?? ctx.user?.id,
        action: "SYSTEM_SETTING_UPDATED",
        metadata: {
          key: "submission_limits",
          value: input,
        },
      });
      return { ok: true };
    }),
});
