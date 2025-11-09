import { addMinutes, differenceInMinutes, isAfter, isBefore, subMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { resolveContestSettings, defaultContestSettings } from "@/lib/contests/settings";
import {
  contestProblemSettingsSchema,
  contestSettingsSchema,
  type ContestBuilderValues,
  type ContestProblemSettings,
  type ContestSettings,
} from "@/lib/contests/schema";
import type {
  ContestDetailPayload,
  ContestOverviewPayload,
  ContestProblemSummary,
  ContestRegistrationStatusPayload,
  ContestScoreboardMeta,
  ContestStandingProblemCell,
  ContestStandingRow,
  ContestStandingsPayload,
  ContestSummary,
} from "@/lib/contests/types";
import {
  ClarificationStatus,
  ClarificationVisibility,
  Contest,
  ContestProblem,
  ContestRegistrationStatus,
  ContestRuleset,
  ContestState,
  ContestType,
  UserRole,
  Prisma,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import type { ContestClarificationPayload } from "@/lib/contests/types";

const ACCEPTED_VERDICTS = new Set(["AC", "MANUAL_ACCEPTED"]);
const PARTIAL_VERDICTS = new Set(["MANUAL_PARTIAL"]);
const STAFF_ROLES: UserRole[] = ["ADMIN", "PROBLEM_CURATOR", "MODERATOR"];
const isStaffRole = (role: UserRole) => STAFF_ROLES.includes(role);

const mapProblemSettings = (settings: unknown): ContestProblemSettings => {
  const parsed = contestProblemSettingsSchema.safeParse(settings ?? {});
  if (!parsed.success) {
    return contestProblemSettingsSchema.parse({});
  }
  return parsed.data;
};

const mapContestSummary = (
  contest: Contest & {
    settings: ContestSettings | unknown;
    _count: { problems: number; registrations: number };
    viewerRegistration?: ContestRegistrationStatusPayload | null;
  },
): ContestSummary => {
  const settings = resolveContestSettings(contest.settings ?? defaultContestSettings);
  return {
    id: contest.id,
    slug: contest.slug,
    name: contest.name,
    description: contest.description,
    type: contest.type as ContestType,
    visibility: contest.visibility,
    rules: contest.rules,
    isRated: contest.isRated,
    startsAt: contest.startsAt,
    endsAt: contest.endsAt,
    freezeAt: contest.freezeAt,
    state: contest.state,
    problemCount: contest._count.problems,
    registrationCount: contest._count.registrations,
    settings,
    viewerRegistration: contest.viewerRegistration ?? null,
  };
};

export async function getContestOverview(viewerId?: string | null): Promise<ContestOverviewPayload> {
  const contests = await prisma.contest.findMany({
    where: { deletedAt: null },
    orderBy: [{ startsAt: "asc" }],
    include: {
      _count: { select: { problems: true, registrations: true } },
      registrations: viewerId
        ? {
            where: { userId: viewerId, deletedAt: null },
            select: {
              id: true,
              status: true,
              isVirtual: true,
              isDisqualified: true,
              registeredAt: true,
            },
          }
        : false,
    },
  });

  const now = new Date();
  const live: ContestSummary[] = [];
  const upcoming: ContestSummary[] = [];
  const past: ContestSummary[] = [];

  for (const contest of contests) {
    const viewerRegistration = viewerId
      ? contest.registrations?.[0]
        ? {
            id: contest.registrations[0].id,
            status: contest.registrations[0].status,
            isVirtual: contest.registrations[0].isVirtual,
            isDisqualified: contest.registrations[0].isDisqualified,
            joinedAt: contest.registrations[0].registeredAt,
          }
        : null
      : null;
    const summary = mapContestSummary({
      ...contest,
      viewerRegistration,
    });
    if (contest.state === ContestState.RUNNING || (now >= contest.startsAt && now <= contest.endsAt)) {
      live.push(summary);
    } else if (now < contest.startsAt) {
      upcoming.push(summary);
    } else {
      past.push(summary);
    }
  }

  const featured = live[0] ?? upcoming[0] ?? null;
  return {
    featured,
    live,
    upcoming,
    past,
  };
}

const mapProblemSummary = (
  contestProblem: ContestProblem & {
    problem: {
      id: string;
      slug: string;
      currentVersion: { title: string } | null;
      difficulty: { code: string | null } | null;
      tags: { tag: { slug: string } }[];
    };
  },
): ContestProblemSummary => {
  return {
    id: contestProblem.id,
    label: contestProblem.label,
    order: contestProblem.order,
    points: contestProblem.points,
    slug: contestProblem.problem.slug,
    title: contestProblem.problem.currentVersion?.title ?? "Untitled",
    difficulty: contestProblem.problem.difficulty?.code ?? null,
    tags: contestProblem.problem.tags?.map((tag) => tag.tag.slug) ?? [],
    settings: mapProblemSettings(contestProblem.settings),
  };
};

function buildTimeline(contest: Contest): ContestDetailPayload["timeline"] {
  const now = new Date();
  const steps = [
    {
      label: "Contest begins",
      at: contest.startsAt,
      description: "Window opens for all registered participants.",
    },
  ];
  if (contest.freezeAt) {
    steps.push({
      label: "Scoreboard freeze",
      at: contest.freezeAt,
      description: "Standings visibility shifts per freeze policy.",
    });
  }
  steps.push({
    label: "Contest ends",
    at: contest.endsAt,
    description: "Submissions stop and virtual mode opens.",
  });
  const editorialRelease = contest.editorialReleaseAt ?? contest.endsAt;
  steps.push({
    label: "Upsolve + editorial",
    at: editorialRelease,
    description: "Full feedback, discussions, and editorials unlock.",
  });
  return steps.map((step) => ({
    ...step,
    state: now > step.at ? "complete" : now.toISOString() === step.at.toISOString() ? "active" : "upcoming",
  }));
}

export async function getContestDetail({
  slug,
  viewerId,
  viewerRole,
}: {
  slug: string;
  viewerId?: string | null;
  viewerRole: UserRole;
}): Promise<ContestDetailPayload> {
  const contest = await prisma.contest.findFirst({
    where: { slug, deletedAt: null },
    include: {
      _count: { select: { problems: true, registrations: true } },
      problems: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          problem: {
            select: {
              id: true,
              slug: true,
              currentVersion: { select: { title: true } },
              difficulty: { select: { code: true } },
              tags: { select: { tag: { select: { slug: true } } } },
            },
          },
        },
      },
      registrations: viewerId
        ? {
            where: { userId: viewerId, deletedAt: null },
            select: {
              id: true,
              status: true,
              isVirtual: true,
              isDisqualified: true,
              registeredAt: true,
            },
          }
        : false,
    },
  });
  if (!contest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Contest not found" });
  }
  const viewerRegistration = viewerId
    ? contest.registrations?.[0]
      ? {
          id: contest.registrations[0].id,
          status: contest.registrations[0].status,
          isVirtual: contest.registrations[0].isVirtual,
          isDisqualified: contest.registrations[0].isDisqualified,
          joinedAt: contest.registrations[0].registeredAt,
        }
      : null
    : null;
  const summary = mapContestSummary({
    ...contest,
    viewerRegistration,
  });
  const problems = contest.problems.map(mapProblemSummary);
  const scoreboardPreview = await getContestStandings({
    contestId: contest.id,
    limit: 5,
    viewerRole,
    viewerId,
  });
  const freezeActive = Boolean(
    contest.freezeAt &&
      isBefore(contest.freezeAt, contest.endsAt) &&
      isAfter(new Date(), contest.freezeAt) &&
      contest.state === ContestState.RUNNING,
  );
  return {
    contest: summary,
    problems,
    registration: {
      total: contest._count.registrations,
      virtual: await prisma.contestRegistration.count({ where: { contestId: contest.id, isVirtual: true } }),
      disqualified: await prisma.contestRegistration.count({ where: { contestId: contest.id, isDisqualified: true } }),
    },
    viewerRegistration,
    timeline: buildTimeline(contest),
    scoreboardPreview: scoreboardPreview.rows,
    freezeActive,
  };
}

