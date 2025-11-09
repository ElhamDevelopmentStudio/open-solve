import type {
  ClarificationStatus,
  ClarificationVisibility,
  Contest,
  ContestProblem,
  ContestRegistration,
  ContestRuleset,
  ContestState,
  ContestType,
  ContestVisibility,
  ContestRegistrationStatus,
  User,
} from "@prisma/client";
import type { ContestProblemSettings, ContestSettings } from "@/lib/contests/schema";

export type ContestProblemSummary = {
  id: string;
  label: string;
  order: number;
  points: number | null;
  slug: string;
  title: string;
  difficulty?: string | null;
  tags?: string[];
  settings: ContestProblemSettings;
};

export type ContestRegistrationStatusPayload = {
  id: string;
  status: ContestRegistrationStatus;
  isVirtual: boolean;
  isDisqualified: boolean;
  joinedAt: Date;
};

export type ContestSummary = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  type: ContestType;
  visibility: ContestVisibility;
  rules: ContestRuleset;
  isRated: boolean;
  startsAt: Date;
  endsAt: Date;
  freezeAt?: Date | null;
  state: ContestState;
  problemCount: number;
  registrationCount: number;
  settings: ContestSettings;
  viewerRegistration?: ContestRegistrationStatusPayload | null;
};

export type ContestOverviewPayload = {
  featured?: ContestSummary | null;
  live: ContestSummary[];
  upcoming: ContestSummary[];
  past: ContestSummary[];
};

export type ContestRegistrationSummary = {
  total: number;
  virtual: number;
  disqualified: number;
};

export type ContestTimelineMilestone = {
  label: string;
  at: Date;
  state: "complete" | "upcoming" | "active";
  description?: string;
};

export type ContestDetailPayload = {
  contest: ContestSummary;
  problems: ContestProblemSummary[];
  registration: ContestRegistrationSummary;
  viewerRegistration?: ContestRegistrationStatusPayload | null;
  timeline: ContestTimelineMilestone[];
  scoreboardPreview: ContestStandingRow[];
  freezeActive: boolean;
};

export type ContestStandingProblemCell = {
  problemId: string;
  label: string;
  score: number;
  attempts: number;
  timeMinutes: number | null;
  status: "AC" | "PENDING" | "FAILED" | "LOCKED";
  isFrozen: boolean;
};

export type ContestStandingRow = {
  user: {
    id: string;
    handle: string;
    name: string | null;
    avatarUrl: string | null;
    country: string | null;
  };
  rank: number;
  score: number;
  solved: number;
  penalty: number;
  attempts: number;
  lastSolvedAt: Date | null;
  isVirtual: boolean;
  isDisqualified: boolean;
  entries: ContestStandingProblemCell[];
};

export type ContestScoreboardMeta = {
  totalParticipants: number;
  generatedAt: Date;
  frozen: boolean;
  freezeMode: string;
  visibility: ContestSettings["scoreboard"]["visibility"];
  refreshIntervalSec: number;
  highlightFirstSolve: boolean;
  showPenaltyColumn: boolean;
  showVirtualBadge: boolean;
  limited: boolean;
};

export type ContestStandingsPayload = {
  rows: ContestStandingRow[];
  meta: ContestScoreboardMeta;
  cursor?: string | null;
};

export type ContestClarificationPayload = {
  id: string;
  question: string;
  answer?: string | null;
  visibility: ClarificationVisibility;
  status: ClarificationStatus;
  isPublic: boolean;
  createdAt: Date;
  answeredAt?: Date | null;
  isMine: boolean;
  author: {
    id: string;
    handle: string | null;
    name: string | null;
    avatarUrl: string | null;
  };
  answeredBy?: {
    id: string;
    handle: string | null;
    name: string | null;
  } | null;
  problem?: {
    id: string;
    slug: string;
    title: string;
    label?: string | null;
  } | null;
};

export type ContestWithSettings = Contest & {
  settings: ContestSettings;
};

export type ContestProblemWithSettings = ContestProblem & {
  settings: ContestProblemSettings;
};

export type ContestRegistrationWithUser = ContestRegistration & {
  user: Pick<User, "id" | "handle" | "name" | "avatarUrl" | "country">;
};
