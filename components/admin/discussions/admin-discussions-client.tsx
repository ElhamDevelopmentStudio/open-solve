"use client";

import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";
import type { inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
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
  Textarea,
} from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { DiscussionState } from "@prisma/client";

type ThreadList = inferRouterOutputs<AppRouter>["admin"]["discussions"]["listThreads"];
type ReportList = inferRouterOutputs<AppRouter>["admin"]["discussions"]["listReports"];

export function AdminDiscussionsClient({
  initialThreads,
  initialReports,
}: {
  initialThreads: ThreadList;
  initialReports: ReportList;
}) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<DiscussionState | "all">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const threadsQuery = trpc.admin.discussions.listThreads.useQuery(
    {
      query: query || undefined,
      state: stateFilter === "all" ? undefined : [stateFilter],
      limit: 25,
    },
    {
      initialData: initialThreads,
    },
  );
  const reportsQuery = trpc.admin.discussions.listReports.useQuery(
    { status: "OPEN", limit: 20 },
    { initialData: initialReports },
  );

  const hideThread = trpc.admin.discussions.hideThread.useMutation({
    onSuccess: () => threadsQuery.refetch(),
  });
  const unhideThread = trpc.admin.discussions.unhideThread.useMutation({
    onSuccess: () => threadsQuery.refetch(),
  });
  const lockThread = trpc.admin.discussions.lockThread.useMutation({
    onSuccess: () => threadsQuery.refetch(),
  });
  const deleteThread = trpc.admin.discussions.deleteThread.useMutation({
    onSuccess: () => threadsQuery.refetch(),
  });
  const resolveReport = trpc.admin.discussions.resolveReport.useMutation({
    onSuccess: () => reportsQuery.refetch(),
  });

  const threads = threadsQuery.data ?? initialThreads;
  const reports = reportsQuery.data ?? initialReports;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="border-border/60 bg-card/80 lg:col-span-2">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Discussions</p>
            <CardTitle className="text-xl">Threads & moderation</CardTitle>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, content, slug"
              className="h-9 w-full sm:w-52"
            />
            <Select
              value={stateFilter}
              onValueChange={(value) => setStateFilter(value as DiscussionState | "all")}
            >
              <SelectTrigger className="h-9 w-full sm:w-40">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {Object.values(DiscussionState).map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {threads.map((thread) => (
            <div
              key={thread.id}
              className="rounded-xl border border-border/60 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">{thread.title ?? "(untitled)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {thread.author.handle} •{" "}
                    {thread.problem
                      ? `${thread.problem.slug} (${thread.problem.currentVersion?.title ?? ""})`
                      : "Global"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{thread.state}</Badge>
                  <span>{thread._count.replies} replies</span>
                  <span>{thread._count.reports} reports</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{thread.content}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>
                  Last activity{" "}
                  {formatDistanceToNow(new Date(thread.lastActivityAt), { addSuffix: true })}
                </span>
                {thread.containsSpoiler ? <Badge variant="secondary">Spoiler</Badge> : null}
                {thread.isLocked ? <Badge variant="secondary">Locked</Badge> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    (thread.state === "VISIBLE" ? hideThread : unhideThread).mutate({
                      discussionId: thread.id,
                    })
                  }
                >
                  {thread.state === "VISIBLE" ? "Hide" : "Unhide"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    lockThread.mutate({
                      discussionId: thread.id,
                      locked: !thread.isLocked,
                    })
                  }
                >
                  {thread.isLocked ? "Unlock" : "Lock"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteThread.mutate({ discussionId: thread.id })}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No threads match the current filter.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-xl border border-border/60 p-3 text-sm">
              <p className="font-medium">{report.discussion.title ?? report.discussion.id}</p>
              <p className="text-xs text-muted-foreground">
                {report.reporter.handle} • {report.reason}
              </p>
              <Textarea
                placeholder="Resolution note"
                className="mt-2"
                value={notes[report.id] ?? ""}
                onChange={(event) =>
                  setNotes((prev) => ({
                    ...prev,
                    [report.id]: event.target.value,
                  }))
                }
              />
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    resolveReport.mutate({
                      reportId: report.id,
                      status: "VALID",
                      note: notes[report.id],
                    })
                  }
                >
                  Mark valid
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    resolveReport.mutate({
                      reportId: report.id,
                      status: "INVALID",
                      note: notes[report.id],
                    })
                  }
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open reports.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
