import type {
  parseAsArrayOf as ParseAsArrayOf,
  parseAsString as ParseAsString,
  parseAsStringEnum as ParseAsStringEnum,
} from "nuqs";
import {
  SUBMISSION_CONTEST_FILTERS,
  SUBMISSION_LIST_SORTS,
  SUBMISSION_VERDICTS,
} from "@/lib/submissions/constants";
import { SUBMISSION_STATUSES } from "@/lib/problems/constants";

type ParserFactories = {
  parseAsString: typeof ParseAsString;
  parseAsArrayOf: typeof ParseAsArrayOf;
  parseAsStringEnum: typeof ParseAsStringEnum;
};

export const buildSubmissionSearchParsers = ({
  parseAsString,
  parseAsArrayOf,
  parseAsStringEnum,
}: ParserFactories) => ({
  problem: parseAsString.withDefault(""),
  verdicts: parseAsArrayOf(parseAsStringEnum([...SUBMISSION_VERDICTS])).withDefault([]),
  statuses: parseAsArrayOf(parseAsStringEnum([...SUBMISSION_STATUSES])).withDefault([]),
  languages: parseAsArrayOf(parseAsString).withDefault([]),
  contest: parseAsStringEnum([...SUBMISSION_CONTEST_FILTERS]).withDefault("all"),
  sort: parseAsStringEnum([...SUBMISSION_LIST_SORTS]).withDefault("recent"),
  from: parseAsString.withDefault(""),
  to: parseAsString.withDefault(""),
});
