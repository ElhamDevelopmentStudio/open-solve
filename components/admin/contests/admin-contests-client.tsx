"use client";

import Link from "next/link";
import { useState } from "react";

import { ContestState } from "@prisma/client";
import type { inferRouterOutputs } from "@trpc/server";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminConfig } from "@/config/admin";
import { MoreHorizontal } from "@/components/icons";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/router";

type ContestList = inferRouterOutputs<AppRouter>["admin"]["contests"]["list"];

export function AdminContestsClient({ initialData }: { initialData: ContestList }) {
  const [stateFilter, setStateFilter] = useState<"all" | ContestState>("all");
  const [pendingFreeze, setPendingFreeze] = useState<{
    contestId: string;
    isFrozen: boolean;
  } | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<{
    contestId: string;
    visibility: "PUBLIC" | "PRIVATE";
  } | null>(null);
  const [pendingRejudge, setPendingRejudge] = useState<{ contestId: string; name: string } | null>(
    null,
  );

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
    <>
      <Card className="border-2 border-border bg-background">
        <CardHeader className="flex flex-col gap-3 border-b-2 border-border md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {adminConfig.contests.marker}
            </p>
            <CardTitle className="text-2xl font-black">
              {adminConfig.contests.headline.line1} {adminConfig.contests.headline.line2}
            </CardTitle>
          </div>
          <Select
            value={stateFilter}
            onValueChange={(value) => setStateFilter(value as "all" | ContestState)}
          >
            <SelectTrigger className="h-10 w-full rounded-none border-2 border-border font-mono text-sm sm:w-48">
              <SelectValue placeholder={adminConfig.contests.actions.stateLabel} />
            </SelectTrigger>
            <SelectContent className="rounded-none border-2 border-border font-mono">
              <SelectItem value="all">{adminConfig.contests.actions.stateLabel}</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="RUNNING">Running</SelectItem>
              <SelectItem value="FINISHED">Finished</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          {contests.map((contest) => (
            <div key={contest.id} className="border-2 border-border bg-background p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-lg font-black uppercase">{contest.name}</p>
                  <p className="text-xs text-muted-foreground">{contest.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-none border-2 border-border px-2 py-1 text-[10px] font-bold uppercase">
                    {contest.state}
                  </Badge>
                  <Badge className="rounded-none border-2 border-border px-2 py-1 text-[10px] font-bold uppercase">
                    {contest.visibility}
                  </Badge>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{contest.description}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>
                  {adminConfig.contests.summary.starts}{" "}
                  {formatDistanceToNow(new Date(contest.startsAt), { addSuffix: true })}
                </span>
                <span>
                  {adminConfig.contests.summary.ends}{" "}
                  {formatDistanceToNow(new Date(contest.endsAt), { addSuffix: true })}
                </span>
                <span>
                  {contest._count.problems} {adminConfig.contests.summary.problems}
                </span>
                <span>
                  {contest._count.registrations} {adminConfig.contests.summary.registrations}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ConfirmDialog
                  variant="warning"
                  trigger={
                    <Button
                      size="sm"
                      className="h-10 rounded-none border-2 border-primary bg-primary px-3 font-mono text-xs font-bold uppercase text-primary-foreground shadow-none hover:shadow-primary/30"
                    >
                      {adminConfig.contests.actions.start}
                    </Button>
                  }
                  title="Start contest now?"
                  description="This will immediately transition the contest to RUNNING and notify participants."
                  confirmLabel={adminConfig.contests.actions.start}
                  loading={startNow.isPending}
                  onConfirm={() => startNow.mutate({ contestId: contest.id })}
                />
                <ConfirmDialog
                  variant="destructive"
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 rounded-none border-2 border-border px-3 font-mono text-xs font-bold uppercase"
                    >
                      {adminConfig.contests.actions.end}
                    </Button>
                  }
                  title="End contest now?"
                  description="Forces the contest to FINISHED. Scoreboards will freeze and submissions will stop."
                  confirmLabel={adminConfig.contests.actions.end}
                  loading={endNow.isPending}
                  onConfirm={() => endNow.mutate({ contestId: contest.id })}
                />
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-none border-2 border-border px-3 font-mono text-xs font-bold uppercase hover:border-primary/50"
                >
                  <Link href={`/admin/contests/${contest.slug}/anti-cheat`}>Anti-cheat</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10 rounded-none border-2 border-border bg-background px-3 font-mono text-xs font-bold uppercase hover:bg-accent"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="mt-1 rounded-none border-2 border-border bg-background font-mono text-sm"
                  >
                    <DropdownMenuItem
                      className="cursor-pointer px-3 py-2 uppercase"
                      onClick={() =>
                        setPendingFreeze({
                          contestId: contest.id,
                          isFrozen: Boolean(contest.freezeAt),
                        })
                      }
                    >
                      {contest.freezeAt
                        ? adminConfig.contests.actions.unfreeze
                        : adminConfig.contests.actions.freeze}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer px-3 py-2 uppercase"
                      onClick={() =>
                        setPendingVisibility({
                          contestId: contest.id,
                          visibility: contest.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
                        })
                      }
                    >
                      {adminConfig.contests.actions.toggleVisibility} ·{" "}
                      {contest.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer px-3 py-2 uppercase"
                      onClick={() =>
                        setPendingRejudge({ contestId: contest.id, name: contest.name })
                      }
                    >
                      {adminConfig.contests.actions.rejudge}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {contests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{adminConfig.contests.actions.empty}</p>
          ) : null}
        </CardContent>
      </Card>

      <ConfirmDialog
        variant="warning"
        open={pendingFreeze !== null}
        onOpenChange={(open) => {
          if (!open) setPendingFreeze(null);
        }}
        title={
          pendingFreeze?.isFrozen
            ? "Unfreeze scoreboard?"
            : adminConfig.contests.actions.freeze + " contest?"
        }
        description={
          pendingFreeze?.isFrozen
            ? "Restores live scoreboard updates for participants."
            : "Freezes scoreboard to hide late results. You can unfreeze later."
        }
        confirmLabel={
          pendingFreeze?.isFrozen
            ? adminConfig.contests.actions.unfreeze
            : adminConfig.contests.actions.freeze
        }
        loading={setFreeze.isPending}
        onConfirm={() => {
          if (pendingFreeze) {
            setFreeze.mutate({
              contestId: pendingFreeze.contestId,
              freeze: !pendingFreeze.isFrozen,
            });
            setPendingFreeze(null);
          }
        }}
      />
      <ConfirmDialog
        variant="default"
        open={pendingVisibility !== null}
        onOpenChange={(open) => {
          if (!open) setPendingVisibility(null);
        }}
        title="Toggle contest visibility?"
        description={
          pendingVisibility
            ? `Set contest to ${pendingVisibility.visibility}. Participants will need matching access.`
            : ""
        }
        confirmLabel={`Set ${pendingVisibility?.visibility ?? ""}`.trim()}
        loading={toggleVisibility.isPending}
        onConfirm={() => {
          if (pendingVisibility) {
            toggleVisibility.mutate({
              contestId: pendingVisibility.contestId,
              visibility: pendingVisibility.visibility,
            });
            setPendingVisibility(null);
          }
        }}
      />
      <ConfirmDialog
        variant="destructive"
        open={pendingRejudge !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRejudge(null);
        }}
        title="Rejudge contest submissions?"
        description={
          pendingRejudge
            ? `This will re-run all submissions for ${pendingRejudge.name}. This may stress the judges.`
            : ""
        }
        confirmLabel={adminConfig.contests.actions.rejudge}
        loading={rejudgeContest.isPending}
        onConfirm={() => {
          if (pendingRejudge) {
            rejudgeContest
              .mutateAsync({
                contestId: pendingRejudge.contestId,
                reason: "admin-contest-rejudge",
              })
              .then((res) => toast.success(`Rejudging ${res.count} submissions`));
            setPendingRejudge(null);
          }
        }}
      />
    </>
  );
}
