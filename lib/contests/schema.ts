import { z } from "zod";
import { ContestRuleset, ContestType, ContestVisibility } from "@prisma/client";

export const CONTEST_REGISTRATION_MODES = ["open", "invite", "password"] as const;
export type ContestRegistrationMode = (typeof CONTEST_REGISTRATION_MODES)[number];

export const CONTEST_SCOREBOARD_VISIBILITY = ["full", "top", "self", "hidden"] as const;
export type ContestScoreboardVisibility = (typeof CONTEST_SCOREBOARD_VISIBILITY)[number];

export const CONTEST_FEEDBACK_VISIBILITY = ["hidden", "status", "full", "post"] as const;
export type ContestFeedbackVisibility = (typeof CONTEST_FEEDBACK_VISIBILITY)[number];

export const CONTEST_FREEZE_MODES = ["icpc", "hideAttempts", "lockAll", "topN", "none"] as const;
export type ContestFreezeMode = (typeof CONTEST_FREEZE_MODES)[number];

export const CONTEST_TIE_BREAKERS = [
  "solved",
  "points",
  "penalty",
  "lastSolve",
  "firstSolve",
  "fastest",
  "attempts",
  "random",
] as const;
export type ContestTieBreaker = (typeof CONTEST_TIE_BREAKERS)[number];

export const contestProblemSettingsSchema = z.object({
  attemptsLimit: z.number().int().min(1).max(50).nullable().default(null),
  allowedLanguages: z.array(z.string()).max(10).default([]),
  visibility: z.enum(["default", "hidden", "locked"]).default("default"),
  scoringWeight: z.number().min(0).max(10).default(1),
  notes: z.string().max(280).nullable().optional(),
});

