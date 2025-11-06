import { subDays } from "date-fns";
import { Prisma, type UserRole, type UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACCEPTED_VERDICTS } from "@/lib/submissions/constants";
import { DIFFICULTIES } from "@/lib/problems/constants";
import { isStaffRole } from "@/lib/auth/permissions";
import { logger } from "@/lib/logger";

export const LEADERBOARD_WINDOWS = ["weekly", "monthly", "all_time"] as const;
export type LeaderboardWindow = (typeof LEADERBOARD_WINDOWS)[number];

export type LeaderboardUser = {
  id: string;
  handle: string;
  name: string | null;
  avatarUrl: string | null;
  country: string | null;
  role: UserRole;
  status: UserStatus;
};

export type LeaderboardEntry = {
  rank: number;
  score: number;
  solved: number;
  timePenalty?: number | null;
  submissions?: number;
  avgRuntimeMs?: number | null;
  lastSolvedAt?: Date | null;
  user: LeaderboardUser;
};

export type LeaderboardResponse = {
  window: LeaderboardWindow;
  periodStart: Date | null;
  periodEnd: Date | null;
  generatedAt: Date | null;
  entries: LeaderboardEntry[];
  hero: LeaderboardEntry[];
  viewerEntry?: LeaderboardEntry | null;
  nextCursor?: number;
  totalEntries: number;
  title?: string;
  subtitle?: string;
};

const DEFAULT_LIMIT = 25;
const BANNED_STATUS: UserStatus = "BANNED";

const mapUser = (user: LeaderboardUser): LeaderboardUser => ({
  id: user.id,
  handle: user.handle,
  name: user.name,
  avatarUrl: user.avatarUrl,
  country: user.country,
  role: user.role,
  status: user.status,
});

const mapEntry = (entry: {
  rank: number;
  score: number;
  solved: number;
  timePenalty?: number | null;
  submissions?: number;
  avgRuntimeMs?: number | null;
  user: LeaderboardUser;
}): LeaderboardEntry => ({
  rank: entry.rank,
  score: entry.score,
  solved: entry.solved,
  timePenalty: entry.timePenalty ?? null,
  submissions: entry.submissions,
  avgRuntimeMs: entry.avgRuntimeMs ?? null,
  user: mapUser(entry.user),
});

type HydratedEntry = LeaderboardEntry & {
  userId: string;
  baseRank: number;
  lastSolvedAt: Date | null;
};

const toPublicEntry = (entry: HydratedEntry): LeaderboardEntry => ({
  rank: entry.rank,
  score: entry.score,
  solved: entry.solved,
  timePenalty: entry.timePenalty ?? null,
  submissions: entry.submissions,
  avgRuntimeMs: entry.avgRuntimeMs ?? null,
  user: entry.user,
});

const isMissingRealtimeTableError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021";
  }
  if (typeof error === "object" && error && "code" in error) {
    return (error as { code?: string }).code === "P2021";
  }
  return false;
};

let realtimeTableMissing = false;
export const __resetRealtimeLeaderboardState = () => {
  realtimeTableMissing = false;
};

type RealtimeSolveAggregateRow = {
  userId: string;
  _sum: { score: number | null };
  _count: { _all: number };
  _max: { createdAt: Date | null };
};

const fetchRealtimeDeltaRows = async (snapshotId: string): Promise<RealtimeSolveAggregateRow[]> => {
  if (realtimeTableMissing) {
    return [];
  }
  try {
    return await (prisma.leaderboardRealtimeSolve as unknown as {
      groupBy: (args: Prisma.LeaderboardRealtimeSolveGroupByArgs) => Promise<RealtimeSolveAggregateRow[]>;
    }).groupBy({
      by: ["userId"],
      where: { snapshotId },
      _sum: { score: true },
      _count: { _all: true },
      _max: { createdAt: true },
    });
  } catch (error) {
    if (isMissingRealtimeTableError(error)) {
      realtimeTableMissing = true;
      logger.warn(
        "leaderboard realtime table missing; run `prisma migrate` to enable live ranking",
      );
      return [];
    }
    throw error;
  }
};

