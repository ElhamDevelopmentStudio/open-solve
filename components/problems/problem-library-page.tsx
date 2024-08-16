import { ProblemLibraryShell } from "@/components/problems/problem-library";
import { problemSearchParams } from "@/lib/problems/search-params";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import type { ProblemFiltersInput } from "@/lib/trpc/router/problems";
import { getSession } from "@/lib/auth/session";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { getCachedProblemFilterMetadata, getCachedProblemList } from "@/lib/cache/problems";
import { HydrationBoundary } from "@tanstack/react-query";

type RenderProblemLibraryOptions = {
  searchParams: Record<string, string | string[] | undefined>;
  viewerHasSession?: boolean;
  problemBasePath?: string;
  tagSlug?: string;
};

export async function resolveViewerSessionFlag() {
  const session = await getSession();
  return Boolean(session);
}

export async function renderProblemLibraryPage({
  searchParams,
  viewerHasSession = false,
  problemBasePath,
  tagSlug,
}: RenderProblemLibraryOptions) {
  const filters = (await problemSearchParams.parse(searchParams)) as ProblemFiltersInput;
  const state = await buildHydrationState([
    prefetchTrpcQuery(
      "problems.list",
      async () => {
        if (viewerHasSession) {
          const caller = await createTRPCCaller();
          return caller.problems.list(filters);
        }
        return getCachedProblemList(filters);
      },
      {
        input: filters,
        staleTime: viewerHasSession ? 0 : publicContentQueryOptions.staleTime,
      },
    ),
    prefetchTrpcQuery("problems.filterMetadata", () => getCachedProblemFilterMetadata(), {
      staleTime: publicContentQueryOptions.staleTime,
    }),
  ]);

  return (
    <HydrationBoundary state={state}>
      <ProblemLibraryShell
        initialFilters={filters}
        viewerHasSession={viewerHasSession}
        problemBasePath={problemBasePath}
        tagSlug={tagSlug}
      />
    </HydrationBoundary>
  );
}
