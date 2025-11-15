import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import { createAuditLog } from "@/lib/auth/audit";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";

const flagPayload = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9._-]+$/, "Use lowercase letters, numbers, dots, underscores, or hyphens"),
  name: z.string().min(3).max(80),
  description: z.string().max(240).optional(),
  enabled: z.boolean().default(false),
  rolloutPercentage: z.number().int().min(0).max(100).default(0),
  targeting: z.record(z.any()).optional(),
});

export const adminFeatureFlagsRouter = router({
  list: adminProcedure.query(async () => {
    return prisma.featureFlag.findMany({
      orderBy: { name: "asc" },
    });
  }),

  create: adminProcedure.input(flagPayload).mutation(async ({ ctx, input }) => {
    const existing = await prisma.featureFlag.findUnique({
      where: { key: input.key },
    });
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Flag key already exists" });
    }
    const flag = await prisma.featureFlag.create({
      data: {
        ...input,
        targeting: (input.targeting ?? null) as Prisma.InputJsonValue,
        createdById: ctx.session?.impersonatorId ?? ctx.user?.id,
        updatedById: ctx.session?.impersonatorId ?? ctx.user?.id,
      },
    });
    await createAuditLog({
      userId: ctx.session?.impersonatorId ?? ctx.user?.id,
      action: "FEATURE_FLAG_CREATED",
      metadata: {
        key: flag.key,
        enabled: flag.enabled,
      },
    });
    return flag;
  }),

  update: adminProcedure
    .input(
      flagPayload.extend({
        id: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const flag = await prisma.featureFlag.update({
        where: { id },
        data: {
          ...data,
          targeting: (data.targeting ?? null) as Prisma.InputJsonValue,
          updatedById: ctx.session?.impersonatorId ?? ctx.user?.id,
        },
      });
      await createAuditLog({
        userId: ctx.session?.impersonatorId ?? ctx.user?.id,
        action: "FEATURE_FLAG_UPDATED",
        metadata: {
          key: flag.key,
          enabled: flag.enabled,
        },
      });
      return flag;
    }),

  delete: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const flag = await prisma.featureFlag.delete({
        where: { id: input.id },
      });
      await createAuditLog({
        userId: ctx.session?.impersonatorId ?? ctx.user?.id,
        action: "FEATURE_FLAG_DELETED",
        metadata: {
          key: flag.key,
        },
      });
      return { ok: true };
    }),
});
