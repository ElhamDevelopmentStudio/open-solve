import { defaultContestSettings, resolveContestSettings } from "@/lib/contests/settings";
import type { ContestSettings } from "@/lib/contests/schema";
import type {
  ContestAntiCheatClientEvent,
  ContestAntiCheatIngestResponse,
} from "@/lib/contests/anti-cheat/types";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  ContestAntiCheatEventType,
  ContestAntiCheatFlagStatus,
  ContestAntiCheatSeverity,
  ContestAntiCheatSessionStatus,
  ContestRegistration,
  ContestState,
  ContestType,
  Prisma,
} from "@prisma/client";

type ContestAntiCheatContext = {
  contest: {
    id: string;
    slug: string;
    name: string;
    type: ContestType;
    startsAt: Date;
    endsAt: Date;
    state: ContestState;
    settings: ContestSettings;
  };
  registration: ContestRegistration;
  antiCheat: ContestSettings["antiCheat"];
  userId: string;
};

export async function resolveContestAntiCheatContext(contestId: string, userId: string) {
  const contest = await prisma.contest.findFirst({
    where: { id: contestId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      startsAt: true,
      endsAt: true,
      state: true,
      settings: true,
    },
  });
  if (!contest) {
    return null;
  }
  const settings = resolveContestSettings(contest.settings ?? defaultContestSettings);
  if (contest.type !== ContestType.EDUCATIONAL || !settings.antiCheat.enabled) {
    return null;
  }
  const registration = await prisma.contestRegistration.findFirst({
    where: { contestId: contest.id, userId, deletedAt: null },
  });
  if (!registration) {
    return null;
  }
  return {
    contest: { ...contest, settings },
    registration,
    antiCheat: settings.antiCheat,
    userId,
  } satisfies ContestAntiCheatContext;
}

