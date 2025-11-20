"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLeaderboardRealtime } from "@/hooks/use-leaderboard-realtime";
import type { LeaderboardEntry, LeaderboardWindow } from "@/lib/leaderboard/service";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Award01Icon, Loading03Icon, Medal01Icon } from "hugeicons-react";
import Link from "next/link";
import { useState } from "react";

const WINDOW_TABS: Array<{ value: LeaderboardWindow; label: string }> = [
  { value: "all_time", label: "All time" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
];

const PAGE_SIZE = 30;

type GlobalLeaderboardClientProps = {
  initialWindow: LeaderboardWindow;
};

export function GlobalLeaderboardClient({ initialWindow }: GlobalLeaderboardClientProps) {
  const [window, setWindow] = useState<LeaderboardWindow>(initialWindow);
  const utils = trpc.useUtils();
  const query = trpc.leaderboard.global.useInfiniteQuery(
    { window, limit: PAGE_SIZE },
    {
      getNextPageParam: (last) => last.nextCursor,
    },
  );

  useLeaderboardRealtime((updatedWindow) => {
    if (updatedWindow === window) {
      void utils.leaderboard.global.invalidate({ window, limit: PAGE_SIZE });
    }
  });

  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  const hero = query.data?.pages[0]?.hero ?? [];
  const meta = query.data?.pages[0];
  const viewerEntry = query.data?.pages[0]?.viewerEntry ?? null;

  return (
    <LeaderboardSection
      title="Global leaderboard"
      subtitle="Snapshot of the best performers across OpenSolve"
      window={window}
      onWindowChange={setWindow}
      entries={entries}
      hero={hero}
      meta={meta}
      viewerEntry={viewerEntry}
      isLoading={query.isLoading && entries.length === 0}
      isFetchingMore={query.isFetchingNextPage}
      hasMore={query.hasNextPage ?? false}
      loadMore={() => query.fetchNextPage()}
    />
  );
}

type PracticeLeaderboardProps = {
  initialWindow: LeaderboardWindow;
  title: string;
  subtitle?: string;
  difficulty?: string;
  slug?: string;
};

export function DifficultyLeaderboardClient({
  initialWindow,
  title,
  subtitle,
  difficulty,
}: PracticeLeaderboardProps) {
  const [window, setWindow] = useState<LeaderboardWindow>(initialWindow);
  const utils = trpc.useUtils();
  const query = trpc.leaderboard.difficulty.useInfiniteQuery(
    { window, difficulty: difficulty as "EASY" | "MEDIUM" | "HARD", limit: PAGE_SIZE },
    {
      getNextPageParam: (last) => last.nextCursor,
    },
  );

  useLeaderboardRealtime((updatedWindow) => {
    if (updatedWindow === window) {
      void utils.leaderboard.difficulty.invalidate({
        window,
        difficulty: difficulty as "EASY" | "MEDIUM" | "HARD",
        limit: PAGE_SIZE,
      });
    }
  });

  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  const hero = query.data?.pages[0]?.hero ?? [];
  const meta = query.data?.pages[0];
  const viewerEntry = query.data?.pages[0]?.viewerEntry ?? null;

  return (
    <LeaderboardSection
      title={title}
      subtitle={subtitle}
      window={window}
      onWindowChange={setWindow}
      entries={entries}
      hero={hero}
      meta={meta}
      viewerEntry={viewerEntry}
      isLoading={query.isLoading && entries.length === 0}
      isFetchingMore={query.isFetchingNextPage}
      hasMore={query.hasNextPage ?? false}
      loadMore={() => query.fetchNextPage()}
    />
  );
}

export function TagLeaderboardClient({
  initialWindow,
  title,
  subtitle,
  slug,
}: PracticeLeaderboardProps) {
  const [window, setWindow] = useState<LeaderboardWindow>(initialWindow);
  const utils = trpc.useUtils();
  const query = trpc.leaderboard.tag.useInfiniteQuery(
    { window, slug: slug ?? "", limit: PAGE_SIZE },
    {
      getNextPageParam: (last) => last.nextCursor,
    },
  );

  useLeaderboardRealtime((updatedWindow) => {
    if (updatedWindow === window) {
      void utils.leaderboard.tag.invalidate({ window, slug: slug ?? "", limit: PAGE_SIZE });
    }
  });

  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];
  const hero = query.data?.pages[0]?.hero ?? [];
  const meta = query.data?.pages[0];
  const viewerEntry = query.data?.pages[0]?.viewerEntry ?? null;

  return (
    <LeaderboardSection
      title={title}
      subtitle={subtitle}
      window={window}
      onWindowChange={setWindow}
      entries={entries}
      hero={hero}
      meta={meta}
      viewerEntry={viewerEntry}
      isLoading={query.isLoading && entries.length === 0}
      isFetchingMore={query.isFetchingNextPage}
      hasMore={query.hasNextPage ?? false}
      loadMore={() => query.fetchNextPage()}
    />
  );
}

