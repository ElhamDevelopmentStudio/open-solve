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

export const PROBLEM_STATUS_FILTERS = ["SOLVED", "ATTEMPTED", "UNSEEN"] as const;

export const PROBLEM_SORT_OPTIONS = [
  "relevance",
  "newest",
  "difficulty",
  "difficulty_desc",
] as const;

export type DifficultyValue = (typeof DIFFICULTIES)[number];
export type SubmissionStatusValue = (typeof SUBMISSION_STATUSES)[number];
export type ProblemStatusFilterValue = (typeof PROBLEM_STATUS_FILTERS)[number];
export type ProblemSortOptionValue = (typeof PROBLEM_SORT_OPTIONS)[number];