export async function ingestContestAntiCheatEvents({
  context,
  events,
  ipHash,
  geoRegion,
}: {
  context: ContestAntiCheatContext;
  events: ContestAntiCheatClientEvent[];
  ipHash?: string | null;
  geoRegion?: string | null;
}): Promise<ContestAntiCheatIngestResponse> {
  if (!events.length) {
    return {
      warnings: [],
      flagged: false,
      disqualified: Boolean(context.registration.isDisqualified),
      status: ContestAntiCheatFlagStatus.CLEAN,
    };
  }
  if (context.registration.isDisqualified) {
    return {
      warnings: [],
      flagged: false,
      disqualified: true,
      status: ContestAntiCheatFlagStatus.DISQUALIFIED,
    };
  }

  const sortedEvents = [...events].sort((a, b) => {
    const aTime = toTimestamp(a.occurredAt);
    const bTime = toTimestamp(b.occurredAt);
    return aTime - bTime;
  });
  const warnings: string[] = [];
  let flagged = false;
  let disqualified = false;
  let currentStatus: ContestAntiCheatFlagStatus = ContestAntiCheatFlagStatus.CLEAN;
  const sessionCache = new Map<string, { id: string }>();

  await prisma.$transaction(async (tx) => {
    for (const event of sortedEvents) {
      switch (event.type) {
        case "session_start": {
          const session = await upsertSession(tx, context, event, ipHash, geoRegion);
          sessionCache.set(event.sessionId, { id: session.id });
          if (context.antiCheat.multiDevice.singleDeviceOnly) {
            const violations = await tx.contestAntiCheatSession.findMany({
              where: {
                contestId: context.contest.id,
                registrationId: context.registration.id,
                status: ContestAntiCheatSessionStatus.ACTIVE,
                sessionId: { not: event.sessionId },
              },
            });
            if (violations.length > 0) {
              const message = context.antiCheat.multiDevice.allowSecondaryFlagged
                ? "Another device is active. Further activity may trigger flags."
                : "Multiple devices detected. Previous sessions were locked.";
              warnings.push(message);
              flagged = true;
              for (const violation of violations) {
                await tx.contestAntiCheatSession.update({
                  where: { id: violation.id },
                  data: {
                    status: ContestAntiCheatSessionStatus.TERMINATED,
                    endedAt: new Date(),
                    violationCount: { increment: 1 },
                  },
                });
              }
              await logEvent(tx, context, {
                type: ContestAntiCheatEventType.MULTI_DEVICE,
                severity: ContestAntiCheatSeverity.FLAG,
                note: "Multiple concurrent sessions detected",
                sessionId: session.id,
              });
              const flag = await bumpFlag(tx, context, { suspiciousSessions: 1 });
              currentStatus = flag.status;
              if (!context.antiCheat.multiDevice.allowSecondaryFlagged) {
                await setFlagStatus(tx, context, ContestAntiCheatFlagStatus.SUSPICIOUS);
                currentStatus = ContestAntiCheatFlagStatus.SUSPICIOUS;
              }
            }
          }
          if (context.antiCheat.multiDevice.requireLock && context.registration.deviceFingerprint) {
            const fingerprint = buildFingerprint(event, ipHash);
            if (fingerprint !== context.registration.deviceFingerprint) {
              warnings.push("Device mismatch detected. Contest is locked to a single device.");
              await logEvent(tx, context, {
                type: ContestAntiCheatEventType.SYSTEM_WARNING,
                severity: ContestAntiCheatSeverity.WARNING,
                note: "Device fingerprint mismatch",
                sessionId: session.id,
              });
              const flag = await bumpFlag(tx, context, { suspiciousSessions: 1 });
              currentStatus = flag.status;
            }
          } else if (context.antiCheat.multiDevice.requireLock && !context.registration.deviceFingerprint) {
            const fingerprint = buildFingerprint(event, ipHash);
            await tx.contestRegistration.update({
              where: { id: context.registration.id },
              data: {
                deviceFingerprint: fingerprint,
                ipHash: ipHash ?? context.registration.ipHash,
              },
            });
          }
          break;
        }
        case "session_end": {
          const session = await tx.contestAntiCheatSession.findUnique({
            where: {
              contestId_sessionId: {
                contestId: context.contest.id,
                sessionId: event.sessionId,
              },
            },
            select: { id: true, status: true },
          });
          if (session) {
            await tx.contestAntiCheatSession.update({
              where: { id: session.id },
              data: {
                status: ContestAntiCheatSessionStatus.TERMINATED,
                endedAt: new Date(),
                lastSeenAt: new Date(),
              },
            });
            await logEvent(tx, context, {
              type: ContestAntiCheatEventType.SESSION_END,
              severity: ContestAntiCheatSeverity.INFO,
              note: event.reason ?? "Session closed",
              sessionId: session.id,
            });
          }
          break;
        }
        case "focus_metrics": {
          const tabDelta = event.delta?.tabSwitches ?? 0;
          const outOfFocusDelta = event.delta?.outOfFocusMs ?? 0;
          const maxStreak = event.delta?.maxConsecutiveOutMs ?? 0;
          if (tabDelta === 0 && outOfFocusDelta === 0) {
            break;
          }
          const sessionRecordId = await resolveSessionId(tx, context, event.sessionId, sessionCache);
          const existingMetric = await tx.contestAntiCheatFocusMetric.findFirst({
            where: {
              contestId: context.contest.id,
              registrationId: context.registration.id,
              sessionId: sessionRecordId,
              problemId: event.problemId ?? null,
            },
          });
          let focusRecord;
          if (existingMetric) {
            focusRecord = await tx.contestAntiCheatFocusMetric.update({
              where: { id: existingMetric.id },
              data: {
                tabSwitchCount: { increment: tabDelta },
                totalOutOfFocusMs: { increment: outOfFocusDelta },
                maxConsecutiveOutMs: Math.max(
                  existingMetric.maxConsecutiveOutMs,
                  maxStreak,
                ),
                lastEventAt: new Date(),
              },
            });
          } else {
            focusRecord = await tx.contestAntiCheatFocusMetric.create({
              data: {
                contestId: context.contest.id,
                registrationId: context.registration.id,
                sessionId: sessionRecordId,
                userId: context.userId,
                problemId: event.problemId ?? null,
                tabSwitchCount: tabDelta,
                totalOutOfFocusMs: outOfFocusDelta,
                maxConsecutiveOutMs: maxStreak,
              },
            });
          }
          if (tabDelta > 0) {
            await logEvent(tx, context, {
              type: ContestAntiCheatEventType.TAB_SWITCH,
              severity: ContestAntiCheatSeverity.INFO,
              problemId: event.problemId,
              note: `Tab switch recorded (+${tabDelta})`,
            });
          }
          if (outOfFocusDelta > 0) {
            await logEvent(tx, context, {
              type: ContestAntiCheatEventType.FOCUS_LOSS,
              severity: ContestAntiCheatSeverity.INFO,
              problemId: event.problemId,
              note: `Out of focus for ${(outOfFocusDelta / 1000).toFixed(1)}s`,
            });
          }
          const flag = await bumpFlag(tx, context, {
            tabSwitches: tabDelta,
            outOfFocusMs: outOfFocusDelta,
          });
          currentStatus = flag.status;
          const focusSettings = context.antiCheat.focus;
          if (
            tabDelta > 0 &&
            focusSettings.softWarningTabs &&
            focusRecord.tabSwitchCount >= focusSettings.softWarningTabs
          ) {
            warnings.push("Frequent tab switching detected. Stay focused on the contest.");
          }
          if (
            tabDelta > 0 &&
            focusSettings.flagTabs &&
            focusRecord.tabSwitchCount >= focusSettings.flagTabs
          ) {
            flagged = true;
            await logEvent(tx, context, {
              type: ContestAntiCheatEventType.TAB_SWITCH,
              severity: ContestAntiCheatSeverity.FLAG,
              problemId: event.problemId,
              note: `Flag threshold reached (${focusRecord.tabSwitchCount} tab changes)`,
            });
            await setFlagStatus(tx, context, ContestAntiCheatFlagStatus.SUSPICIOUS);
            currentStatus = ContestAntiCheatFlagStatus.SUSPICIOUS;
          }
          if (
            focusSettings.autoDQTabs &&
            focusRecord.tabSwitchCount >= focusSettings.autoDQTabs &&
            !disqualified
          ) {
            disqualified = true;
            await disqualifyParticipant(tx, context, "Excessive tab switching");
            currentStatus = ContestAntiCheatFlagStatus.DISQUALIFIED;
            warnings.push("You have been disqualified due to repeated tab switching.");
          }
          if (
            focusSettings.softWarningOutMs &&
            focusRecord.totalOutOfFocusMs >= focusSettings.softWarningOutMs
          ) {
            warnings.push("Extended time away from the contest window detected.");
          }
          if (
            focusSettings.flagOutMs &&
            focusRecord.totalOutOfFocusMs >= focusSettings.flagOutMs
          ) {
            flagged = true;
            await logEvent(tx, context, {
              type: ContestAntiCheatEventType.FOCUS_LOSS,
              severity: ContestAntiCheatSeverity.FLAG,
              note: "Total out-of-focus time exceeded limit",
            });
            await setFlagStatus(tx, context, ContestAntiCheatFlagStatus.SUSPICIOUS);
            currentStatus = ContestAntiCheatFlagStatus.SUSPICIOUS;
          }
          break;
        }
        case "paste": {
          const threshold = context.antiCheat.paste.largePasteThreshold;
          if (event.pastedLength < threshold) {
            break;
          }
          warnings.push("Large paste detected. Contest editors are monitored.");
          const sessionId = await resolveSessionId(tx, context, event.sessionId, sessionCache);
          await logEvent(tx, context, {
            type: ContestAntiCheatEventType.LARGE_PASTE,
            severity: ContestAntiCheatSeverity.WARNING,
            problemId: event.problemId,
            note: `Pasted ${event.pastedLength} chars`,
            sessionId,
          });
          const flag = await bumpFlag(tx, context, { largePastes: 1 });
          currentStatus = flag.status;
          const perProblemCount = await tx.contestAntiCheatEvent.count({
            where: {
              contestId: context.contest.id,
              registrationId: context.registration.id,
              problemId: event.problemId ?? null,
              type: ContestAntiCheatEventType.LARGE_PASTE,
            },
          });
          if (perProblemCount >= context.antiCheat.paste.perProblemLimit) {
            flagged = true;
            await setFlagStatus(tx, context, ContestAntiCheatFlagStatus.SUSPICIOUS);
            currentStatus = ContestAntiCheatFlagStatus.SUSPICIOUS;
          }
          const contestPasteCount = await tx.contestAntiCheatEvent.count({
            where: {
              contestId: context.contest.id,
              registrationId: context.registration.id,
              type: ContestAntiCheatEventType.LARGE_PASTE,
            },
          });
          if (
            contestPasteCount >= context.antiCheat.paste.perContestLimit &&
            !disqualified
          ) {
            disqualified = true;
            await disqualifyParticipant(tx, context, "Excessive large paste events");
            currentStatus = ContestAntiCheatFlagStatus.DISQUALIFIED;
          }
          break;
        }
      }
    }
  });

  return {
    warnings,
    flagged,
    disqualified,
    status: currentStatus,
  };
}

