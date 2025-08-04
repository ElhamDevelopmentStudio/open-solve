import type {
  parseAsArrayOf as ParseAsArrayOf,
  parseAsInteger as ParseAsInteger,
  parseAsString as ParseAsString,
  parseAsStringEnum as ParseAsStringEnum,
} from "nuqs";
import { DIFFICULTIES, SUBMISSION_STATUSES } from "@/lib/problems/constants";

type ParserFactories = {
  parseAsString: typeof ParseAsString;
  parseAsArrayOf: typeof ParseAsArrayOf;
  parseAsStringEnum: typeof ParseAsStringEnum;
  parseAsInteger: typeof ParseAsInteger;
};

export const buildProblemSearchParsers = ({
  parseAsString,
  parseAsArrayOf,
  parseAsStringEnum,
  parseAsInteger,
}: ParserFactories) => ({
  q: parseAsString.withDefault(""),
  difficulty: parseAsArrayOf(parseAsStringEnum([...DIFFICULTIES])).withDefault([]),
  status: parseAsArrayOf(parseAsStringEnum([...SUBMISSION_STATUSES])).withDefault([]),
  tags: parseAsArrayOf(parseAsString).withDefault([]),
  page: parseAsInteger.withDefault(1),
});
