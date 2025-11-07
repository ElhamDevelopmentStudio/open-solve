import type { JudgeVerdictCode } from "@/lib/submissions/types";

export const SUBMISSION_LIST_SORTS = ["recent", "fastest", "memory", "first_ac"] as const;
export type SubmissionListSort = (typeof SUBMISSION_LIST_SORTS)[number];

export const SUBMISSION_CONTEST_FILTERS = ["all", "contest", "practice"] as const;
export type SubmissionContestFilter = (typeof SUBMISSION_CONTEST_FILTERS)[number];

export const SUBMISSION_VERDICTS = [
  "AC",
  "WA",
  "TLE",
  "MLE",
  "RE",
  "CE",
  "MANUAL_PENDING",
  "MANUAL_ACCEPTED",
  "MANUAL_REJECTED",
  "MANUAL_PARTIAL",
 ] as const satisfies JudgeVerdictCode[];

export const ACCEPTED_VERDICTS: JudgeVerdictCode[] = ["AC", "MANUAL_ACCEPTED", "MANUAL_PARTIAL"];

export const FAILURE_VERDICTS: JudgeVerdictCode[] = ["WA", "TLE", "MLE", "RE", "CE", "MANUAL_REJECTED"];
