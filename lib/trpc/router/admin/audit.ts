import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import { IncidentSeverity, IncidentStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { createAuditLog } from "@/lib/auth/audit";
import { TRPCError } from "@trpc/server";

const timelineItemSchema = z.object({
  at: z.coerce.date(),
  note: z.string().max(200),
});

const incidentPayload = z.object({
  title: z.string().min(4).max(140),
  summary: z.string().min(10).max(500),
  severity: z.nativeEnum(IncidentSeverity),
  status: z.nativeEnum(IncidentStatus).default("OPEN"),
  impact: z.string().max(240).optional(),
  timeline: z.array(timelineItemSchema).optional(),
});

export const adminAuditRouter = router({
  logs: adminProcedure
    .input(
      z
        .object({
          userId: z.string().cuid().optional(),
          action: z.string().optional(),
          limit: z.number().int().min(10).max(100).default(40),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const logs = await prisma.authAuditLog.findMany({
        where: {
          userId: input?.userId,
          action: input?.action as any,
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 40,
        include: {
          user: { select: { id: true, handle: true, email: true } },
        },
      });
      return logs;
    }),

  incidents: adminProcedure.query(async () => {
    return prisma.incident.findMany({
      orderBy: { startedAt: "desc" },
    });
  }),

  createIncident: adminProcedure.input(incidentPayload).mutation(async ({ ctx, input }) => {
    const incident = await prisma.incident.create({
      data: {
        ...input,
        timeline: (input.timeline as Prisma.InputJsonValue) ?? null,
        createdById: ctx.session?.impersonatorId ?? ctx.user?.id,
        updatedById: ctx.session?.impersonatorId ?? ctx.user?.id,
      },
    });
    await createAuditLog({
      userId: ctx.session?.impersonatorId ?? ctx.user?.id,
      action: "INCIDENT_CREATED",
      metadata: {
        incidentId: incident.id,
        severity: incident.severity,
      },
    });
    return incident;
  }),

  updateIncident: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        title: z.string().min(4).max(140).optional(),
        summary: z.string().min(10).max(500).optional(),
        severity: z.nativeEnum(IncidentSeverity).optional(),
        status: z.nativeEnum(IncidentStatus).optional(),
        impact: z.string().max(240).optional(),
        timeline: z.array(timelineItemSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const incident = await prisma.incident.update({
        where: { id },
        data: {
          ...data,
          timeline: data.timeline ? (data.timeline as Prisma.InputJsonValue) : undefined,
          updatedById: ctx.session?.impersonatorId ?? ctx.user?.id,
        },
      });
      await createAuditLog({
        userId: ctx.session?.impersonatorId ?? ctx.user?.id,
        action: "INCIDENT_UPDATED",
        metadata: {
          incidentId: incident.id,
          status: incident.status,
        },
      });
      return incident;
    }),

  resolveIncident: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        resolution: z.string().max(400).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const incident = await prisma.incident.update({
        where: { id: input.id },
        data: {
          status: IncidentStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedById: ctx.session?.impersonatorId ?? ctx.user?.id,
          impact: input.resolution ?? undefined,
        },
      });
      await createAuditLog({
        userId: ctx.session?.impersonatorId ?? ctx.user?.id,
        action: "INCIDENT_RESOLVED",
        metadata: {
          incidentId: incident.id,
        },
      });
      return incident;
    }),
});