type StandingsOptions = {
  contestId: string;
  viewerRole: UserRole;
  viewerId?: string | null;
  cursor?: string | null;
  limit?: number;
};

type ClarificationListOptions = {
  contestId: string;
  viewerRole: UserRole;
  viewerId?: string | null;
  status?: ClarificationStatus;
};

type ClarificationCreateOptions = {
  contestId: string;
  userId: string;
  question: string;
  problemId?: string | null;
};

type ClarificationResponseOptions = {
  clarificationId: string;
  contestId?: string;
  answeredById: string;
  answer: string;
  visibility: ClarificationVisibility;
  status?: ClarificationStatus;
};

const toMinutesFromStart = (contest: Contest, timestamp: Date | null | undefined) => {
  if (!timestamp) {
    return null;
  }
  return Math.max(0, differenceInMinutes(timestamp, contest.startsAt));
};

const compareRows = (a: ContestStandingRow, b: ContestStandingRow, tieBreakers: string[]) => {
  for (const breaker of tieBreakers) {
    switch (breaker) {
      case "solved":
        if (a.solved !== b.solved) {
          return b.solved - a.solved;
        }
        break;
      case "points":
        if (a.score !== b.score) {
          return b.score - a.score;
        }
        break;
      case "penalty":
        if (a.penalty !== b.penalty) {
          return a.penalty - b.penalty;
        }
        break;
      case "lastSolve":
        if (a.lastSolvedAt && b.lastSolvedAt && a.lastSolvedAt.getTime() !== b.lastSolvedAt.getTime()) {
          return a.lastSolvedAt.getTime() - b.lastSolvedAt.getTime();
        }
        if (a.lastSolvedAt && !b.lastSolvedAt) return -1;
        if (!a.lastSolvedAt && b.lastSolvedAt) return 1;
        break;
      case "firstSolve":
        {
          const firstA = a.entries.filter((entry) => entry.status === "AC" && entry.timeMinutes !== null).sort((x, y) => (x.timeMinutes ?? 0) - (y.timeMinutes ?? 0))[0];
          const firstB = b.entries.filter((entry) => entry.status === "AC" && entry.timeMinutes !== null).sort((x, y) => (x.timeMinutes ?? 0) - (y.timeMinutes ?? 0))[0];
          if (firstA && firstB && firstA.timeMinutes !== firstB.timeMinutes) {
            return (firstA.timeMinutes ?? 0) - (firstB.timeMinutes ?? 0);
          }
        }
        break;
      case "fastest":
        {
          const bestA = Math.min(
            ...a.entries
              .map((entry) => entry.timeMinutes ?? Infinity)
              .filter((value) => Number.isFinite(value)),
          );
          const bestB = Math.min(
            ...b.entries
              .map((entry) => entry.timeMinutes ?? Infinity)
              .filter((value) => Number.isFinite(value)),
          );
          if (bestA !== bestB) {
            return bestA - bestB;
          }
        }
        break;
      case "attempts":
        if (a.attempts !== b.attempts) {
          return a.attempts - b.attempts;
        }
        break;
      case "random":
        return a.user.id.localeCompare(b.user.id);
    }
  }
  return a.user.handle.localeCompare(b.user.handle ?? "");
};

