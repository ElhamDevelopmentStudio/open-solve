"use client";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ProblemState, ProblemVisibility } from "@prisma/client";
import { BookOpenCheck, Search } from "@/components/icons";

type ProblemListResponse = inferRouterOutputs<AppRouter>["admin"]["problems"]["list"];

export function AdminProblemsClient({ initialData }: { initialData: ProblemListResponse }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<ProblemState | "all">("all");
  const [visibilityFilter, setVisibilityFilter] = useState<ProblemVisibility | "all">("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const problemsQuery = trpc.admin.problems.list.useQuery(
    {
      query: debouncedQuery || undefined,
      state: stateFilter === "all" ? undefined : [stateFilter],
      visibility: visibilityFilter === "all" ? undefined : [visibilityFilter],
      limit: 25,
    },
    {
      initialData,
    },
  );

  const problems = problemsQuery.data ?? initialData;

  const updateState = trpc.admin.problems.updateState.useMutation({
    onSuccess: () => {
      toast.success("Problem state updated");
      problemsQuery.refetch();
    },
    onError: (error) => toast.error("Failed to update problem", { description: error.message }),
  });

  const updateVisibility = trpc.admin.problems.updateVisibility.useMutation({
    onSuccess: () => {
      toast.success("Problem visibility updated");
      problemsQuery.refetch();
    },
    onError: (error) => toast.error("Failed to update visibility", { description: error.message }),
  });

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Library control</p>
            <CardTitle className="text-2xl">Problems & content</CardTitle>
            <p className="text-sm text-muted-foreground">
              Promote drafts, change visibility, and monitor stats at a glance.
            </p>
          </div>
          <span className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs text-muted-foreground">
            {problems.length} entries
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search slug or title"
              className="border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <Select
            value={stateFilter}
            onValueChange={(value) => setStateFilter(value as ProblemState | "all")}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {Object.values(ProblemState).map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={visibilityFilter}
            onValueChange={(value) => setVisibilityFilter(value as ProblemVisibility | "all")}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibilities</SelectItem>
              {Object.values(ProblemVisibility).map((visibility) => (
                <SelectItem key={visibility} value={visibility}>
                  {visibility}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {problems.map((problem) => (
          <div
            key={problem.id}
            className="rounded-xl border border-border/60 bg-background/80 p-4 transition hover:border-primary/40"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4 text-primary" />
                  <p className="font-semibold">{problem.currentVersion?.title ?? problem.slug}</p>
                </div>
                <p className="text-xs uppercase text-muted-foreground">{problem.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={problem.state}
                  onValueChange={(value) =>
                    updateState.mutate({ problemId: problem.id, state: value as ProblemState })
                  }
                >
                  <SelectTrigger className="w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ProblemState).map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={problem.visibility}
                  onValueChange={(value) =>
                    updateVisibility.mutate({
                      problemId: problem.id,
                      visibility: value as ProblemVisibility,
                    })
                  }
                >
                  <SelectTrigger className="w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ProblemVisibility).map((visibility) => (
                      <SelectItem key={visibility} value={visibility}>
                        {visibility}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>
                Updated{" "}
                {formatDistanceToNow(new Date(problem.updatedAt), {
                  addSuffix: true,
                })}
              </span>
              <span>{problem.stats?.submissionCount ?? 0} submissions</span>
              <span>{problem.stats?.acceptedCount ?? 0} accepted</span>
              <Badge variant="outline">{problem.difficulty?.code ?? "Unrated"}</Badge>
            </div>
          </div>
        ))}
        {problems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            No problems match that filter.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
