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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { formatDistanceToNow } from "date-fns";
import { ContestState, ContestVisibility } from "@prisma/client";
import { toast } from "sonner";

type ContestList = inferRouterOutputs<AppRouter>["admin"]["contests"]["list"];

export function AdminContestsClient({ initialData }: { initialData: ContestList }) {
  const [stateFilter, setStateFilter] = useState<"all" | ContestState>("all");

  const contestQuery = trpc.admin.contests.list.useQuery(
    {
      state: stateFilter === "all" ? undefined : [stateFilter],
      limit: 20,
    },
    { initialData },
  );
  const startNow = trpc.admin.contests.startNow.useMutation({
    onSuccess: () => contestQuery.refetch(),
  });
  const endNow = trpc.admin.contests.endNow.useMutation({
    onSuccess: () => contestQuery.refetch(),
  });
  const setFreeze = trpc.admin.contests.setFreeze.useMutation({
    onSuccess: () => contestQuery.refetch(),
  });
  const toggleVisibility = trpc.admin.contests.toggleVisibility.useMutation({
    onSuccess: () => contestQuery.refetch(),
  });
  const rejudgeContest = trpc.admin.contests.rejudgeContest.useMutation();

  const contests = contestQuery.data ?? initialData;

  return (
    <Card className="border-border/60 bg-card/80">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Contests</p>
          <CardTitle className="text-xl">Schedule & state control</CardTitle>
        </div>
        <Select value={stateFilter} onValueChange={(value) => setStateFilter(value as "all" | ContestState)}>
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="FINISHED">Finished</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {contests.map((contest) => (
          <div key={contest.id} className="rounded-xl border border-border/60 bg-background/70 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold">{contest.name}</p>
                <p className="text-xs text-muted-foreground">{contest.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{contest.state}</Badge>
                <Badge variant="secondary">{contest.visibility}</Badge>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{contest.description}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Starts {formatDistanceToNow(new Date(contest.startsAt), { addSuffix: true })}</span>
              <span>Ends {formatDistanceToNow(new Date(contest.endsAt), { addSuffix: true })}</span>
              <span>{contest._count.problems} problems</span>
              <span>{contest._count.registrations} registrations</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => startNow.mutate({ contestId: contest.id })}>
                Start now
              </Button>
              <Button size="sm" variant="outline" onClick={() => endNow.mutate({ contestId: contest.id })}>
                End now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setFreeze.mutate({ contestId: contest.id, freeze: !contest.freezeAt })}
              >
                {contest.freezeAt ? "Unfreeze" : "Freeze"}
              </Button>
              <Select
                value={contest.visibility}
                onValueChange={(value) =>
                  toggleVisibility.mutate({ contestId: contest.id, visibility: value as ContestVisibility })
                }
              >
                <SelectTrigger className="h-9 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ContestVisibility).map((visibility) => (
                    <SelectItem key={visibility} value={visibility}>
                      {visibility}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  rejudgeContest
                    .mutateAsync({ contestId: contest.id, reason: "admin-contest-rejudge" })
                    .then((res) => toast.success(`Rejudging ${res.count} submissions`))
                }
              >
                Rejudge
              </Button>
            </div>
          </div>
        ))}
        {contests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contests match current filters.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