export async function getContestStandings({
  contestId,
  viewerRole,
  viewerId,
  cursor,
  limit = 25,
}: StandingsOptions): Promise<ContestStandingsPayload> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      problems: {
        where: { deletedAt: null },
        orderBy: { order: "asc" },
        include: {
          problem: {
            select: {
              id: true,
              slug: true,
              currentVersion: { select: { title: true } },
            },
          },
        },
      },
    },
  });
  if (!contest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Contest not found" });
  }
  const settings = resolveContestSettings(contest.settings ?? defaultContestSettings);
  const freezeActive = Boolean(
    settings.freeze.enabled &&
      contest.freezeAt &&
      isBefore(contest.freezeAt, contest.endsAt) &&
      isAfter(new Date(), contest.freezeAt) &&
      viewerRole !== "ADMIN",
  );
  const freezeCutoff = freezeActive && contest.freezeAt ? contest.freezeAt : null;

  const registrations = await prisma.contestRegistration.findMany({
    where: { contestId: contest.id, deletedAt: null },
    include: {
      user: { select: { id: true, handle: true, name: true, avatarUrl: true, country: true } },
    },
  });

  const submissions = await prisma.submission.findMany({
    where: {
      contestId: contest.id,
      deletedAt: null,
      createdAt: { gte: subMinutes(contest.startsAt, 5), lte: addMinutes(contest.endsAt, 5) },
    },
    select: {
      id: true,
      userId: true,
      problemId: true,
      createdAt: true,
      finishedAt: true,
      verdictCode: true,
      status: true,
      score: true,
      isFrozen: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const problemMap = new Map(
    contest.problems.map((contestProblem) => [contestProblem.problemId, contestProblem]),
  );

  type ParticipantState = {
    userId: string;
    user: ContestStandingRow["user"];
    solved: number;
    score: number;
    penalty: number;
    attempts: number;
    lastSolvedAt: Date | null;
    entries: Map<string, ContestStandingProblemCell & { wrongAttempts: number; solvedAt?: Date | null }>;
    isVirtual: boolean;
    isDisqualified: boolean;
    tieBreakers: string[];
    hasFrozenActivity: boolean;
  };

  const participants = new Map<string, ParticipantState>();

  const ensureParticipant = (registration: (typeof registrations)[number]): ParticipantState => {
    const existing = participants.get(registration.userId);
    if (existing) return existing;
    const entryMap = new Map<string, ParticipantState["entries"]>();
    const state: ParticipantState = {
      userId: registration.userId,
      user: {
        id: registration.user.id,
        handle: registration.user.handle,
        name: registration.user.name,
        avatarUrl: registration.user.avatarUrl,
        country: registration.user.country,
      },
      solved: 0,
      score: 0,
      penalty: 0,
      attempts: 0,
      lastSolvedAt: null,
      entries: new Map(
        [...problemMap.values()].map((contestProblem) => [
          contestProblem.problemId,
          {
            problemId: contestProblem.problemId,
            label: contestProblem.label,
            score: 0,
            attempts: 0,
            timeMinutes: null,
            status: settings.freeze.enabled ? "PENDING" : "LOCKED",
            isFrozen: false,
            wrongAttempts: 0,
          },
        ]),
      ),
      isVirtual: registration.isVirtual,
      isDisqualified: registration.isDisqualified,
      tieBreakers: settings.scoring.tieBreakers,
      hasFrozenActivity: false,
    };
    participants.set(registration.userId, state);
    return state;
  };

  registrations.forEach(ensureParticipant);

  const hiddenUpdates = new Set<string>();

  for (const submission of submissions) {
    const registration = registrations.find((reg) => reg.userId === submission.userId);
    if (!registration) {
      continue;
    }
    const participant = ensureParticipant(registration);
    const contestProblem = problemMap.get(submission.problemId);
    if (!contestProblem) {
      continue;
    }
    const entry = participant.entries.get(submission.problemId);
    if (!entry) {
      continue;
    }
    const submissionTime = submission.finishedAt ?? submission.createdAt;
    if (freezeCutoff && submissionTime > freezeCutoff) {
      hiddenUpdates.add(`${submission.userId}:${submission.problemId}`);
      participant.hasFrozenActivity = true;
      continue;
    }
    participant.attempts += 1;
    entry.attempts += 1;
    const accepted = submission.verdictCode && ACCEPTED_VERDICTS.has(submission.verdictCode);
    const partial = submission.verdictCode && PARTIAL_VERDICTS.has(submission.verdictCode);
    if (!accepted && !partial) {
      entry.wrongAttempts += 1;
      entry.status = entry.status === "AC" ? entry.status : "FAILED";
      continue;
    }
    const minutesFromStart = toMinutesFromStart(contest, submissionTime);
    entry.timeMinutes = minutesFromStart;
    entry.status = accepted ? "AC" : "PENDING";
    if (accepted && entry.score === 0) {
      participant.solved += 1;
      participant.lastSolvedAt = submissionTime;
      if (settings.scoring.mode === "ICPC") {
        const penalty = (minutesFromStart ?? 0) + entry.wrongAttempts * settings.scoring.icpcPenaltyMinutes;
        participant.penalty += penalty;
        entry.score = 1;
        participant.score += 1;
      } else {
        const basePoints = contestProblem.points ?? 100;
        let award = basePoints;
        if (settings.scoring.mode === "CF") {
          award = Math.max(
            0,
            basePoints - settings.scoring.cfPenalty * entry.wrongAttempts - (minutesFromStart ?? 0) * settings.scoring.cfTimeDecay,
          );
        } else if (settings.scoring.mode === "ATCODER") {
          award = Math.max(0, basePoints + settings.scoring.atcoderBonus);
        } else if (settings.scoring.mode === "CUSTOM") {
          award = Math.max(
            0,
            settings.scoring.customBasePoints -
              settings.scoring.customAttemptPenalty * entry.wrongAttempts -
              settings.scoring.customTimeDecay * (minutesFromStart ?? 0),
          );
        }
        entry.score = award;
        participant.score += award;
      }
    } else if (partial && typeof submission.score === "number") {
      entry.score = Math.max(entry.score, submission.score);
      participant.score += submission.score;
    }
  }

  const allRows: ContestStandingRow[] = [...participants.values()]
    .map((participant) => {
      const entries = [...participant.entries.values()].map((entry) => ({
        problemId: entry.problemId,
        label: entry.label,
        score: entry.score,
        attempts: entry.attempts,
        timeMinutes: entry.timeMinutes,
        status: entry.status,
        isFrozen: hiddenUpdates.has(`${participant.userId}:${entry.problemId}`) || entry.isFrozen,
      }));
      return {
        user: participant.user,
        rank: 0,
        score: participant.score,
        solved: participant.solved,
        penalty: participant.penalty,
        attempts: participant.attempts,
        lastSolvedAt: participant.lastSolvedAt,
        isVirtual: participant.isVirtual,
        isDisqualified: participant.isDisqualified,
        entries,
      };
    })
    .sort((a, b) => compareRows(a, b, settings.scoring.tieBreakers));

  let currentRank = 1;
  for (const row of allRows) {
    row.rank = currentRank++;
  }

  const viewerIsStaff = isStaffRole(viewerRole);
  const scoreboardVisibility =
    contest.state === ContestState.FINISHED && settings.postContest.autoUnfreeze
      ? "full"
      : settings.scoreboard.visibility;
  let rows: ContestStandingRow[] = allRows;
  let limited = false;
  const normalizedViewerId = viewerId ?? null;

  if (!viewerIsStaff) {
    if (scoreboardVisibility === "hidden") {
      rows = [];
      limited = true;
    } else if (scoreboardVisibility === "self") {
      limited = true;
      rows = normalizedViewerId ? allRows.filter((row) => row.user.id === normalizedViewerId) : [];
    } else if (scoreboardVisibility === "top") {
      const topLimit = Math.min(limit, 15);
      const topRows = allRows.slice(0, topLimit);
      limited = allRows.length > topRows.length;
      let merged = topRows;
      if (normalizedViewerId) {
        const selfRow = allRows.find((row) => row.user.id === normalizedViewerId);
        if (selfRow && !merged.some((row) => row.user.id === normalizedViewerId)) {
          merged = [...merged, selfRow];
        }
      }
      const deduped = new Map<string, ContestStandingRow>();
      merged.forEach((row) => deduped.set(row.user.id, row));
      rows = [...deduped.values()];
    }
  }

  let startIndex = 0;
  if (cursor) {
    const index = rows.findIndex((row) => row.user.id === cursor);
    if (index >= 0) {
      startIndex = index + 1;
    }
  }
  const pagedRows = rows.slice(startIndex, startIndex + limit);
  const nextCursor = startIndex + limit < rows.length ? pagedRows[pagedRows.length - 1]?.user.id ?? null : null;

  const meta: ContestScoreboardMeta = {
    totalParticipants: allRows.length,
    generatedAt: new Date(),
    frozen: freezeActive,
    freezeMode: settings.freeze.mode,
    visibility: scoreboardVisibility,
    refreshIntervalSec: settings.scoreboard.refreshIntervalSec,
    highlightFirstSolve: settings.scoreboard.highlightFirstSolve,
    showPenaltyColumn: settings.scoreboard.showPenaltyColumn,
    showVirtualBadge: settings.scoreboard.showVirtualBadge,
    limited,
  };

  return {
    rows: pagedRows,
    meta,
    cursor: nextCursor,
  };
}

const clarificationInclude = {
  user: {
    select: {
      id: true,
      handle: true,
      name: true,
      avatarUrl: true,
    },
  },
  answeredBy: {
    select: {
      id: true,
      handle: true,
      name: true,
    },
  },
  problem: {
    select: {
      id: true,
      slug: true,
      currentVersion: {
        select: { title: true },
      },
    },
  },
} as const;

type ClarificationRecord = Prisma.ContestClarificationGetPayload<{
  include: typeof clarificationInclude;
}>;

const mapClarificationRecord = (
  clarification: ClarificationRecord,
  viewerId: string | null,
  labelMap: Map<string, string | null>,
): ContestClarificationPayload => {
  const problemMeta = clarification.problem
    ? {
        id: clarification.problem.id,
        slug: clarification.problem.slug,
        title: clarification.problem.currentVersion?.title ?? clarification.problem.slug,
        label: labelMap.get(clarification.problem.id) ?? null,
      }
    : null;
  return {
    id: clarification.id,
    question: clarification.question,
    answer: clarification.answer,
    visibility: clarification.visibility,
    status: clarification.status,
    isPublic: clarification.isPublic,
    createdAt: clarification.createdAt,
    answeredAt: clarification.answeredAt,
    isMine: viewerId ? clarification.userId === viewerId : false,
    author: {
      id: clarification.user.id,
      handle: clarification.user.handle,
      name: clarification.user.name,
      avatarUrl: clarification.user.avatarUrl,
    },
    answeredBy: clarification.answeredBy
      ? {
          id: clarification.answeredBy.id,
          handle: clarification.answeredBy.handle,
          name: clarification.answeredBy.name,
        }
      : null,
    problem: problemMeta,
  };
};

export async function registerForContest({
  contestId,
  userId,
  asVirtual,
  accessCode,
}: {
  contestId: string;
  userId: string;
  asVirtual?: boolean;
  accessCode?: string;
}) {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  const settings = resolveContestSettings(contest.settings ?? defaultContestSettings);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, country: true },
  });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  const now = new Date();
  if (contest.state === ContestState.FINISHED || now > contest.endsAt) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contest already finished" });
  }
  if (contest.state === ContestState.RUNNING && !settings.schedule.allowLateJoin) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Late join disabled" });
  }
  const cutoffMinutes = settings.schedule.lateJoinCutoffMinutes ?? settings.schedule.graceMinutes;
  if (
    contest.state === ContestState.RUNNING &&
    cutoffMinutes !== null &&
    now > addMinutes(contest.startsAt, cutoffMinutes)
  ) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Registration window closed" });
  }

  const existingRegistration = await prisma.contestRegistration.findFirst({
    where: { contestId: contest.id, userId, deletedAt: null },
  });
  if (existingRegistration) {
    if (existingRegistration.isDisqualified) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You have been disqualified" });
    }
    return existingRegistration;
  }
  if (settings.registration.requireVerifiedEmail && !user.emailVerified) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Verify your email before registering" });
  }
  if (settings.registration.allowedCountries.length > 0) {
    const normalized = (user.country ?? "").toUpperCase();
    const allowed = settings.registration.allowedCountries.map((country) => country.toUpperCase());
    if (!normalized || !allowed.includes(normalized)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Contest restricted to specific regions" });
    }
  }
  if (settings.registration.mode === "password") {
    if (!accessCode || !settings.registration.accessCodeHash) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Access code required" });
    }
    const matches = await bcrypt.compare(accessCode, settings.registration.accessCodeHash);
    if (!matches) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Invalid access code" });
    }
  }
  if (settings.registration.mode === "invite") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Invite-only contest" });
  }
  if (settings.registration.capacity) {
    const total = await prisma.contestRegistration.count({ where: { contestId: contest.id, deletedAt: null } });
    if (total >= settings.registration.capacity) {
      if (settings.registration.waitlistEnabled) {
        return prisma.contestRegistration.create({
          data: {
            contestId: contest.id,
            userId,
            isVirtual: Boolean(asVirtual),
            status: ContestRegistrationStatus.WAITLISTED,
            createdById: userId,
          },
        });
      }
      throw new TRPCError({ code: "BAD_REQUEST", message: "Contest is at capacity" });
    }
  }
  if (asVirtual && !settings.registration.allowVirtual) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Virtual participation disabled" });
  }

  return prisma.contestRegistration.create({
    data: {
      contestId: contest.id,
      userId,
      isVirtual: Boolean(asVirtual),
      status: ContestRegistrationStatus.REGISTERED,
      createdById: userId,
    },
  });
}

