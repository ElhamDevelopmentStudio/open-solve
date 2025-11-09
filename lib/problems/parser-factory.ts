import type {
  parseAsArrayOf as ParseAsArrayOf,
  parseAsBoolean as ParseAsBoolean,
  parseAsInteger as ParseAsInteger,
  parseAsString as ParseAsString,
  parseAsStringEnum as ParseAsStringEnum,
} from "nuqs";
import {
  DIFFICULTIES,
  PROBLEM_SORT_OPTIONS,
  PROBLEM_STATUS_FILTERS,
} from "@/lib/problems/constants";

type ParserFactories = {
  parseAsString: typeof ParseAsString;
  parseAsArrayOf: typeof ParseAsArrayOf;
  parseAsStringEnum: typeof ParseAsStringEnum;
  parseAsInteger: typeof ParseAsInteger;
  parseAsBoolean: typeof ParseAsBoolean;
};

export const buildProblemSearchParsers = ({
  parseAsString,
  parseAsArrayOf,
  parseAsStringEnum,
  parseAsInteger,
  parseAsBoolean,
}: ParserFactories) => ({
  q: parseAsString.withDefault(""),
  difficulty: parseAsArrayOf(parseAsStringEnum([...DIFFICULTIES])).withDefault([]),
  status: parseAsArrayOf(parseAsStringEnum([...PROBLEM_STATUS_FILTERS])).withDefault([]),
  tags: parseAsArrayOf(parseAsString).withDefault([]),
  onlyWithEditorial: parseAsBoolean.withDefault(false),
  sort: parseAsStringEnum([...PROBLEM_SORT_OPTIONS]).withDefault("newest"),
  page: parseAsInteger.withDefault(1),
});
