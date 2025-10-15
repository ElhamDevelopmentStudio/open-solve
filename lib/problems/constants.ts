export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export const SUBMISSION_STATUSES = [
  "PENDING",
  "RUNNING",
  "AC",
  "WA",
  "TLE",
  "MLE",
  "RE",
  "CE",
] as const;

export type DifficultyValue = (typeof DIFFICULTIES)[number];
export type SubmissionStatusValue = (typeof SUBMISSION_STATUSES)[number];
