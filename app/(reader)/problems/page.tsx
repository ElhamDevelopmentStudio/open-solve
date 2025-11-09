import { ProblemLibraryShell } from "@/components/problems/problem-library";
import { problemSearchParams } from "@/lib/problems/search-params";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import type { ProblemFiltersInput } from "@/lib/trpc/router/problems";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Problem Library | OpenSolve",
  description: "Browse public problems with tags, difficulty filters, and fast search.",
};

export async function renderProblemLibrary(resolvedSearchParams: Record<string, string | string[] | undefined>) {
  const filters = (await problemSearchParams.parse(resolvedSearchParams)) as ProblemFiltersInput;
  const caller = await createTRPCCaller();
  const dehydration = await buildHydrationState([
    prefetchTrpcQuery("problems.list", () => caller.problems.list(filters), {
      input: filters,
      staleTime: publicContentQueryOptions.staleTime,
    }),
    prefetchTrpcQuery("problems.filterMetadata", () => caller.problems.filterMetadata(), {
      staleTime: publicContentQueryOptions.staleTime,
    }),
  ]);
  return (
    <HydrationBoundary state={dehydration}>
      <ProblemLibraryShell initialFilters={filters} />
    </HydrationBoundary>
  );
}

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  return renderProblemLibrary(resolvedSearchParams);
}
