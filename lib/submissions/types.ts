export type JudgeVerdictCode =
  | "AC"
  | "WA"
  | "TLE"
  | "MLE"
  | "RE"
  | "CE"
  | "MANUAL_PENDING"
  | "MANUAL_ACCEPTED"
  | "MANUAL_REJECTED"
  | "MANUAL_PARTIAL";

export type JudgeCaseVisibility = "SAMPLE" | "HIDDEN";

export type JudgeSimulationTestCase = {
  ordinal: number;
  input: string;
  output: string;
  kind: JudgeCaseVisibility;
};

export type JudgeCaseResult = {
  ordinal: number;
  verdictCode: JudgeVerdictCode;
  status: "PASSED" | "FAILED" | "ERROR";
  runtimeMs: number;
  memoryKb: number;
  inputPreview: string | null;
  expectedOutput: string | null;
  actualOutput: string | null;
  stderr: string | null;
  hidden: boolean;
};

export type JudgeSummary = {
  verdictCode: JudgeVerdictCode;
  passed: number;
  failed: number;
  errored: number;
  total: number;
  runtimeMs: number;
  memoryKb: number;
  startedAt: Date;
  finishedAt: Date;
};

export type SampleRunResult = {
  runId: string;
  problemId: string;
  languageCode: string;
  stdin?: string;
  notes?: string;
  summary: JudgeSummary;
  console: string[];
  cases: JudgeCaseResult[];
};

export type JudgeSimulationResult = {
  summary: JudgeSummary;
  console: string[];
  cases: JudgeCaseResult[];
  failureMode?: "COMPILE" | "RUNTIME" | "TIME" | "MEMORY";
};

export type SubmissionLifecycleStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "RETRYING"
  | "MANUAL_PENDING";

export type SubmissionDetailPayload = {
  id: string;
  problemId: string;
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty?: string | null;
  };
  owner?: {
    id: string;
    handle: string | null;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  language: {
    code: string;
    displayName: string | null;
  };
  contest?: {
    id: string;
    slug: string;
    name: string;
    state: string;
    startsAt: Date;
    endsAt: Date;
  } | null;
  languageCode: string;
  sourceCode: string;
  stdin?: string | null;
  status: SubmissionLifecycleStatus;
  verdictCode: JudgeVerdictCode | null;
  codeHash: string;
  summary: JudgeSummary | null;
  cases: JudgeCaseResult[];
  console: string[];
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  timeline: SubmissionTimelineEvent[];
  review: {
    requiresManualReview: boolean;
    reviewerName?: string | null;
    reviewerId?: string | null;
    reviewedAt?: Date | null;
    manualScore?: number | null;
    internalNotesVisible: boolean;
    internalNotes?: string | null;
  };
  permissions: {
    canResubmit: boolean;
    canToggleShare: boolean;
    canShare: boolean;
    canHideFromProfile: boolean;
    canViewCode: boolean;
    canViewCases: boolean;
  };
  share: {
    enabled: boolean;
    publicId: string | null;
    enabledAt?: Date | null;
    revokedAt?: Date | null;
  };
  performanceDelta: {
    referenceId: string | null;
    runtimeDeltaMs: number | null;
    memoryDeltaKb: number | null;
  } | null;
  feedbackRestricted: boolean;
  restrictionReason?: string | null;
  hiddenFromProfile: boolean;
};

export type SubmissionHistoryEntry = {
  id: string;
  createdAt: Date;
  verdictCode: JudgeVerdictCode | null;
  status: SubmissionLifecycleStatus;
  runtimeMs: number | null;
  languageCode: string;
};

export type SubmissionTimelineStage =
  | "QUEUED"
  | "RUNNING"
  | "FINISHED"
  | "MANUAL_REVIEW"
  | "MANUAL_DECISION";

export type SubmissionTimelineEvent = {
  stage: SubmissionTimelineStage;
  label: string;
  at?: Date | null;
  state: "pending" | "active" | "complete";
  description?: string;
};

export type SubmissionListEntry = {
  id: string;
  createdAt: Date;
  verdictCode: JudgeVerdictCode | null;
  status: SubmissionLifecycleStatus;
  runtimeMs: number | null;
  memoryKb: number | null;
  languageCode: string;
  languageDisplayName: string | null;
  problemId: string;
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty?: string | null;
  };
  contest?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  firstAccepted: boolean;
  codeHash: string;
};

export type SubmissionListSummary = {
  totalAttempts: number;
  acceptedAttempts: number;
  solvedProblems: number;
  manualPending: number;
  lastSubmissionAt: Date | null;
  fastestRuntimeMs: number | null;
  bestMemoryKb: number | null;
};

export type SubmissionFilterMetadata = {
  languages: Array<{ code: string; displayName: string | null; usageCount: number }>;
  problems: Array<{ id: string; slug: string; title: string }>;
  range: {
    firstSubmissionAt: Date | null;
    lastSubmissionAt: Date | null;
  };
};