export const buildRealtimeSnapshotRanking = async ({
  snapshot,
  viewerIsStaff,
}: {
  snapshot: { id: string };
  viewerIsStaff: boolean;
}): Promise<HydratedEntry[]> => {
  const whereEntries = {
    snapshotId: snapshot.id,
    deletedAt: null,
    ...(viewerIsStaff
      ? {}
      : {
          user: {
            showOnLeaderboard: true,
            status: { not: BANNED_STATUS },
          },
        }),
  } as const;

  const baseEntries = await prisma.leaderboardEntry.findMany({
    where: whereEntries,
    select: {
      userId: true,
      rank: true,
      score: true,
      solved: true,
      timePenalty: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
          country: true,
          role: true,
          status: true,
          showOnLeaderboard: true,
        },
      },
    },
    orderBy: { rank: "asc" },
  });

  const entryMap = new Map<string, HydratedEntry>();
  for (const entry of baseEntries) {
    entryMap.set(entry.userId, {
      ...mapEntry({
        rank: entry.rank,
        score: entry.score,
        solved: entry.solved,
        timePenalty: entry.timePenalty,
        user: entry.user,
      }),
      userId: entry.userId,
      baseRank: entry.rank,
      lastSolvedAt: entry.updatedAt ?? entry.createdAt ?? null,
    });
  }

  const deltaRows = await fetchRealtimeDeltaRows(snapshot.id);
  if (realtimeTableMissing) {
    return Array.from(entryMap.values());
  }

  const missingUserIds = deltaRows
    .filter((row) => !entryMap.has(row.userId))
    .map((row) => row.userId);
  const missingUsers = missingUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: missingUserIds } },
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
          country: true,
          role: true,
          status: true,
          showOnLeaderboard: true,
        },
      })
    : [];
  const missingUserMap = new Map(missingUsers.map((user) => [user.id, user]));

  for (const delta of deltaRows) {
    const scoreDelta = Number(delta._sum.score ?? 0);
    const solvedDelta = delta._count._all ?? 0;
    const lastSolvedAt = delta._max.createdAt ?? null;
    if (scoreDelta <= 0 && solvedDelta <= 0) {
      continue;
    }

    const existing = entryMap.get(delta.userId);
    if (existing) {
      existing.score += scoreDelta;
      existing.solved += solvedDelta;
      existing.lastSolvedAt = lastSolvedAt ?? existing.lastSolvedAt;
      continue;
    }
    const user = missingUserMap.get(delta.userId);
    if (!user) {
      continue;
    }
    if (!viewerIsStaff && (!user.showOnLeaderboard || user.status === BANNED_STATUS)) {
      continue;
    }
    entryMap.set(user.id, {
      rank: 0,
      score: scoreDelta,
      solved: solvedDelta,
      timePenalty: null,
      submissions: undefined,
      avgRuntimeMs: undefined,
      user: mapUser(user),
      userId: user.id,
      baseRank: Number.MAX_SAFE_INTEGER,
      lastSolvedAt,
    });
  }

  const ranked = Array.from(entryMap.values());
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.solved !== a.solved) return b.solved - a.solved;
    const aTime = a.lastSolvedAt?.getTime() ?? 0;
    const bTime = b.lastSolvedAt?.getTime() ?? 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.baseRank - b.baseRank;
  });

  ranked.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return ranked;
};

export const calculateRangeStart = (window: LeaderboardWindow) => {
  const now = new Date();
  switch (window) {
    case "weekly":
      return subDays(now, 7);
    case "monthly":
      return subDays(now, 30);
    default:
      return subDays(now, 365);
  }
};

export const difficultyScore = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
};

export const resolveDifficulty = (code?: string | null): keyof typeof difficultyScore =>
  code === "EASY" || code === "MEDIUM" || code === "HARD" ? code : "MEDIUM";

export async function getLeaderboardOverview(viewer?: { role?: UserRole | null }) {
  const viewerIsStaff = Boolean(viewer?.role && isStaffRole(viewer.role));
  const snapshots = await Promise.all(
    LEADERBOARD_WINDOWS.map((window) =>
      prisma.leaderboardSnapshot.findFirst({
        where: { window },
        orderBy: { periodStart: "desc" },
      }),
    ),
  );

  const results = await Promise.all(
    snapshots.map(async (snapshot, index) => {
      if (!snapshot) {
        return {
          window: LEADERBOARD_WINDOWS[index],
          periodStart: null,
          periodEnd: null,
          generatedAt: null,
          hero: [] as LeaderboardEntry[],
        };
      }
      const ranked = await buildRealtimeSnapshotRanking({ snapshot, viewerIsStaff });
      const hero = ranked.slice(0, 3).map((entry) => toPublicEntry(entry));
      return {
        window: snapshot.window as LeaderboardWindow,
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd ?? null,
        generatedAt: snapshot.generatedAt,
        hero,
      };
    }),
  );

  return results;
}

