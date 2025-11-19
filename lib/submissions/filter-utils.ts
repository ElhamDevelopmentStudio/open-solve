import type { SubmissionSearchParams } from "@/lib/submissions/search-params";
import type { SubmissionContestFilter, SubmissionListSort } from "@/lib/submissions/constants";
import { SUBMISSION_VERDICTS } from "@/lib/submissions/constants";
import { SubmissionStatus } from "@prisma/client";
import type { JudgeVerdictCode } from "@/lib/submissions/types";

export type SubmissionListInputDTO = {
  problemId?: string;
  problemSlug?: string;
  verdicts?: JudgeVerdictCode[];
  statuses?: SubmissionStatus[];
  languages?: string[];
  contest: SubmissionContestFilter;
  sort: SubmissionListSort;
  from?: Date;
  to?: Date;
  limit: number;
};

export function buildSubmissionListInputFromParams(
  params: SubmissionSearchParams,
  overrides?: Partial<SubmissionListInputDTO>,
): SubmissionListInputDTO {
  const verdictList = params.verdicts.filter((code): code is JudgeVerdictCode =>
    (SUBMISSION_VERDICTS as readonly string[]).includes(code as JudgeVerdictCode),
  );
  const statusOptions = new Set(Object.values(SubmissionStatus));
  const statusList = params.statuses.filter((status): status is SubmissionStatus =>
    statusOptions.has(status as SubmissionStatus),
  );

  const input: SubmissionListInputDTO = {
    problemSlug: params.problem ? params.problem : undefined,
    verdicts: verdictList.length ? verdictList : undefined,
    statuses: statusList.length ? statusList : undefined,
    languages: params.languages.length ? params.languages : undefined,
    contest: params.contest,
    sort: params.sort,
    from: params.from ? safeDate(params.from) : undefined,
    to: params.to ? safeDate(params.to) : undefined,
    limit: 20,
    ...overrides,
  };

  if (!input.problemSlug || input.problemSlug.trim() === "") {
    delete input.problemSlug;
  }

  return input;
}

function safeDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
