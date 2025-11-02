import { buildProblemSearchParsers } from "@/lib/problems/parser-factory";
import {
  createLoader,
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

const serverParsers = buildProblemSearchParsers({
  parseAsString,
  parseAsArrayOf,
  parseAsStringEnum,
  parseAsInteger,
  parseAsBoolean,
});

export const problemSearchParams = createSearchParamsCache(serverParsers);
export const loadProblemSearchParams = createLoader(serverParsers);

export type ProblemSearchParams = Awaited<ReturnType<typeof problemSearchParams.parse>>;