type LeaderboardSectionProps = {
  title: string;
  subtitle?: string;
  window: LeaderboardWindow;
  onWindowChange?: (window: LeaderboardWindow) => void;
  entries: LeaderboardEntry[];
  hero: LeaderboardEntry[];
  meta?: {
    periodStart: Date | null;
    periodEnd: Date | null;
    generatedAt: Date | null;
    totalEntries: number;
  } | null;
  viewerEntry?: LeaderboardEntry | null;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
};

function LeaderboardSection({
  title,
  subtitle,
  window,
  onWindowChange,
  entries,
  hero,
  meta,
  viewerEntry,
  isLoading,
  isFetchingMore,
  hasMore,
  loadMore,
}: LeaderboardSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <Badge
              variant="secondary"
              className="rounded-full text-[10px] font-semibold uppercase tracking-wide"
            >
              Live
            </Badge>
          </div>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {onWindowChange ? (
          <Tabs
            value={window}
            onValueChange={(value) => onWindowChange(value as LeaderboardWindow)}
          >
            <TabsList className="rounded-xl">
              {WINDOW_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg capitalize">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
      </div>
      <LeaderboardHero hero={hero} meta={meta} />
      {viewerEntry ? <ViewerBadge entry={viewerEntry} /> : null}
      <LeaderboardTable entries={entries} isLoading={isLoading} />
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-muted-foreground">
        <p>
          Updated{" "}
          {meta?.generatedAt
            ? formatDistanceToNow(new Date(meta.generatedAt), { addSuffix: true })
            : "recently"}
        </p>
        <p>{meta?.totalEntries ? `${meta.totalEntries.toLocaleString()} competitors` : null}</p>
      </div>
      {hasMore ? (
        <Button
          onClick={loadMore}
          disabled={isFetchingMore}
          variant="outline"
          className="w-full rounded-xl"
        >
          {isFetchingMore ? (
            <>
              <Loading03Icon className="mr-2 h-4 w-4 animate-spin" strokeWidth={2} /> Loading more
            </>
          ) : (
            "Load more"
          )}
        </Button>
      ) : null}
    </div>
  );
}

function LeaderboardHero({
  hero,
  meta,
}: {
  hero: LeaderboardEntry[];
  meta?: { periodStart: Date | null; periodEnd: Date | null } | null;
}) {
  if (hero.length === 0) {
    return null;
  }
  const range = meta?.periodStart ? formatRange(meta.periodStart, meta?.periodEnd ?? null) : null;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {hero.map((entry, index) => (
        <div
          key={entry.user.id}
          className={cn(
            "premium-card space-y-4 rounded-2xl p-6",
            index === 0 && "border-primary/40 shadow-lg shadow-primary/10",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                index === 0 ? "bg-primary/10" : "bg-muted",
              )}
            >
              <Award01Icon
                className={cn("h-6 w-6", index === 0 ? "text-primary" : "text-muted-foreground")}
                strokeWidth={2}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">
                #{entry.rank} {entry.user.handle}
              </p>
              {range ? <p className="truncate text-xs text-muted-foreground">{range}</p> : null}
            </div>
          </div>
          <div className="flex items-center justify-around rounded-xl border border-border/50 bg-card/30 py-3">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Score
              </p>
              <p className="text-2xl font-bold">{formatScore(entry.score)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Solved
              </p>
              <p className="text-2xl font-bold">{entry.solved}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type ViewerBadgeProps = {
  entry: LeaderboardEntry;
};

function ViewerBadge({ entry }: ViewerBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-6 py-4 text-sm">
      <Medal01Icon className="h-5 w-5 text-primary" strokeWidth={2} />
      <p className="font-medium text-primary">
        You&apos;re currently ranked <span className="font-bold">#{entry.rank}</span> with{" "}
        <span className="font-bold">{Math.round(entry.score)}</span> points
      </p>
    </div>
  );
}

type TableProps = {
  entries: LeaderboardEntry[];
  isLoading: boolean;
};

function LeaderboardTable({ entries, isLoading }: TableProps) {
  const showSubmissions = entries.some((entry) => typeof entry.submissions === "number");
  const showAvgRuntime = entries.some(
    (entry) => typeof entry.avgRuntimeMs === "number" && entry.avgRuntimeMs !== null,
  );
  const showPenalty = entries.some(
    (entry) => typeof entry.timePenalty === "number" && entry.timePenalty !== null,
  );

  if (isLoading && entries.length === 0) {
    return (
      <div className="premium-card rounded-2xl p-12">
        <div className="flex items-center justify-center text-muted-foreground">
          <Loading03Icon className="mr-2 h-5 w-5 animate-spin" strokeWidth={2} /> Loading
          leaderboard…
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="premium-card rounded-2xl p-12">
        <p className="text-center text-muted-foreground">
          Leaderboard entries will appear once submissions are available
        </p>
      </div>
    );
  }

  return (
    <div className="premium-card overflow-hidden rounded-2xl">
      <div className="hidden border-b bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-12">
        <span className="col-span-1 px-6 py-4">Rank</span>
        <span className="col-span-4 px-6 py-4">Competitor</span>
        <span className="col-span-2 px-6 py-4">Score</span>
        <span className="col-span-2 px-6 py-4">Solved</span>
        {showSubmissions ? <span className="col-span-1 px-6 py-4">Attempts</span> : null}
        {showPenalty ? <span className="col-span-1 px-6 py-4">Penalty</span> : null}
        {showAvgRuntime ? <span className="col-span-1 px-6 py-4">Runtime</span> : null}
      </div>
      <div className="divide-y divide-border/50">
        {entries.map((entry, index) => (
          <div
            key={`${entry.user.id}-${entry.rank}-${index}`}
            className="grid grid-cols-2 items-center gap-3 px-6 py-5 text-sm smooth-transition hover:bg-muted/30 lg:grid-cols-12"
          >
            <div className="col-span-2 flex items-center gap-2 lg:col-span-1">
              <span className="text-base font-bold">#{entry.rank}</span>
            </div>
            <div className="col-span-2 flex items-center gap-3 lg:col-span-4">
              <Avatar className="h-11 w-11 ring-2 ring-border/30 ring-offset-2 ring-offset-background">
                {entry.user.avatarUrl ? (
                  <AvatarImage src={entry.user.avatarUrl} alt={entry.user.handle} />
                ) : null}
                <AvatarFallback className="text-xs font-semibold">
                  {entry.user.handle.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${entry.user.handle}`}
                  className="font-semibold text-primary hover:underline"
                >
                  @{entry.user.handle}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RoleBadge role={entry.user.role} status={entry.user.status} />
                  {entry.user.country ? <span>{formatCountry(entry.user.country)}</span> : null}
                </div>
              </div>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <p className="text-base font-bold">{formatScore(entry.score)}</p>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <p className="font-semibold">{entry.solved}</p>
            </div>
            {showSubmissions ? (
              <div className="col-span-1">
                {typeof entry.submissions === "number" ? entry.submissions : "–"}
              </div>
            ) : null}
            {showPenalty ? (
              <div className="col-span-1 text-xs text-muted-foreground">
                {typeof entry.timePenalty === "number" ? `${entry.timePenalty}` : "–"}
              </div>
            ) : null}
            {showAvgRuntime ? (
              <div className="col-span-1 text-xs text-muted-foreground">
                {entry.avgRuntimeMs ? `${Math.round(entry.avgRuntimeMs)} ms` : "–"}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleBadge({ role, status }: { role: string; status: string }) {
  if (status === "SHADOW_BANNED") {
    return (
      <Badge variant="destructive" className="rounded-full text-[10px]">
        Shadow Banned
      </Badge>
    );
  }
  if (role === "ADMIN") {
    return (
      <Badge variant="secondary" className="rounded-full text-[10px]">
        Admin
      </Badge>
    );
  }
  if (role === "PROBLEM_CURATOR") {
    return (
      <Badge variant="outline" className="rounded-full text-[10px]">
        Curator
      </Badge>
    );
  }
  return null;
}

function formatScore(score: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(score);
}

function formatCountry(country: string) {
  const code = country.trim().toUpperCase();
  if (code.length !== 2) return code;
  const flag = String.fromCodePoint(...code.split("").map((char) => 127397 + char.charCodeAt(0)));
  return `${flag} ${code}`;
}

function formatRange(start: Date | null, end: Date | null) {
  if (!start) return null;
  const startLabel = start.toLocaleDateString();
  const endLabel = end ? end.toLocaleDateString() : "present";
  return `${startLabel} – ${endLabel}`;
}
