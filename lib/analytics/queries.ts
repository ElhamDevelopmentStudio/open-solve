import { prisma } from "@/lib/prisma";
import { subHours } from "date-fns";

const DEFAULT_WINDOW_HOURS = 168; // 7 days

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === "object") {
    const candidate = value as { toNumber?: () => number; valueOf?: () => unknown };
    if (typeof candidate.toNumber === "function") {
      return candidate.toNumber();
    }
    if (typeof candidate.valueOf === "function") {
      const result = candidate.valueOf();
      if (typeof result === "number") {
        return Number.isNaN(result) ? null : result;
      }
    }
  }
  const fallback = Number(value);
  return Number.isNaN(fallback) ? null : fallback;
};

export type ProblemInsightSummary = {
  problemId: string;
  slug: string;
  title: string;
  difficulty?: string | null;
  views: number;
  bounceRate: number;
  solveIntentRate: number;
  hintUsageRate: number;
  firstTryAcRate: number;
  stuckRate: number;
  languageSwitchRate: number;
  pasteRate: number;
  medianTimeToAcMs: number | null;
  avgAttemptsToAc: number | null;
};

export type AnalyticsOverview = {
  windowHours: number;
  totals: {
    views: number;
    uniqueSessions: number;
    bounceRate: number;
    solveIntentRate: number;
    hintUsageRate: number;
    stuckRate: number;
    languageSwitchRate: number;
    pasteRate: number;
    avgTimeToFirstInteractionMs: number | null;
  };
  devices: Array<{ deviceType: string; count: number }>;
  errorCounts: {
    clientErrors: number;
    networkErrors: number;
  };
};

export async function computeProblemAnalyticsSnapshots(
  windowHours = DEFAULT_WINDOW_HOURS,
  limit = 6,
): Promise<ProblemInsightSummary[]> {
  const windowStart = subHours(new Date(), windowHours);

  const topProblemsRaw = await prisma.analyticsEvent.groupBy({
    by: ["problemId"],
    where: {
      eventName: "problem.view_enter",
      problemId: { not: null },
      createdAt: { gte: windowStart },
    },
    _count: { _all: true },
  });

  const topProblems = topProblemsRaw
    .filter((entry) => entry.problemId)
    .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
    .slice(0, limit);

  if (topProblems.length === 0) {
    return [];
  }

  const problemViews = new Map(
    topProblems
      .filter((entry) => entry.problemId)
      .map((entry) => [entry.problemId as string, entry._count._all]),
  );
  const problemIds = Array.from(problemViews.keys());

  const [problemRecords, summaries] = await Promise.all([
    prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: {
        id: true,
        slug: true,
        difficulty: { select: { code: true } },
        currentVersion: { select: { title: true } },
      },
    }),
    Promise.all(
      problemIds.map((problemId) =>
        summarizeProblem(problemId, windowStart, problemViews.get(problemId) ?? 0),
      ),
    ),
  ]);

  const metadata = new Map(
    problemRecords.map((record) => [
      record.id,
      {
        slug: record.slug,
        title: record.currentVersion?.title ?? record.slug,
        difficulty: record.difficulty?.code ?? null,
      },
    ]),
  );

  const hydrated = summaries
    .map((summary) => {
      const meta = metadata.get(summary.problemId);
      if (!meta) {
        return null;
      }
      return {
        ...summary,
        ...meta,
      };
    })
    .filter(Boolean) as ProblemInsightSummary[];

  await Promise.all(
    hydrated.map((summary) =>
      prisma.problemAnalyticsSnapshot.upsert({
        where: {
          problemId_windowHours: {
            problemId: summary.problemId,
            windowHours,
          },
        },
        update: {
          metrics: summary,
          computedAt: new Date(),
        },
        create: {
          problemId: summary.problemId,
          windowHours,
          metrics: summary,
        },
      }),
    ),
  );

  return hydrated;
}

