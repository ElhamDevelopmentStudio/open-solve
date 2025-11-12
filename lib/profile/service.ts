import { subDays, startOfDay } from "date-fns";
import type { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACCEPTED_VERDICTS } from "@/lib/submissions/constants";
import { isStaffRole } from "@/lib/auth/permissions";
import type { ProfileSettingsInput } from "@/lib/validators/profile";
import { sanitizePlainInput } from "@/lib/security/markdown";

export type ProfileSocialLinks = {
  github?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  website?: string | null;
};

export type ProfileHeatmapCell = {
  date: string;
  count: number;
};

export type ProfileRecentSolve = {
  id: string;
  createdAt: Date;
  languageCode: string;
  runtimeMs: number | null;
  problem: {
    slug: string;
    title: string;
    difficulty?: string | null;
  };
};

export type ProfileBadge = {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  awardedAt: Date;
};

export type ProfileDetail = {
  id: string;
  handle: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  status: UserStatus;
  country: string | null;
  timezone: string | null;
  showCountry: boolean;
  showSocials: boolean;
  showOnLeaderboard: boolean;
  shareAcceptedCode: boolean;
  socials: ProfileSocialLinks;
  stats: {
    totalSolved: number;
    attemptedProblems: number;
    acceptanceRate: number;
    solvedByDifficulty: Array<{ difficulty: string; count: number }>;
    solvedByTag: Array<{ slug: string; name: string; count: number }>;
    favoriteLanguage: { code: string; displayName: string | null; count: number } | null;
    languages: Array<{ code: string; displayName: string | null; count: number }>;
    streak: {
      current: number;
      best: number;
      calendar: ProfileHeatmapCell[];
    };
    hourlyActivity: Array<{ hour: number; count: number }>;
    recentSolves: ProfileRecentSolve[];
    firstAcceptedAt: Date | null;
    lastAcceptedAt: Date | null;
  };
  attempts: {
    solved: number;
    attempted: number;
  };
  badges: ProfileBadge[];
  permissions: {
    isOwner: boolean;
    isStaff: boolean;
  };
  staffInsights?: {
    rapidSolveSpike: boolean;
    last24hAccepted: number;
    manualReviewCount: number;
    shadowBanned: boolean;
  };
  privacySettings?: ProfileSettingsInput;
};

const DAY_MS = 86_400_000;
const HEATMAP_DAYS = 168;
const ACTIVITY_WINDOW_DAYS = 30;
const CALENDAR_WINDOW_DAYS = 365;

const sanitizeSocial = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = sanitizePlainInput(value, 120);
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("@")) {
    return `https://twitter.com/${trimmed.slice(1)}`;
  }
  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

const buildHeatmap = (dates: Date[]): { calendar: ProfileHeatmapCell[]; best: number; current: number } => {
  const now = new Date();
  const counts = new Map<number, number>();
  for (const timestamp of dates) {
    const key = startOfDay(timestamp).getTime();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const calendar: ProfileHeatmapCell[] = [];
  const start = startOfDay(subDays(now, HEATMAP_DAYS - 1)).getTime();
  for (let i = 0; i < HEATMAP_DAYS; i += 1) {
    const key = start + i * DAY_MS;
    calendar.push({ date: new Date(key).toISOString(), count: counts.get(key) ?? 0 });
  }

  const sorted = Array.from(counts.keys()).sort((a, b) => a - b);
  let best = 0;
  let currentRun = 0;
  let prev: number | null = null;
  for (const value of sorted) {
    if (prev === null || value - prev === DAY_MS) {
      currentRun = prev === null ? 1 : currentRun + 1;
    } else if (value === prev) {
      // same day, ignore
    } else {
      currentRun = 1;
    }
    best = Math.max(best, currentRun);
    prev = value;
  }

  let current = 0;
  let cursor = startOfDay(now).getTime();
  while (counts.has(cursor)) {
    current += 1;
    cursor -= DAY_MS;
  }

  return { calendar, best, current };
};

const buildHourlyBuckets = (dates: Date[]): Array<{ hour: number; count: number }> => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const cutoff = subDays(new Date(), ACTIVITY_WINDOW_DAYS).getTime();
  for (const timestamp of dates) {
    if (timestamp.getTime() < cutoff) continue;
    const hour = timestamp.getHours();
    buckets[hour].count += 1;
  }
  return buckets;
};