function toTimestamp(value?: string) {
  return value ? new Date(value).getTime() : Date.now();
}

async function upsertSession(
  tx: Prisma.TransactionClient,
  context: ContestAntiCheatContext,
  event: Extract<ContestAntiCheatClientEvent, { type: "session_start" }>,
  ipHash?: string | null,
  geoRegion?: string | null,
) {
  const session = await tx.contestAntiCheatSession.upsert({
    where: {
      contestId_sessionId: {
        contestId: context.contest.id,
        sessionId: event.sessionId,
      },
    },
    update: {
      deviceType: event.deviceType,
      osFamily: event.osFamily,
      browserFamily: event.browserFamily,
      viewportWidth: event.viewport?.width ?? null,
      viewportHeight: event.viewport?.height ?? null,
      connectionType: event.connectionType ?? null,
      ipHash: ipHash ?? null,
      geoRegion: geoRegion ?? null,
      lastSeenAt: new Date(),
      status: ContestAntiCheatSessionStatus.ACTIVE,
    },
    create: {
      contestId: context.contest.id,
      registrationId: context.registration.id,
      userId: context.userId,
      sessionId: event.sessionId,
      deviceType: event.deviceType,
      osFamily: event.osFamily ?? null,
      browserFamily: event.browserFamily ?? null,
      viewportWidth: event.viewport?.width ?? null,
      viewportHeight: event.viewport?.height ?? null,
      connectionType: event.connectionType ?? null,
      ipHash: ipHash ?? null,
      geoRegion: geoRegion ?? null,
    },
  });
  await logEvent(tx, context, {
    type: ContestAntiCheatEventType.SESSION_START,
    severity: ContestAntiCheatSeverity.INFO,
    sessionId: session.id,
    note: "Session registered",
  });
  return session;
}