export async function computeAnalyticsOverview(
  windowHours = DEFAULT_WINDOW_HOURS,
): Promise<AnalyticsOverview> {
  const windowStart = subHours(new Date(), windowHours);

  const [
    viewCount,
    bounceCount,
    solveClicks,
    hintOpens,
    stuckCount,
    languageSwitches,
    pasteEvents,
    uniqueSessionRows,
    firstInteractionRows,
    deviceGroups,
    clientErrors,
    networkErrors,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { eventName: "problem.view_enter", createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "problem.bounce_detected", createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "problem.solve_clicked", createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "problem.hint_opened", createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "problem.stuck", createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "editor.language_switch", createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "editor.paste", createdAt: { gte: windowStart } },
    }),
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT "sessionId")::int AS count
      FROM "AnalyticsEvent"
      WHERE "eventName" = 'problem.view_enter'
        AND "createdAt" >= ${windowStart}
    `,
    prisma.$queryRaw<{ avg: number }[]>`
      SELECT AVG((payload->>'timeToFirstInteractionMs')::numeric) AS avg
      FROM "AnalyticsEvent"
      WHERE "eventName" = 'problem.first_interaction'
        AND "createdAt" >= ${windowStart}
    `,
    prisma.analyticsEvent.groupBy({
      by: ["deviceType"],
      where: { eventName: "session.device_info", createdAt: { gte: windowStart } },
      _count: { _all: true },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "client.error", createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "network.request_failed", createdAt: { gte: windowStart } },
    }),
  ]);

  const views = viewCount || 1; // prevent division by zero
  const totals = {
    views: viewCount,
    uniqueSessions: toNumber(uniqueSessionRows[0]?.count) ?? 0,
    bounceRate: bounceCount / views,
    solveIntentRate: solveClicks / views,
    hintUsageRate: hintOpens / views,
    stuckRate: stuckCount / views,
    languageSwitchRate: languageSwitches / views,
    pasteRate: pasteEvents / views,
    avgTimeToFirstInteractionMs: toNumber(firstInteractionRows[0]?.avg),
  };

  const devices = deviceGroups
    .filter((group) => group.deviceType)
    .map((group) => ({
      deviceType: group.deviceType ?? "unknown",
      count: group._count._all,
    }));

  return {
    windowHours,
    totals,
    devices,
    errorCounts: {
      clientErrors,
      networkErrors,
    },
  };
}

async function summarizeProblem(problemId: string, windowStart: Date, views: number) {
  const safeViews = views || 1;

  const [
    bounceCount,
    solveClicks,
    hintOpens,
    firstAcTotal,
    firstTryRows,
    stuckCount,
    languageSwitches,
    pasteEvents,
    medianRows,
    avgAttemptsRows,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { eventName: "problem.bounce_detected", problemId, createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "problem.solve_clicked", problemId, createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "problem.hint_opened", problemId, createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "problem.first_ac", problemId, createdAt: { gte: windowStart } },
    }),
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM "AnalyticsEvent"
      WHERE "eventName" = 'problem.first_ac'
        AND "problemId" = ${problemId}
        AND "createdAt" >= ${windowStart}
        AND (payload->>'attemptsCount')::int = 1
    `,
    prisma.analyticsEvent.count({
      where: { eventName: "problem.stuck", problemId, createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "editor.language_switch", problemId, createdAt: { gte: windowStart } },
    }),
    prisma.analyticsEvent.count({
      where: { eventName: "editor.paste", problemId, createdAt: { gte: windowStart } },
    }),
    prisma.$queryRaw<{ median: number }[]>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY (payload->>'timeFromFirstViewMs')::numeric) AS median
      FROM "AnalyticsEvent"
      WHERE "eventName" = 'problem.first_ac'
        AND "problemId" = ${problemId}
        AND "createdAt" >= ${windowStart}
    `,
    prisma.$queryRaw<{ avg: number }[]>`
      SELECT AVG((payload->>'attemptsCount')::numeric) AS avg
      FROM "AnalyticsEvent"
      WHERE "eventName" = 'problem.first_ac'
        AND "problemId" = ${problemId}
        AND "createdAt" >= ${windowStart}
    `,
  ]);

  const firstTryCount = toNumber(firstTryRows[0]?.count) ?? 0;

  return {
    problemId,
    views,
    bounceRate: bounceCount / safeViews,
    solveIntentRate: solveClicks / safeViews,
    hintUsageRate: hintOpens / safeViews,
    firstTryAcRate: firstAcTotal ? firstTryCount / firstAcTotal : 0,
    stuckRate: stuckCount / safeViews,
    languageSwitchRate: languageSwitches / safeViews,
    pasteRate: pasteEvents / safeViews,
    medianTimeToAcMs: toNumber(medianRows[0]?.median),
    avgAttemptsToAc: toNumber(avgAttemptsRows[0]?.avg),
  };
}
