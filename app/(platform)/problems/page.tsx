import { ProblemFiltersPanel } from "@/components/problems/problem-filters-panel";
import { problemSearchParams } from "@/lib/problems/search-params";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import type { ProblemFiltersInput } from "@/lib/trpc/router/problems";

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

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Problems</h1>
        <p className="text-sm text-muted-foreground">
          Now powered by tRPC — server components stream typed responses, while client widgets stay
          hydrated via React Query.
        </p>
      </header>

      <ProblemFiltersPanel initialFilters={filters} />

      <section className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          {problemList.total === 0
            ? "Problems table coming soon"
            : `${problemList.total} problems available`}
        </p>
        <p>
          tRPC responds with typed metadata and filter-normalized payloads. Current metadata
          includes {metadata.difficulties.length} difficulty levels and {metadata.statuses.length}{" "}
          submission statuses.
        </p>
      </section>
    </div>
  );
}