async function resolveSessionId(
  tx: Prisma.TransactionClient,
  context: ContestAntiCheatContext,
  clientSessionId: string,
  cache: Map<string, { id: string }>,
) {
  const cached = cache.get(clientSessionId);
  if (cached) {
    return cached.id;
  }
  const session = await tx.contestAntiCheatSession.findUnique({
    where: {
      contestId_sessionId: {
        contestId: context.contest.id,
        sessionId: clientSessionId,
      },
    },
    select: { id: true },
  });
  if (session) {
    cache.set(clientSessionId, session);
    return session.id;
  }
  const placeholder = await tx.contestAntiCheatSession.create({
    data: {
      contestId: context.contest.id,
      registrationId: context.registration.id,
      userId: context.userId,
      sessionId: clientSessionId,
      deviceType: "desktop",
    },
    select: { id: true },
  });
  cache.set(clientSessionId, placeholder);
  return placeholder.id;
}

async function bumpFlag(
  tx: Prisma.TransactionClient,
  context: ContestAntiCheatContext,
  delta: {
    tabSwitches?: number;
    outOfFocusMs?: number;
    largePastes?: number;
    suspiciousSessions?: number;
  },
) {
  const tabSwitches = delta.tabSwitches ?? 0;
  const outOfFocusMs = delta.outOfFocusMs ?? 0;
  const largePastes = delta.largePastes ?? 0;
  const suspiciousSessions = delta.suspiciousSessions ?? 0;
  const deltaRisk =
    tabSwitches * 3 +
    Math.floor(outOfFocusMs / 30000) +
    largePastes * 4 +
    suspiciousSessions * 8;
  return tx.contestAntiCheatFlag.upsert({
    where: { registrationId: context.registration.id },
    update: {
      tabSwitchCount: { increment: tabSwitches },
      totalOutOfFocusMs: { increment: outOfFocusMs },
      largePasteCount: { increment: largePastes },
      suspiciousSessions: { increment: suspiciousSessions },
      riskScore: { increment: deltaRisk },
      lastEventAt: new Date(),
    },
    create: {
      contestId: context.contest.id,
      registrationId: context.registration.id,
      userId: context.userId,
      tabSwitchCount: tabSwitches,
      totalOutOfFocusMs: outOfFocusMs,
      largePasteCount: largePastes,
      suspiciousSessions,
      riskScore: deltaRisk,
      lastEventAt: new Date(),
    },
  });
}

