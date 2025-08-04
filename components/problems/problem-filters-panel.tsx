"use client";

import { Button } from "@/components/ui";
import { useProblemFilters } from "@/hooks/use-problem-filters";
import type { ProblemSearchParams } from "@/lib/problems/search-params";
import { trpc } from "@/lib/trpc/client";

type ProblemFiltersPanelProps = {
  initialFilters: ProblemSearchParams;
};

export function ProblemFiltersPanel({ initialFilters }: ProblemFiltersPanelProps) {
  const [filters, setFilters] = useProblemFilters();
  const { data: metadata } = trpc.problems.filterMetadata.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  const hasFilters =
    filters.q ||
    filters.difficulty.length > 0 ||
    filters.status.length > 0 ||
    filters.tags.length > 0;

  return (
    <aside className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">URL Filters</p>
          <p className="text-xs text-muted-foreground">
            Powered by tRPC + React Query. State stays in sync via `nuqs`.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasFilters}
          onClick={() =>
            setFilters(
              {
                ...initialFilters,
                q: "",
                difficulty: [],
                status: [],
                tags: [],
                page: 1,
              },
              { history: "replace" },
            )
          }
        >
          Clear
        </Button>
      </div>

      {metadata ? (
        <dl className="mt-4 grid grid-cols-1 gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-foreground">Difficulties</dt>
            <dd>{metadata.difficulties.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-foreground">Statuses</dt>
            <dd>{metadata.statuses.join(", ") || "—"}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-foreground">Tags</dt>
            <dd>{metadata.tags.length ? metadata.tags.join(", ") : "Coming soon"}</dd>
          </div>
        </dl>
      ) : null}

      <pre className="mt-4 overflow-x-auto rounded bg-muted/40 p-3 text-xs text-foreground">
        {JSON.stringify(filters, null, 2)}
      </pre>
    </aside>
  );
}
