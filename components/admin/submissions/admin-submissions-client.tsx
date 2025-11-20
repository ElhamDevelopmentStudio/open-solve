"use client";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
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
import { SubmissionStatus } from "@prisma/client";
import { toast } from "sonner";
import { Gavel, Search } from "@/components/icons";

type SubmissionListResponse = inferRouterOutputs<AppRouter>["admin"]["submissions"]["list"];

export function AdminSubmissionsClient({ initialData }: { initialData: SubmissionListResponse }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [scope, setScope] = useState({
    userId: "",
    problemSlug: "",
    contestSlug: "",
    languageCode: "",
    limit: 50,
    reason: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const submissionsQuery = trpc.admin.submissions.list.useQuery(
    {
      query: debouncedQuery || undefined,
      status: statusFilter === "all" ? undefined : [statusFilter],
      limit: 25,
    },
    {
      initialData,
    },
  );

  const submissions = submissionsQuery.data ?? initialData;

  const rejudge = trpc.admin.submissions.rejudge.useMutation({
    onSuccess: () => toast.success("Rejudge dispatched"),
    onError: (error) => toast.error("Rejudge failed", { description: error.message }),
  });

  const toggleVisibility = trpc.admin.submissions.toggleVisibility.useMutation({
    onSuccess: () => {
      toast.success("Visibility updated");
      submissionsQuery.refetch();
    },
    onError: (error) => toast.error("Failed to update visibility", { description: error.message }),
  });

  const rejudgeScope = trpc.admin.submissions.rejudgeScope.useMutation({
    onSuccess: (result) => {
      toast.success(`Dispatched ${result.count} submissions`);
      setScope((prev) => ({ ...prev, reason: "" }));
    },
    onError: (error) => toast.error("Batch rejudge failed", { description: error.message }),
  });

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Judge and verdict control</p>
          <CardTitle className="text-2xl">Submissions & queue</CardTitle>
          <p className="text-sm text-muted-foreground">
            Spot stuck jobs, rejudge selectively, and hide sensitive verdicts.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ID, user, or problem"
              className="border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as SubmissionStatus | "all")}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.values(SubmissionStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="rounded-xl border border-border/60 bg-background/80 p-4 transition hover:border-primary/40"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-primary" />
                  <p className="font-semibold">{submission.problem.currentVersion?.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  #{submission.id} • {submission.user.handle} • {submission.language.displayName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{submission.status}</Badge>
                {submission.verdictCode ? (
                  <Badge variant="secondary">{submission.verdictCode}</Badge>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => rejudge.mutate({ submissionId: submission.id })}
                  disabled={rejudge.isPending}
                >
                  Rejudge
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleVisibility.mutate({
                      submissionId: submission.id,
                      hiddenFromProfile: !submission.hiddenFromProfile,
                    })
                  }
                >
                  {submission.hiddenFromProfile ? "Unhide" : "Hide"}
                </Button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(submission.createdAt), {
                  addSuffix: true,
                })}
              </span>
              <span>{submission.problem.slug}</span>
            </div>
          </div>
        ))}
        {submissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No submissions match that filter.
          </div>
        ) : null}
        <div className="mt-8 rounded-xl border border-border/60 bg-background/60 p-4">
          <h3 className="text-base font-semibold">Batch rejudge</h3>
          <p className="text-xs text-muted-foreground">
            Provide at least one constraint (user, problem slug, contest slug, or language).
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Input
              placeholder="User ID"
              value={scope.userId}
              onChange={(event) => setScope((prev) => ({ ...prev, userId: event.target.value }))}
            />
            <Input
              placeholder="Problem slug"
              value={scope.problemSlug}
              onChange={(event) =>
                setScope((prev) => ({ ...prev, problemSlug: event.target.value }))
              }
            />
            <Input
              placeholder="Contest slug"
              value={scope.contestSlug}
              onChange={(event) =>
                setScope((prev) => ({ ...prev, contestSlug: event.target.value }))
              }
            />
            <Input
              placeholder="Language code (e.g. cpp17)"
              value={scope.languageCode}
              onChange={(event) =>
                setScope((prev) => ({ ...prev, languageCode: event.target.value }))
              }
            />
            <Input
              type="number"
              min={1}
              max={200}
              value={scope.limit}
              onChange={(event) =>
                setScope((prev) => ({ ...prev, limit: Number(event.target.value) }))
              }
            />
            <Input
              placeholder="Reason (optional)"
              value={scope.reason}
              onChange={(event) => setScope((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </div>
          <Button
            className="mt-4"
            disabled={
              rejudgeScope.isPending ||
              (!scope.userId && !scope.problemSlug && !scope.contestSlug && !scope.languageCode)
            }
            onClick={() =>
              rejudgeScope.mutate({
                userId: scope.userId || undefined,
                problemSlug: scope.problemSlug || undefined,
                contestSlug: scope.contestSlug || undefined,
                languageCode: scope.languageCode || undefined,
                limit: scope.limit,
                reason: scope.reason || undefined,
              })
            }
          >
            {rejudgeScope.isPending ? "Rejudging…" : "Rejudge selection"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
