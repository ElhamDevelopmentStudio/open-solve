import type { QueryClient, QueryFilters } from "@tanstack/react-query";
import {
  matchesProcedure,
  queryTagMap,
  type ProcedureName,
  type QueryTag,
} from "@/lib/react-query/keys";

type InvalidateOptions = Omit<QueryFilters, "predicate">;

export function invalidateProcedures(
  queryClient: QueryClient,
  procedures: ProcedureName[],
  options?: InvalidateOptions,
) {
  return queryClient.invalidateQueries({
    ...options,
    predicate: (query) =>
      procedures.some((procedure) => matchesProcedure(query.queryKey, procedure)),
  });
}

export function invalidateTags(
  queryClient: QueryClient,
  tags: QueryTag[],
  options?: InvalidateOptions,
) {
  const procedures = tags.flatMap((tag) => queryTagMap[tag] ?? []);
  if (procedures.length === 0) {
    return;
  }
  return invalidateProcedures(queryClient, procedures, options);
}

export const invalidateAuthSession = (queryClient: QueryClient) =>
  invalidateTags(queryClient, ["session"]);
