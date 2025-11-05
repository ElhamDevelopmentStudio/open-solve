"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContestStandingProblemCell } from "@/lib/contests/types";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Loader2, RefreshCw } from "@/components/icons";
import Link from "next/link";

type ContestScoreboardProps = {
  slug: string;
};

export const ContestScoreboard = ({ slug }: ContestScoreboardProps) => {
  const detail = trpc.contests.detail.useQuery({ slug });
  const standings = trpc.contests.standings.useInfiniteQuery(
    { slug, limit: 50 },
    {
      enabled: Boolean(slug),
      getNextPageParam: (page) => page.cursor,
    }
  );

  const scoreboardProblems = detail.data?.problems ?? [];
  const scoreboardRows = standings.data?.pages.flatMap((page) => page.rows) ?? [];
  const scoreboardMeta = standings.data?.pages[0]?.meta;

  if (detail.isLoading || standings.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="premium-card rounded-2xl p-8">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!detail.data) {
    return null;
  }

  const contest = detail.data.contest;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="rounded-xl">
            <Link href={`/contests/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Contest
            </Link>
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => standings.refetch()}
          disabled={standings.isFetching}
          className="rounded-xl"
        >
          {standings.isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{contest.name} - Scoreboard</h1>
          {scoreboardMeta ? (
            <Badge variant="outline" className="rounded-full">
              {scoreboardMeta.totalParticipants.toLocaleString()} participants
            </Badge>
          ) : null}
        </div>
        {scoreboardMeta ? (
          <p className="text-sm text-muted-foreground">
            Last updated {formatDistanceToNow(new Date(scoreboardMeta.generatedAt), { addSuffix: true })}
          </p>
        ) : null}
      </div>

      {scoreboardRows.length === 0 ? (
        <div className="premium-card rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">
            {scoreboardMeta?.visibility === "hidden"
              ? "Scoreboard is hidden for this contest"
              : "No submissions yet. Be the first to solve!"}
          </p>
        </div>
      ) : (
        <div className="premium-card space-y-6 rounded-2xl p-6">
          <ScrollArea className="h-[600px]">
            <div className="min-w-full overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Participant</th>
                    <th className="px-4 py-3">Solved</th>
                    <th className="px-4 py-3">Score</th>
                    {contest.settings.scoreboard.showPenaltyColumn ? (
                      <th className="px-4 py-3">Penalty</th>
                    ) : null}
                    {scoreboardProblems.map((problem) => (
                      <th key={problem.id} className="px-3 py-3 text-center text-[10px] font-semibold">
                        {problem.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scoreboardRows.map((row) => (
                    <tr
                      key={`${row.rank}-${row.user.id}`}
                      className="border-t border-border/40 text-sm smooth-transition hover:bg-muted/30"
                    >
                      <td className="px-4 py-3 font-semibold">{row.rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {row.user.avatarUrl ? (
                              <AvatarImage src={row.user.avatarUrl} alt={row.user.handle} />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {row.user.handle.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{row.user.name ?? row.user.handle}</p>
                            <p className="text-xs text-muted-foreground">@{row.user.handle}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{row.solved}</td>
                      <td className="px-4 py-3">{row.score.toLocaleString()}</td>
                      {contest.settings.scoreboard.showPenaltyColumn ? (
                        <td className="px-4 py-3">{row.penalty}</td>
                      ) : null}
                      {scoreboardProblems.map((problem) => {
                        const entry = row.entries.find((cell) => cell.problemId === problem.id);
                        return (
                          <td key={problem.id} className="px-3 py-3 text-center">
                            <ProblemCell entry={entry} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>

          {standings.hasNextPage ? (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => standings.fetchNextPage()}
                disabled={standings.isFetchingNextPage}
                className="rounded-xl"
              >
                {standings.isFetchingNextPage ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Load More
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const ProblemCell = ({ entry }: { entry?: ContestStandingProblemCell }) => {
  if (!entry) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const tone =
    entry.status === "AC"
      ? "border border-emerald-400/50 bg-emerald-100 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-200"
      : entry.status === "FAILED"
        ? "border border-rose-400/50 bg-rose-100 text-rose-800 dark:bg-rose-400/20 dark:text-rose-200"
        : entry.status === "PENDING"
          ? "border border-amber-400/50 bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200"
          : "border border-muted bg-muted/60 text-muted-foreground";

  return (
    <div className={cn("inline-flex rounded-lg px-2 py-1 text-xs font-semibold", tone)}>
      {entry.status === "AC"
        ? entry.timeMinutes !== null
          ? `${entry.timeMinutes}m`
          : "AC"
        : entry.status === "FAILED"
          ? `-${entry.attempts}`
          : entry.status === "PENDING"
            ? "…"
            : "—"}
    </div>
  );
};