async function setFlagStatus(
  tx: Prisma.TransactionClient,
  context: ContestAntiCheatContext,
  status: ContestAntiCheatFlagStatus,
) {
  await tx.contestAntiCheatFlag.upsert({
    where: { registrationId: context.registration.id },
    update: { status },
    create: {
      contestId: context.contest.id,
      registrationId: context.registration.id,
      userId: context.userId,
      status,
    },
  });
  await logEvent(tx, context, {
    type: ContestAntiCheatEventType.FLAG_STATUS,
    severity: ContestAntiCheatSeverity.INFO,
    note: `Flag status set to ${status}`,
  });
}

async function disqualifyParticipant(
  tx: Prisma.TransactionClient,
  context: ContestAntiCheatContext,
  reason: string,
) {
  await tx.contestRegistration.update({
    where: { id: context.registration.id },
    data: {
      isDisqualified: true,
      disqualifiedAt: new Date(),
      dqReason: reason,
    },
  });
  await setFlagStatus(tx, context, ContestAntiCheatFlagStatus.DISQUALIFIED);
  await logEvent(tx, context, {
    type: ContestAntiCheatEventType.SYSTEM_WARNING,
    severity: ContestAntiCheatSeverity.CRITICAL,
    note: reason,
  });
}

async function logEvent(
  tx: Prisma.TransactionClient,
  context: ContestAntiCheatContext,
  data: {
    type: ContestAntiCheatEventType;
    severity: ContestAntiCheatSeverity;
    note?: string;
    sessionId?: string;
    problemId?: string | null;
  },
) {
  try {
    await tx.contestAntiCheatEvent.create({
      data: {
        contestId: context.contest.id,
        registrationId: context.registration.id,
        userId: context.userId,
        sessionId: data.sessionId ?? null,
        problemId: data.problemId ?? null,
        type: data.type,
        severity: data.severity,
        note: data.note ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "failed to log anti-cheat event");
  }
}

function buildFingerprint(event: Extract<ContestAntiCheatClientEvent, { type: "session_start" }>, ipHash?: string | null) {
  return [
    event.deviceType,
    event.osFamily ?? "unknown-os",
    event.browserFamily ?? "unknown-browser",
    ipHash ?? "unknown-ip",
  ].join("|");
}
