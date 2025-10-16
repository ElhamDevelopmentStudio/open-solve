"use client";

import { buildProblemSearchParsers } from "@/lib/problems/parser-factory";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
  type UseQueryStatesOptions,
} from "nuqs";

const clientParsers = buildProblemSearchParsers({
  parseAsString,
  parseAsArrayOf,
  parseAsStringEnum,
  parseAsInteger,
});

export function useProblemFilters(options?: UseQueryStatesOptions<typeof clientParsers>) {
  return useQueryStates(clientParsers, {
    history: "replace",
    ...options,
  });
}