export async function unregisterFromContest(contestId: string, userId: string) {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (contest.state !== ContestState.UPCOMING) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot leave after contest starts" });
  }
  await prisma.contestRegistration.deleteMany({
    where: { contestId, userId },
  });
}

export async function createContestFromBuilder(input: ContestBuilderValues, creatorId: string) {
  const [start, end] = [input.startsAt, input.endsAt];
  if (start >= end) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Start must be before end" });
  }
  const slugExists = await prisma.contest.count({ where: { slug: input.slug } });
  if (slugExists) {
    throw new TRPCError({ code: "CONFLICT", message: "Slug already used" });
  }
  const settings = resolveContestSettings(input.settings ?? defaultContestSettings);
  const data = await prisma.$transaction(async (tx) => {
    const contest = await tx.contest.create({
      data: {
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        type: input.type as ContestType,
        visibility: input.visibility,
        rules: input.rules,
        isRated: input.isRated,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        freezeAt: input.freezeAt,
        settings,
        createdById: creatorId,
      },
    });
    const problemPayload = await Promise.all(
      input.problems.map(async (problem, index) => ({
        contestId: contest.id,
        problemId: problem.problemId,
        versionId: await resolveProblemVersionId(problem.problemId, tx),
        label: problem.label,
        order: problem.order ?? index + 1,
        points: problem.points,
        settings: problem.settings ?? contestProblemSettingsSchema.parse({}),
        createdById: creatorId,
      })),
    );
    await tx.contestProblem.createMany({
      data: problemPayload,
    });
    return contest;
  });
  return data;
}

