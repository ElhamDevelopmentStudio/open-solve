import { generateContestSimilarityClusters } from "@/lib/contests/anti-cheat/similarity";
import { prisma } from "@/lib/prisma";
import { adminProcedure, router } from "@/lib/trpc/trpc";
import {
  ContestAntiCheatFlagStatus,
  ContestAntiCheatEventType,
  ContestAntiCheatSeverity,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const adminAntiCheatRouter = router({
  participants: adminProcedure
    .input(z.object({ contestId: z.string().cuid() }))
    .query(async ({ input }) => {
      const flags = await prisma.contestAntiCheatFlag.findMany({
        where: { contestId: input.contestId },
        include: {
          registration: {
            include: {
              user: {
                select: { id: true, handle: true, name: true, avatarUrl: true, country: true },
              },
            },
          },
        },
        orderBy: [{ riskScore: "desc" }, { updatedAt: "desc" }],
      });
      const sessions = await prisma.contestAntiCheatSession.findMany({
        where: { contestId: input.contestId },
        orderBy: { lastSeenAt: "desc" },
      });
      const latestEvents = await prisma.contestAntiCheatEvent.findMany({
        where: { contestId: input.contestId },
        orderBy: { occurredAt: "desc" },
        take: 200,
      });
      return flags.map((flag) => {
        const activeSession = sessions.find(
          (session) => session.registrationId === flag.registrationId,
        );
        const recentEvents = latestEvents
          .filter((event) => event.registrationId === flag.registrationId)
          .slice(0, 5);
        return {
          id: flag.id,
          registrationId: flag.registrationId,
          status: flag.status,
          riskScore: flag.riskScore,
          metrics: {
            tabSwitches: flag.tabSwitchCount,
            outOfFocusMs: flag.totalOutOfFocusMs,
            largePastes: flag.largePasteCount,
            suspiciousSessions: flag.suspiciousSessions,
          },
          participant: flag.registration.user,
          lastEventAt: flag.lastEventAt,
          activeSession: activeSession
            ? {
                id: activeSession.id,
                deviceType: activeSession.deviceType,
                osFamily: activeSession.osFamily,
                browserFamily: activeSession.browserFamily,
                lastSeenAt: activeSession.lastSeenAt,
                violationCount: activeSession.violationCount,
              }
            : null,
          recentEvents,
        };
      });
    }),
  timeline: adminProcedure
    .input(
      z.object({
        registrationId: z.string().cuid(),
        limit: z.number().int().min(20).max(300).default(100),
      }),
    )
    .query(async ({ input }) => {
      const events = await prisma.contestAntiCheatEvent.findMany({
        where: { registrationId: input.registrationId },
        include: {
          session: {
            select: {
              deviceType: true,
              osFamily: true,
              browserFamily: true,
            },
          },
        },
        orderBy: { occurredAt: "desc" },
        take: input.limit,
      });
      return events;
    }),
  setStatus: adminProcedure
    .input(
      z.object({
        flagId: z.string().cuid(),
        status: z.nativeEnum(ContestAntiCheatFlagStatus),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const flag = await prisma.contestAntiCheatFlag.findUnique({
        where: { id: input.flagId },
        select: { id: true, status: true, registrationId: true, contestId: true },
      });
      if (!flag) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await prisma.contestAntiCheatFlag.update({
        where: { id: flag.id },
        data: { status: input.status },
      });
      if (input.status === ContestAntiCheatFlagStatus.DISQUALIFIED) {
        await prisma.contestRegistration.update({
          where: { id: flag.registrationId },
          data: {
            isDisqualified: true,
            disqualifiedAt: new Date(),
            dqReason: input.note ?? "Marked by admin",
          },
        });
      }
      await prisma.contestAntiCheatEvent.create({
        data: {
          contestId: flag.contestId,
          registrationId: flag.registrationId,
          type: ContestAntiCheatEventType.FLAG_STATUS,
          severity: ContestAntiCheatSeverity.INFO,
          note: `Admin set status to ${input.status}. ${input.note ?? ""}`.trim(),
        },
      });
      return { ok: true };
    }),
  clusters: adminProcedure
    .input(
      z.object({
        contestId: z.string().cuid(),
      }),
    )
    .query(async ({ input }) => {
      let clusters = await prisma.contestAntiCheatCluster.findMany({
        where: { contestId: input.contestId },
        include: {
          members: {
            include: {
              flag: {
                include: {
                  registration: {
                    include: {
                      user: {
                        select: { handle: true, name: true, avatarUrl: true },
                      },
                    },
                  },
                },
              },
              submission: {
                select: { id: true, verdictCode: true, createdAt: true },
              },
            },
          },
        },
        orderBy: { similarityScore: "desc" },
      });
      if (clusters.length === 0) {
        await generateContestSimilarityClusters(input.contestId);
        clusters = await prisma.contestAntiCheatCluster.findMany({
          where: { contestId: input.contestId },
          include: {
            members: {
              include: {
                flag: {
                  include: {
                    registration: {
                      include: {
                        user: {
                          select: { handle: true, name: true, avatarUrl: true },
                        },
                      },
                    },
                  },
                },
                submission: {
                  select: { id: true, verdictCode: true, createdAt: true },
                },
              },
            },
          },
          orderBy: { similarityScore: "desc" },
        });
      }
      return clusters;
    }),
});
