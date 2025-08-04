export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const SUBMISSION_STATUSES = [
  "PENDING",
  "RUNNING",
  "ACCEPTED",
  "WRONG_ANSWER",
  "TLE",
  "RUNTIME_ERROR",
  "COMPILE_ERROR",
  "INTERNAL_ERROR",
] as const;

export type DifficultyValue = (typeof DIFFICULTIES)[number];
export type SubmissionStatusValue = (typeof SUBMISSION_STATUSES)[number];