type PrismaClientOrTransaction = typeof prisma | Prisma.TransactionClient;

async function resolveProblemVersionId(problemId: string, tx: PrismaClientOrTransaction = prisma) {
  const problem = await tx.problem.findUnique({
    where: { id: problemId },
    select: { currentVersionId: true },
  });
  if (!problem?.currentVersionId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Problem missing current version" });
  }
  return problem.currentVersionId;
}

export async function listContestClarifications({
  contestId,
  viewerRole,
  viewerId,
  status,
}: ClarificationListOptions): Promise<ContestClarificationPayload[]> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      state: true,
      problems: {
        where: { deletedAt: null },
        select: { problemId: true, label: true },
      },
    },
  });
  if (!contest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Contest not found" });
  }
  const labelMap = new Map(contest.problems.map((problem) => [problem.problemId, problem.label ?? null]));
  const viewerIsStaff = isStaffRole(viewerRole);
  const normalizedViewerId = viewerId ?? null;
  if (!viewerIsStaff) {
    if (!normalizedViewerId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const registration = await prisma.contestRegistration.findFirst({
      where: { contestId, userId: normalizedViewerId, deletedAt: null },
    });
    if (!registration && contest.state !== ContestState.FINISHED) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Registration required" });
    }
  }

  const whereClause: Prisma.ContestClarificationWhereInput = {
    contestId,
  };
  if (!viewerIsStaff) {
    const visibilityFilter: Prisma.ContestClarificationWhereInput[] = [{ visibility: ClarificationVisibility.PUBLIC }];
    if (normalizedViewerId) {
      visibilityFilter.push({ userId: normalizedViewerId });
    }
    whereClause.OR = visibilityFilter;
  }
  if (status) {
    whereClause.status = status;
  }

  const clarifications = await prisma.contestClarification.findMany({
    where: whereClause,
    orderBy: [{ createdAt: "desc" }],
    include: clarificationInclude,
  });

  return clarifications.map((clarification) =>
    mapClarificationRecord(clarification, normalizedViewerId, labelMap),
  );
}

