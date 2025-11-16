import { contestSettingsSchema, type ContestSettings } from "@/lib/contests/schema";

export const defaultContestSettings: ContestSettings = {
  registration: {
    mode: "open",
    capacity: null,
    requireVerifiedEmail: true,
    allowedCountries: [],
    accessCodeHash: null,
    allowVirtual: true,
    waitlistEnabled: false,
  },
  schedule: {
    perUserTimer: false,
    graceMinutes: 10,
    allowLateJoin: true,
    lateJoinCutoffMinutes: 30,
  },
  freeze: {
    enabled: true,
    mode: "icpc",
    offsetMinutes: 20,
    topN: null,
    showSelfDuringFreeze: true,
  },
  scoring: {
    mode: "ICPC",
    icpcPenaltyMinutes: 20,
    cfPenalty: 50,
    cfTimeDecay: 1,
    atcoderBonus: 0,
    customBasePoints: 500,
    customAttemptPenalty: 25,
    customTimeDecay: 2,
    tieBreakers: ["solved", "points", "penalty", "lastSolve"],
  },
  scoreboard: {
    visibility: "full",
    refreshIntervalSec: 15,
    highlightFirstSolve: true,
    showPenaltyColumn: true,
    showVirtualBadge: true,
  },
  feedback: {
    visibility: "status",
    showRuntime: false,
    showMemory: false,
    unlockOnUpsolve: true,
    hideFailedCaseDetails: true,
  },
  antiCheat: {
    enabled: false,
    lockDiscussions: true,
    lockProfiles: true,
    lockTrails: true,
    enforceIp: true,
    similarityReview: true,
    throttlePerMinute: 3,
    examMode: {
      enabled: false,
      disableSelection: true,
      disableContextMenu: true,
      stickyReminder: true,
    },
    focus: {
      softWarningTabs: 3,
      flagTabs: 6,
      autoDQTabs: 12,
      softWarningOutMs: 60_000,
      flagOutMs: 180_000,
    },
    multiDevice: {
      singleDeviceOnly: true,
      allowSecondaryFlagged: false,
      requireLock: false,
    },
    paste: {
      largePasteThreshold: 120,
      perProblemLimit: 3,
      perContestLimit: 12,
    },
    heuristics: {
      enableTiming: true,
      enableSimilarity: true,
      enableClusters: true,
      enableSuspiciousTimeline: true,
    },
    warnings: {
      reminderCopy: "Anti-cheat guard active.",
      showParticipantBanner: true,
    },
  },
  problemSet: {
    randomizeOrder: false,
    showTags: false,
    showDifficulty: false,
    showAcceptance: false,
    defaultAttempts: null,
  },
  postContest: {
    autoUnfreeze: true,
    autoReleaseEditorial: true,
    enableUpsolve: true,
    unlockDiscussions: true,
    releaseHiddenCases: false,
  },
  virtual: {
    enabled: true,
    cooldownHours: 24,
    maxConcurrent: 1,
  },
  clarifications: {
    allowPublicReplies: true,
    broadcastDefaults: false,
  },
};

type DeepPartial<T> = T extends Record<string, unknown>
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T | undefined;

function deepMerge<T extends Record<string, unknown>>(base: T, override: DeepPartial<T>): T {
  const output: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override ?? {})) {
    const value = override?.[key as keyof typeof override];
    if (value === undefined) {
      continue;
    }
    const baseValue = (base as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      output[key] = value as unknown;
      continue;
    }
    if (
      value &&
      typeof value === "object" &&
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      output[key] = deepMerge(baseValue as Record<string, unknown>, value as Record<string, unknown>);
      continue;
    }
    output[key] = value as unknown;
  }
  return output as T;
}

const contestSettingsOverridesSchema = contestSettingsSchema.deepPartial();

export function resolveContestSettings(settings?: unknown): ContestSettings {
  if (!settings) {
    return defaultContestSettings;
  }
  const parsed = contestSettingsOverridesSchema.safeParse(settings);
  if (!parsed.success) {
    return defaultContestSettings;
  }
  return deepMerge(defaultContestSettings, parsed.data as DeepPartial<ContestSettings>) as ContestSettings;
}
