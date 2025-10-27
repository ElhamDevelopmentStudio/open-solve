import { ProblemFiltersPanel } from "@/components/problems/problem-filters-panel";
import { Badge } from "@/components/ui/badge";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { problemSearchParams } from "@/lib/problems/search-params";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import type { ProblemFiltersInput } from "@/lib/trpc/router/problems";
import { HydrationBoundary } from "@tanstack/react-query";

type ProblemsPageProps = {
  searchParams:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProblemsPage({ searchParams }: ProblemsPageProps) {
  const resolvedSearchParams = await searchParams;
  const filters = (await problemSearchParams.parse(resolvedSearchParams)) as ProblemFiltersInput;

  const caller = await createTRPCCaller();
  const [problemList, metadata] = await Promise.all([
    caller.problems.list(filters),
    caller.problems.filterMetadata(),
  ]);

  const hydrationState = await buildHydrationState([
    prefetchTrpcQuery("problems.filterMetadata", () => caller.problems.filterMetadata(), {
      staleTime: publicContentQueryOptions.staleTime,
    }),
  ]);

  return (
    <HydrationBoundary state={hydrationState}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Problems</h1>
          <p className="text-sm text-muted-foreground">
            Now powered by tRPC — server components stream typed responses, while client widgets
            stay hydrated via React Query.
          </p>
        </header>

        <ProblemFiltersPanel initialFilters={filters} />

        <section className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            {problemList.total === 0
              ? "No problems found for the selected filters."
              : `${problemList.total} problems available across ${problemList.pageCount} pages.`}
          </p>
          <p>
            Metadata currently tracks {metadata.difficulties.length} difficulty tiers,{" "}
            {metadata.statuses.length} submission statuses, and {metadata.tags.length} taxonomy
            tags.
          </p>
        </section>

        {problemList.items.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <ul className="divide-y divide-border">
              {problemList.items.map((problem) => (
                <li
                  key={problem.id}
                  className="flex flex-col gap-3 p-4 md:flex-row md:items-center"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{problem.title}</p>
                      {problem.version ? (
                        <span className="text-xs text-muted-foreground">v{problem.version}</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">/{problem.slug}</p>
                    {problem.tags.length ? (
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.map((tag) => (
                          <Badge key={tag.slug} variant="secondary">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-start gap-1 text-sm text-muted-foreground md:items-end">
                    <Badge variant="outline">{problem.difficulty ?? "UNRATED"}</Badge>
                    <p>
                      Acceptance:{" "}
                      <span className="font-medium text-foreground">
                        {typeof problem.acceptanceRate === "number"
                          ? `${Math.round(problem.acceptanceRate * 100)}%`
                          : "—"}
                      </span>
                    </p>
                    <p>Submissions: {problem.submissionCount}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </HydrationBoundary>
  );
}