export async function getSnapshotLeaderboard(params: {
  window: LeaderboardWindow;
  limit?: number;
  cursor?: number;
  viewer?: { id?: string | null; role?: UserRole | null };
}): Promise<LeaderboardResponse> {
  const { window, limit = DEFAULT_LIMIT, cursor, viewer } = params;
  const viewerIsStaff = Boolean(viewer?.role && isStaffRole(viewer.role));

  const snapshot = await prisma.leaderboardSnapshot.findFirst({
    where: { window },
    orderBy: { periodStart: "desc" },
  });

  if (!snapshot) {
    return {
      window,
      periodStart: null,
      periodEnd: null,
      generatedAt: null,
      entries: [],
      hero: [],
      totalEntries: 0,
    };
  }

  const ranked = await buildRealtimeSnapshotRanking({ snapshot, viewerIsStaff });
  const paginated = cursor ? ranked.filter((entry) => entry.rank > cursor) : ranked;
  const slice = paginated.slice(0, limit);
  const nextCursor = paginated.length > limit ? slice[slice.length - 1]?.rank : undefined;
  const hero = ranked.slice(0, 3).map((entry) => toPublicEntry(entry));
  const viewerEntry = viewer?.id ? ranked.find((entry) => entry.userId === viewer.id) ?? null : null;
  const totalEntries = ranked.length;

  return {
    window,
    periodStart: snapshot.periodStart,
    periodEnd: snapshot.periodEnd ?? null,
    generatedAt: snapshot.generatedAt,
    entries: slice.map((entry) => toPublicEntry(entry)),
    hero,
    viewerEntry: viewerEntry ? toPublicEntry(viewerEntry) : null,
    nextCursor,
    totalEntries,
  };
}

type PracticeParams = {
  window: LeaderboardWindow;
  limit?: number;
  cursor?: number;
  viewer?: { id?: string | null; role?: UserRole | null };
};

type PracticeResult = LeaderboardResponse & { context: string };

export async function getDifficultyLeaderboard(params: PracticeParams & { difficulty: (typeof DIFFICULTIES)[number] }): Promise<PracticeResult> {
  const { difficulty } = params;
  const title = `${difficulty.charAt(0)}${difficulty.slice(1).toLowerCase()} leaderboard`;
  return buildPracticeLeaderboard({ ...params, problemFilter: { difficulty: { code: difficulty } }, title, context: difficulty });
}

export async function getTagLeaderboard(params: PracticeParams & { slug: string }): Promise<PracticeResult> {
  const tag = await prisma.tag.findUnique({ where: { slug: params.slug } });
  if (!tag) {
    return {
      window: params.window,
      periodStart: null,
      periodEnd: null,
      generatedAt: null,
      entries: [],
      hero: [],
      totalEntries: 0,
      context: params.slug,
      title: `#${params.slug}`,
      subtitle: "No tag data yet",
    };
  }
  const title = `#${tag.slug}`;
  const subtitle = tag.name;
  return buildPracticeLeaderboard({
    ...params,
    problemFilter: { tags: { some: { tagId: tag.id } } },
    title,
    subtitle,
    context: tag.slug,
  });
}

