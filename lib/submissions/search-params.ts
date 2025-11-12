import { buildSubmissionSearchParsers } from "@/lib/submissions/parser-factory";
import {
  createLoader,
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

const parsers = buildSubmissionSearchParsers({
  parseAsString,
  parseAsArrayOf,
  parseAsStringEnum,
});

export const submissionSearchParams = createSearchParamsCache(parsers);
export const loadSubmissionSearchParams = createLoader(parsers);

export type SubmissionSearchParams = Awaited<ReturnType<typeof submissionSearchParams.parse>>;