export async function submitContestClarification({
  contestId,
  userId,
  question,
  problemId,
}: ClarificationCreateOptions): Promise<ContestClarificationPayload> {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: {
      id: true,
      state: true,
      problems: {
        where: { deletedAt: null },
        select: { problemId: true, label: true },
      },
    },
  });
  if (!contest) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Contest not found" });
  }
  if (contest.state === ContestState.ARCHIVED) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contest archived" });
  }
  const registration = await prisma.contestRegistration.findFirst({
    where: { contestId, userId, deletedAt: null },
  });
  if (!registration) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Registration required" });
  }
  const sanitizedQuestion = question.trim();
  if (sanitizedQuestion.length < 8) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Clarification question too short" });
  }
  if (sanitizedQuestion.length > 1200) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Clarification question too long" });
  }
  let resolvedProblemId: string | null = null;
  if (problemId) {
    const belongs = contest.problems.some((problem) => problem.problemId === problemId);
    if (!belongs) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Problem not part of contest" });
    }
    resolvedProblemId = problemId;
  }
  const created = await prisma.contestClarification.create({
    data: {
      contestId,
      userId,
      question: sanitizedQuestion,
      problemId: resolvedProblemId,
      visibility: ClarificationVisibility.PRIVATE,
      status: ClarificationStatus.OPEN,
      isPublic: false,
    },
    include: clarificationInclude,
  });
  const labelMap = new Map(contest.problems.map((problem) => [problem.problemId, problem.label ?? null]));
  return mapClarificationRecord(created, userId, labelMap);
}

