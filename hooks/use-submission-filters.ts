"use client";

import { buildSubmissionSearchParsers } from "@/lib/submissions/parser-factory";
import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
  type UseQueryStatesOptions,
} from "nuqs";

const clientParsers = buildSubmissionSearchParsers({
  parseAsString,
  parseAsArrayOf,
  parseAsStringEnum,
});

export function useSubmissionFilters(options?: UseQueryStatesOptions<typeof clientParsers>) {
  return useQueryStates(clientParsers, {
    history: "push",
    ...options,
  });
}
