"use client";

import { contestsConfig } from "@/config/contests";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  contestDetailQueryOptions,
  contestStandingsQueryOptions,
} from "@/lib/react-query/policies";
import type { ContestStandingProblemCell } from "@/lib/contests/types";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "@/components/icons";

type ContestScoreboardProps = {
  slug: string;
};

const scoreboardConfig = contestsConfig.scoreboard;

export const ContestScoreboard = ({ slug }: ContestScoreboardProps) => {
  const detail = trpc.contests.detail.useQuery({ slug }, contestDetailQueryOptions);
  const standings = trpc.contests.standings.useInfiniteQuery(
    { slug, limit: 50 },
    {
      ...contestStandingsQueryOptions,
      enabled: Boolean(slug),
      getNextPageParam: (page) => page.cursor,
    },
  );

  const scoreboardProblems = detail.data?.problems ?? [];
  const scoreboardRows = standings.data?.pages.flatMap((page) => page.rows) ?? [];
  const scoreboardMeta = standings.data?.pages[0]?.meta;

  if (detail.isLoading || standings.isLoading) {
    return (
      <div className="space-y-6 font-mono">
        <Skeleton className="h-24 w-full border-2 border-border" />
        <Skeleton className="h-96 w-full border-2 border-border" />
      </div>
    );
  }

  if (!detail.data) {
    return null;
  }

  const contest = detail.data.contest;

  return (
    <div className="space-y-8 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="text-xs font-bold uppercase">
            <Link href={`/contests/${slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to contest
            </Link>
          </Button>
          <Badge variant="outline" className="text-[10px] uppercase">
            {contest.name}
          </Badge>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
          {scoreboardConfig.hero.marker}
        </p>
        <h1 className="text-4xl font-black tracking-tight">{scoreboardConfig.hero.title}</h1>
        <p className="text-sm text-muted-foreground">{scoreboardConfig.hero.description}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => standings.refetch()}
            disabled={standings.isFetching}
            className="text-xs font-bold uppercase"
          >
            {standings.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {scoreboardConfig.hero.refreshLabel}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {scoreboardMeta ? (
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase text-muted-foreground">
            <span>
              {scoreboardMeta.totalParticipants.toLocaleString()}{" "}
              {scoreboardConfig.status.participants}
            </span>
            <span>•</span>
            <span>
              {scoreboardConfig.status.updatedPrefix}{" "}
              {formatDistanceToNow(new Date(scoreboardMeta.generatedAt), { addSuffix: true })}
            </span>
          </div>
        ) : null}
        {scoreboardMeta?.frozen ? (
          <div className="border-2 border-warning bg-warning/5 p-3 text-xs text-warning">
            {scoreboardConfig.status.frozenNotice}
          </div>
        ) : null}
      </section>

      {scoreboardRows.length === 0 ? (
        <div className="border-2 border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {scoreboardMeta?.visibility === "hidden"
            ? scoreboardConfig.status.hidden
            : scoreboardConfig.status.empty}
        </div>
      ) : (
        <section className="border-2 border-border bg-card">
          <ScrollArea className="h-[600px]">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-card text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="border-b border-border px-4 py-2 text-left">
                    {scoreboardConfig.table.columns.rank}
                  </th>
                  <th className="border-b border-border px-4 py-2 text-left">
                    {scoreboardConfig.table.columns.participant}
                  </th>
                  <th className="border-b border-border px-4 py-2 text-left">
                    {scoreboardConfig.table.columns.solved}
                  </th>
                  <th className="border-b border-border px-4 py-2 text-left">
                    {scoreboardConfig.table.columns.score}
                  </th>
                  {contest.settings.scoreboard.showPenaltyColumn ? (
                    <th className="border-b border-border px-4 py-2 text-left">
                      {scoreboardConfig.table.columns.penalty}
                    </th>
                  ) : null}
                  {scoreboardProblems.map((problem) => (
                    <th key={problem.id} className="border-b border-border px-3 py-2 text-center">
                      {problem.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scoreboardRows.map((row) => (
                  <tr key={`${row.rank}-${row.user.id}`} className="border-b border-border/50">
                    <td className="px-4 py-2 font-bold">{row.rank}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 border border-border">
                          {row.user.avatarUrl ? (
                            <AvatarImage src={row.user.avatarUrl} alt={row.user.handle} />
                          ) : null}
                          <AvatarFallback>
                            {row.user.handle.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{row.user.name ?? row.user.handle}</p>
                          <p className="text-[11px] uppercase text-muted-foreground">
                            @{row.user.handle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-bold">{row.solved}</td>
                    <td className="px-4 py-2">{row.score.toLocaleString()}</td>
                    {contest.settings.scoreboard.showPenaltyColumn ? (
                      <td className="px-4 py-2">{row.penalty}</td>
                    ) : null}
                    {scoreboardProblems.map((problem) => {
                      const entry = row.entries.find((cell) => cell.problemId === problem.id);
                      return (
                        <td key={problem.id} className="px-3 py-2 text-center">
                          <ProblemCell entry={entry} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
          {standings.hasNextPage ? (
            <div className="border-t border-border p-4 text-center">
              <Button
                variant="outline"
                className="h-10 px-6 text-xs font-bold uppercase"
                onClick={() => standings.fetchNextPage()}
                disabled={standings.isFetchingNextPage}
              >
                {standings.isFetchingNextPage ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {scoreboardConfig.table.loadMore}
              </Button>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
};

function ProblemCell({ entry }: { entry?: ContestStandingProblemCell }) {
  if (!entry) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const base = "mx-auto flex size-10 flex-col items-center justify-center border text-xs";
  if (entry.status === "LOCKED") {
    return <div className={cn(base, "border-border text-muted-foreground")}>LOCK</div>;
  }
  if (entry.status === "AC") {
    return (
      <div className={cn(base, "border-success text-success")}>
        <span>{entry.timeMinutes ?? 0}m</span>
        <span className="text-[9px]">+{entry.attempts}</span>
      </div>
    );
  }
  if (entry.status === "PENDING") {
    return <div className={cn(base, "border-primary text-primary")}>RUN</div>;
  }
  return <div className={cn(base, "border-destructive text-destructive")}>{entry.attempts}</div>;
}