export async function respondToContestClarification({
  clarificationId,
  contestId,
  answeredById,
  answer,
  visibility,
  status,
}: ClarificationResponseOptions): Promise<ContestClarificationPayload> {
  const existing = await prisma.contestClarification.findUnique({
    where: { id: clarificationId },
    select: { contestId: true },
  });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Clarification not found" });
  }
  if (contestId && existing.contestId !== contestId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Clarification does not belong to contest" });
  }
  const normalizedAnswer = answer.trim();
  if (!normalizedAnswer) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Answer cannot be empty" });
  }
  const finalStatus =
    status ??
    (visibility === ClarificationVisibility.PUBLIC ? ClarificationStatus.ANNOUNCED : ClarificationStatus.ANSWERED);
  const updated = await prisma.contestClarification.update({
    where: { id: clarificationId },
    data: {
      answer: normalizedAnswer,
      visibility,
      isPublic: visibility === ClarificationVisibility.PUBLIC,
      status: finalStatus,
      answeredById,
      answeredAt: new Date(),
    },
    include: clarificationInclude,
  });
  const contest = await prisma.contest.findUnique({
    where: { id: existing.contestId },
    select: {
      problems: {
        where: { deletedAt: null },
        select: { problemId: true, label: true },
      },
    },
  });
  const labelMap = new Map(
    (contest?.problems ?? []).map((problem) => [problem.problemId, problem.label ?? null]),
  );
  return mapClarificationRecord(updated, answeredById, labelMap);
}