export const contestSettingsSchema = z.object({
  registration: z.object({
    mode: z.enum(CONTEST_REGISTRATION_MODES).default("open"),
    capacity: z.number().int().min(1).max(100000).nullable().default(null),
    requireVerifiedEmail: z.boolean().default(true),
    allowedCountries: z.array(z.string()).max(50).default([]),
    accessCodeHash: z.string().nullable().optional(),
    allowVirtual: z.boolean().default(true),
    waitlistEnabled: z.boolean().default(false),
  }),
  schedule: z.object({
    perUserTimer: z.boolean().default(false),
    graceMinutes: z.number().int().min(0).max(60).default(10),
    allowLateJoin: z.boolean().default(true),
    lateJoinCutoffMinutes: z.number().int().min(0).max(360).nullable().default(30),
  }),
  freeze: z.object({
    enabled: z.boolean().default(true),
    mode: z.enum(CONTEST_FREEZE_MODES).default("icpc"),
    offsetMinutes: z.number().int().min(0).max(180).default(20),
    topN: z.number().int().min(1).max(500).nullable().default(null),
    showSelfDuringFreeze: z.boolean().default(true),
  }),
  scoring: z.object({
    mode: z.nativeEnum(ContestRuleset).default("ICPC"),
    icpcPenaltyMinutes: z.number().int().min(0).max(60).default(20),
    cfPenalty: z.number().int().min(0).max(100).default(50),
    cfTimeDecay: z.number().int().min(0).max(5).default(1),
    atcoderBonus: z.number().int().min(0).max(100).default(0),
    customBasePoints: z.number().int().min(0).max(2000).default(500),
    customAttemptPenalty: z.number().int().min(0).max(200).default(25),
    customTimeDecay: z.number().int().min(0).max(50).default(2),
    tieBreakers: z.array(z.enum(CONTEST_TIE_BREAKERS)).min(1).default(["solved", "points", "penalty", "lastSolve"]),
  }),
  scoreboard: z.object({
    visibility: z.enum(CONTEST_SCOREBOARD_VISIBILITY).default("full"),
    refreshIntervalSec: z.number().int().min(5).max(120).default(15),
    highlightFirstSolve: z.boolean().default(true),
    showPenaltyColumn: z.boolean().default(true),
    showVirtualBadge: z.boolean().default(true),
  }),
  feedback: z.object({
    visibility: z.enum(CONTEST_FEEDBACK_VISIBILITY).default("status"),
    showRuntime: z.boolean().default(false),
    showMemory: z.boolean().default(false),
    unlockOnUpsolve: z.boolean().default(true),
    hideFailedCaseDetails: z.boolean().default(true),
  }),
  antiCheat: z.object({
    enabled: z.boolean().default(false),
    lockDiscussions: z.boolean().default(true),
    lockProfiles: z.boolean().default(true),
    lockTrails: z.boolean().default(true),
    enforceIp: z.boolean().default(true),
    similarityReview: z.boolean().default(true),
    throttlePerMinute: z.number().int().min(1).max(30).default(3),
    examMode: z
      .object({
        enabled: z.boolean().default(false),
        disableSelection: z.boolean().default(true),
        disableContextMenu: z.boolean().default(true),
        stickyReminder: z.boolean().default(true),
      })
      .default({}),
    focus: z
      .object({
        softWarningTabs: z.number().int().min(1).max(50).default(3),
        flagTabs: z.number().int().min(1).max(100).default(6),
        autoDQTabs: z.number().int().min(1).max(200).nullable().default(12),
        softWarningOutMs: z.number().int().min(1_000).max(600_000).default(60_000),
        flagOutMs: z.number().int().min(1_000).max(1_200_000).default(180_000),
      })
      .default({}),
    multiDevice: z
      .object({
        singleDeviceOnly: z.boolean().default(true),
        allowSecondaryFlagged: z.boolean().default(false),
        requireLock: z.boolean().default(false),
      })
      .default({}),
    paste: z
      .object({
        largePasteThreshold: z.number().int().min(32).max(5000).default(120),
        perProblemLimit: z.number().int().min(1).max(20).default(3),
        perContestLimit: z.number().int().min(1).max(200).default(12),
      })
      .default({}),
    heuristics: z
      .object({
        enableTiming: z.boolean().default(true),
        enableSimilarity: z.boolean().default(true),
        enableClusters: z.boolean().default(true),
        enableSuspiciousTimeline: z.boolean().default(true),
      })
      .default({}),
    warnings: z
      .object({
        reminderCopy: z.string().max(240).default("Anti-cheat guard active."),
        showParticipantBanner: z.boolean().default(true),
      })
      .default({}),
  }),
  problemSet: z.object({
    randomizeOrder: z.boolean().default(false),
    showTags: z.boolean().default(false),
    showDifficulty: z.boolean().default(false),
    showAcceptance: z.boolean().default(false),
    defaultAttempts: z.number().int().min(1).max(50).nullable().default(null),
  }),
  postContest: z.object({
    autoUnfreeze: z.boolean().default(true),
    autoReleaseEditorial: z.boolean().default(true),
    enableUpsolve: z.boolean().default(true),
    unlockDiscussions: z.boolean().default(true),
    releaseHiddenCases: z.boolean().default(false),
  }),
  virtual: z.object({
    enabled: z.boolean().default(true),
    cooldownHours: z.number().int().min(0).max(240).default(24),
    maxConcurrent: z.number().int().min(1).max(5).default(1),
  }),
  clarifications: z.object({
    allowPublicReplies: z.boolean().default(true),
    broadcastDefaults: z.boolean().default(false),
  }),
});

export type ContestSettings = z.infer<typeof contestSettingsSchema>;
export type ContestProblemSettings = z.infer<typeof contestProblemSettingsSchema>;

export const contestProblemInputSchema = z.object({
  problemId: z.string(),
  label: z.string().min(1).max(3),
  order: z.number().int().min(1),
  points: z.number().int().min(0).max(2000).default(0),
  settings: contestProblemSettingsSchema.optional(),
});

export const contestBuilderSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(6).max(120),
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, digits, and hyphens allowed"),
  description: z.string().max(2000).nullable().optional(),
  type: z.nativeEnum(ContestType).default("COMPETITIVE"),
  visibility: z.nativeEnum(ContestVisibility).default("PUBLIC"),
  rules: z.nativeEnum(ContestRuleset).default("ICPC"),
  isRated: z.boolean().default(true),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  freezeAt: z.coerce.date().nullable().optional(),
  settings: contestSettingsSchema.deepPartial().optional(),
  problems: z.array(contestProblemInputSchema).min(1),
});

export type ContestBuilderValues = z.infer<typeof contestBuilderSchema>;