async function buildPracticeLeaderboard(params: PracticeParams & {
  problemFilter: Prisma.ProblemWhereInput;
  title: string;
  subtitle?: string;
  context: string;
}): Promise<PracticeResult> {
  const { window, problemFilter, cursor, limit = DEFAULT_LIMIT, viewer, title, subtitle, context } = params;
  const viewerIsStaff = Boolean(viewer?.role && isStaffRole(viewer.role));
  const rangeStart = calculateRangeStart(window);

  const problems = await prisma.problem.findMany({
    where: {
      ...problemFilter,
      deletedAt: null,
      state: "PUBLISHED",
      visibility: "PUBLIC",
    },
    select: {
      id: true,
      difficulty: { select: { code: true, weight: true } },
    },
  });

  if (problems.length === 0) {
    return {
      window,
      periodStart: rangeStart,
      periodEnd: new Date(),
      generatedAt: new Date(),
      entries: [],
      hero: [],
      totalEntries: 0,
      title,
      subtitle,
      context,
    };
  }

  const problemIds = problems.map((problem) => problem.id);
  const problemDifficulty = new Map(
    problems.map((problem) => [problem.id, resolveDifficulty(problem.difficulty?.code)]),
  );
  const problemWeight = new Map(
    problems.map((problem) => {
      const difficultyKey = resolveDifficulty(problem.difficulty?.code);
      const weight = problem.difficulty?.weight ?? difficultyScore[difficultyKey];
      return [problem.id, weight];
    }),
  );

  const submissions = await prisma.submission.findMany({
    where: {
      user: viewerIsStaff
        ? undefined
        : {
            showOnLeaderboard: true,
            status: { not: BANNED_STATUS },
          },
      verdictCode: { in: ACCEPTED_VERDICTS },
      createdAt: { gte: rangeStart },
      deletedAt: null,
      problemId: { in: problemIds },
    },
    select: {
      userId: true,
      problemId: true,
      score: true,
      timeUsedMs: true,
      createdAt: true,
    },
  });

  const stats = new Map<
    string,
    {
      solved: number;
      submissions: number;
      score: number;
      lastSolvedAt: Date | null;
      problemSet: Set<string>;
      runtimeSum: number;
    }
  >();

  for (const submission of submissions) {
    const entry = stats.get(submission.userId) ?? {
      solved: 0,
      submissions: 0,
      score: 0,
      lastSolvedAt: null,
      problemSet: new Set<string>(),
      runtimeSum: 0,
    };
    entry.submissions += 1;
    entry.runtimeSum += submission.timeUsedMs ?? 0;
    if (!entry.problemSet.has(submission.problemId)) {
      entry.problemSet.add(submission.problemId);
      entry.solved += 1;
      const difficultyKey = problemDifficulty.get(submission.problemId) ?? "MEDIUM";
      const weight =
        typeof submission.score === "number"
          ? submission.score
          : problemWeight.get(submission.problemId) ?? difficultyScore[difficultyKey];
      entry.score += weight;
    }
    if (!entry.lastSolvedAt || submission.createdAt > entry.lastSolvedAt) {
      entry.lastSolvedAt = submission.createdAt;
    }
    stats.set(submission.userId, entry);
  }

  const rows = Array.from(stats.entries()).map(([userId, value]) => ({
    userId,
    solved: value.solved,
    submissions: value.submissions,
    score: value.score,
    avgRuntimeMs: value.submissions ? value.runtimeSum / value.submissions : null,
    lastSolvedAt: value.lastSolvedAt,
  }));

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.solved !== a.solved) return b.solved - a.solved;
    if (a.lastSolvedAt && b.lastSolvedAt) {
      return b.lastSolvedAt.getTime() - a.lastSolvedAt.getTime();
    }
    return 0;
  });

  let rank = 1;
  const ranked = rows.map((row) => ({ ...row, rank: rank++ }));

  const paginated = cursor ? ranked.filter((row) => row.rank > cursor) : ranked;
  const sliced = paginated.slice(0, limit);
  const nextCursor = paginated.length > limit ? sliced[sliced.length - 1]?.rank : undefined;

  const userIds = sliced.map((row) => row.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
          country: true,
          role: true,
          status: true,
        },
      })
    : [];
  const userMap = new Map(users.map((user) => [user.id, user]));

  const entries = sliced
    .map((row) => {
      const user = userMap.get(row.userId);
      if (!user) {
        return null;
      }
      return mapEntry({
        rank: row.rank,
        score: row.score,
        solved: row.solved,
        submissions: row.submissions,
        avgRuntimeMs: row.avgRuntimeMs,
        user,
      });
    })
    .filter((entry): entry is LeaderboardEntry => Boolean(entry));

  const heroRows = ranked.slice(0, 3);
  const heroUsers = heroRows.length
    ? await prisma.user.findMany({
        where: { id: { in: heroRows.map((row) => row.userId) } },
        select: {
          id: true,
          handle: true,
          name: true,
          avatarUrl: true,
          country: true,
          role: true,
          status: true,
        },
      })
    : [];
  const heroUserMap = new Map(heroUsers.map((user) => [user.id, user]));
  const heroEntries = heroRows
    .map((row) => {
      const heroUser = heroUserMap.get(row.userId);
      if (!heroUser) {
        return null;
      }
      return mapEntry({
        rank: row.rank,
        score: row.score,
        solved: row.solved,
        user: heroUser,
      });
    })
    .filter((entry): entry is LeaderboardEntry => Boolean(entry));

  const viewerRow = viewer?.id ? ranked.find((row) => row.userId === viewer.id) : undefined;
  let viewerUser = viewerRow ? userMap.get(viewerRow.userId) : undefined;
  if (viewerRow && !viewerUser) {
    viewerUser = await prisma.user.findUnique({
      where: { id: viewerRow.userId },
      select: {
        id: true,
        handle: true,
        name: true,
        avatarUrl: true,
        country: true,
        role: true,
        status: true,
      },
    }) ?? undefined;
  }
  const viewerEntry = viewerRow && viewerUser
    ? mapEntry({
        rank: viewerRow.rank,
        score: viewerRow.score,
        solved: viewerRow.solved,
        submissions: viewerRow.submissions,
        avgRuntimeMs: viewerRow.avgRuntimeMs,
        user: viewerUser,
      })
    : undefined;

  return {
    window,
    periodStart: rangeStart,
    periodEnd: new Date(),
    generatedAt: new Date(),
    entries,
    hero: heroEntries,
    viewerEntry,
    nextCursor,
    totalEntries: ranked.length,
    title,
    subtitle,
    context,
  };
}
