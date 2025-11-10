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
  languageCode: string;
  sourceCode: string;
  stdin?: string | null;
  status: SubmissionLifecycleStatus;
  verdictCode: JudgeVerdictCode | null;
  summary: JudgeSummary | null;
  cases: JudgeCaseResult[];
  console: string[];
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

export type SubmissionHistoryEntry = {
  id: string;
  createdAt: Date;
  verdictCode: JudgeVerdictCode | null;
  status: SubmissionLifecycleStatus;
  runtimeMs: number | null;
  languageCode: string;
};
