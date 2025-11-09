"use client";

import { buildProblemSearchParsers } from "@/lib/problems/parser-factory";
import {
  parseAsArrayOf,
  parseAsBoolean,
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
  parseAsBoolean,
});

export function useProblemFilters(options?: UseQueryStatesOptions<typeof clientParsers>) {
  return useQueryStates(clientParsers, {
    history: "push",
    ...options,
  });
}