const mapSocials = (user: {
  socialGithub: string | null;
  socialLinkedin: string | null;
  socialTwitter: string | null;
  socialWebsite: string | null;
}): ProfileSocialLinks => ({
  github: user.socialGithub,
  linkedin: user.socialLinkedin,
  twitter: user.socialTwitter,
  website: user.socialWebsite,
});

export async function getProfileDetail(handle: string, viewer?: { id?: string | null; role?: UserRole | null }): Promise<ProfileDetail | null> {
  const user = await prisma.user.findUnique({
    where: { handle },
    select: {
      id: true,
      handle: true,
      name: true,
      avatarUrl: true,
      bio: true,
      role: true,
      status: true,
      country: true,
      timezone: true,
      showCountry: true,
      showSocials: true,
      showOnLeaderboard: true,
      shareAcceptedCode: true,
      socialGithub: true,
      socialLinkedin: true,
      socialTwitter: true,
      socialWebsite: true,
    },
  });

  if (!user) {
    return null;
  }

  const viewerId = viewer?.id ?? null;
  const viewerRole = viewer?.role ?? null;
  const isOwner = Boolean(viewerId && viewerId === user.id);
  const isStaff = Boolean(viewerRole && isStaffRole(viewerRole));

  if (user.status === "BANNED" && !isOwner && !isStaff) {
    return null;
  }

  const acceptedWhere: Prisma.SubmissionWhereInput = {
    userId: user.id,
    deletedAt: null,
    verdictCode: { in: ACCEPTED_VERDICTS },
  };

  const calendarWindowStart = subDays(new Date(), CALENDAR_WINDOW_DAYS);

  const [attemptedProblems, solvedProblems, languagesAgg, acceptedTimestamps, recentSolves, firstAccepted, lastAccepted, badgeAwards, manualReviewCount, last24hAccepted] = await Promise.all([
    prisma.submission.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { problemId: true },
      distinct: ["problemId"],
    }),
    prisma.problem.findMany({
      where: {
        deletedAt: null,
        submissions: {
          some: {
            userId: user.id,
            deletedAt: null,
            verdictCode: { in: ACCEPTED_VERDICTS },
          },
        },
      },
      select: {
        id: true,
        difficulty: { select: { code: true, weight: true } },
        tags: { select: { tag: { select: { slug: true, name: true } } } },
      },
    }),
    prisma.submission.groupBy({
      by: ["languageCode"],
      where: acceptedWhere,
      _count: { _all: true },
    }),
    prisma.submission.findMany({
      where: {
        ...acceptedWhere,
        createdAt: { gte: calendarWindowStart },
      },
      select: { createdAt: true },
    }),
    prisma.submission.findMany({
      where: {
        ...acceptedWhere,
        ...(isOwner || isStaff ? {} : { hiddenFromProfile: false }),
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        timeUsedMs: true,
        languageCode: true,
        problem: {
          select: {
            slug: true,
            currentVersion: { select: { title: true } },
            difficulty: { select: { code: true } },
          },
        },
      },
    }),
    prisma.submission.findFirst({
      where: acceptedWhere,
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.submission.findFirst({
      where: acceptedWhere,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.badgeAward.findMany({
      where: { userId: user.id },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    }),
    prisma.submission.count({
      where: { userId: user.id, requiresManualReview: true },
    }),
    prisma.submission.count({
      where: {
        ...acceptedWhere,
        createdAt: { gte: subDays(new Date(), 1) },
      },
    }),
  ]);

  const solvedCount = solvedProblems.length;
  const attemptedCount = attemptedProblems.length;
  const acceptanceRate = attemptedCount === 0 ? 0 : solvedCount / attemptedCount;

  const difficultyCounts: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const tagCounts = new Map<string, { slug: string; name: string; count: number }>();

  for (const problem of solvedProblems) {
    const difficulty = problem.difficulty?.code ?? "MEDIUM";
    difficultyCounts[difficulty] = (difficultyCounts[difficulty] ?? 0) + 1;
    for (const tag of problem.tags) {
      const existing = tagCounts.get(tag.tag.slug);
      if (existing) {
        existing.count += 1;
      } else {
        tagCounts.set(tag.tag.slug, { slug: tag.tag.slug, name: tag.tag.name, count: 1 });
      }
    }
  }

  const solvedByDifficulty = Object.entries(difficultyCounts).map(([difficulty, count]) => ({
    difficulty,
    count,
  }));

  const solvedByTag = Array.from(tagCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const languageCodes = languagesAgg.map((lang) => lang.languageCode);
  const languageRecords = languageCodes.length
    ? await prisma.language.findMany({
        where: { code: { in: languageCodes } },
        select: { code: true, displayName: true },
      })
    : [];
  const languageNameMap = new Map(languageRecords.map((language) => [language.code, language.displayName]));
  const languages = languagesAgg
    .map((language) => ({
      code: language.languageCode,
      displayName: languageNameMap.get(language.languageCode) ?? null,
      count: language._count._all,
    }))
    .sort((a, b) => b.count - a.count);
  const favoriteLanguage = languages[0] ?? null;

  const timestamps = acceptedTimestamps.map((entry) => entry.createdAt);
  const { calendar, best, current } = buildHeatmap(timestamps);
  const hourlyActivity = buildHourlyBuckets(timestamps);

  const recentSolvesFormatted: ProfileRecentSolve[] = recentSolves.map((solve) => ({
    id: solve.id,
    createdAt: solve.createdAt,
    languageCode: solve.languageCode,
    runtimeMs: solve.timeUsedMs ?? null,
    problem: {
      slug: solve.problem.slug,
      title: solve.problem.currentVersion?.title ?? solve.problem.slug,
      difficulty: solve.problem.difficulty?.code ?? null,
    },
  }));

  const badges: ProfileBadge[] = badgeAwards.map((award) => ({
    slug: award.badge.slug,
    name: award.badge.name,
    description: award.badge.description,
    icon: award.badge.icon,
    awardedAt: award.awardedAt,
  }));

  const stats = {
    totalSolved: solvedCount,
    attemptedProblems: attemptedCount,
    acceptanceRate,
    solvedByDifficulty,
    solvedByTag,
    favoriteLanguage,
    languages,
    streak: {
      best,
      current,
      calendar,
    },
    hourlyActivity,
    recentSolves: recentSolvesFormatted,
    firstAcceptedAt: firstAccepted?.createdAt ?? null,
    lastAcceptedAt: lastAccepted?.createdAt ?? null,
  };

  const insights = isStaff
    ? {
        rapidSolveSpike: last24hAccepted >= 20,
        last24hAccepted,
        manualReviewCount,
        shadowBanned: user.status === "SHADOW_BANNED",
      }
    : undefined;

  const socials = mapSocials(user);
  const privacySettings: ProfileSettingsInput | undefined = isOwner || isStaff
    ? {
        shareAcceptedCode: user.shareAcceptedCode,
        showOnLeaderboard: user.showOnLeaderboard,
        showCountry: user.showCountry,
        showSocials: user.showSocials,
        socials,
      }
    : undefined;

  return {
    id: user.id,
    handle: user.handle,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    status: user.status,
    country: user.country,
    timezone: user.timezone,
    showCountry: user.showCountry,
    showSocials: user.showSocials,
    showOnLeaderboard: user.showOnLeaderboard,
    shareAcceptedCode: user.shareAcceptedCode,
    socials,
    stats,
    attempts: {
      solved: solvedCount,
      attempted: attemptedCount,
    },
    badges,
    permissions: {
      isOwner,
      isStaff,
    },
    staffInsights: insights,
    privacySettings,
  };
}

export async function updateProfileSettings(userId: string, input: ProfileSettingsInput) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      shareAcceptedCode: input.shareAcceptedCode,
      showOnLeaderboard: input.showOnLeaderboard,
      showCountry: input.showCountry,
      showSocials: input.showSocials,
      socialGithub: sanitizeSocial(input.socials.github),
      socialLinkedin: sanitizeSocial(input.socials.linkedin),
      socialTwitter: sanitizeSocial(input.socials.twitter),
      socialWebsite: sanitizeSocial(input.socials.website),
    },
  });
}
