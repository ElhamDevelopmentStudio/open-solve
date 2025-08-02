"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState } from "react";

import { LoaderCircle, Send, Trophy, User } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { leaderboardsConfig } from "@/config/leaderboards";
import { useLeaderboardRealtime } from "@/hooks/use-leaderboard-realtime";
import type { LeaderboardEntry, LeaderboardWindow } from "@/lib/leaderboard/service";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

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
  const { section } = leaderboardsConfig;

  return (
    <div className="space-y-6">
      <div className="border-2 border-border bg-background p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-black uppercase sm:text-3xl">{title}</h1>
              <Badge
                variant="secondary"
                className="rounded-none border border-success/30 bg-success/10 font-mono text-[10px] font-bold uppercase text-success"
              >
                {section.badge}
              </Badge>
            </div>
            {subtitle && <p className="font-mono text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {onWindowChange && (
            <div className="grid grid-cols-3 gap-px border-2 border-border bg-border">
              {section.windows.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => onWindowChange(tab.value as LeaderboardWindow)}
                  className={`border-none bg-background px-4 py-2 font-mono text-xs font-bold uppercase transition-colors hover:bg-accent ${
                    window === tab.value
                      ? "bg-primary/5 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <LeaderboardHero hero={hero} meta={meta} />
      {viewerEntry && <ViewerBadge entry={viewerEntry} />}
      <LeaderboardTable entries={entries} isLoading={isLoading} />

      <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-border bg-background p-4 font-mono text-xs text-muted-foreground">
        <p>
          {section.meta.updated}{" "}
          {meta?.generatedAt
            ? formatDistanceToNow(new Date(meta.generatedAt), { addSuffix: true })
            : section.meta.recent}
        </p>
        <p>
          {meta?.totalEntries
            ? `${meta.totalEntries.toLocaleString()} ${section.meta.competitors}`
            : null}
        </p>
      </div>

      {hasMore && (
        <Button
          onClick={loadMore}
          disabled={isFetchingMore}
          variant="outline"
          className="h-11 w-full rounded-none border-2 border-border font-mono text-sm font-bold uppercase hover:border-primary/50"
        >
          {isFetchingMore ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              {section.actions.loadingMore}
            </>
          ) : (
            section.actions.loadMore
          )}
        </Button>
      )}
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
  const { section } = leaderboardsConfig;

  if (hero.length === 0) {
    return null;
  }

  const range = meta?.periodStart ? formatRange(meta.periodStart, meta?.periodEnd ?? null) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hero.map((entry, index) => (
        <div
          key={entry.user.id}
          className={cn(
            "border-2 border-border bg-background p-6",
            index === 0 && "border-primary/50 bg-primary/5",
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center border-2",
                index === 0 ? "border-primary bg-primary/10" : "border-border bg-background",
              )}
            >
              <Trophy
                className={cn("h-6 w-6", index === 0 ? "text-primary" : "text-muted-foreground")}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-base font-bold">
                #{entry.rank} {entry.user.handle}
              </p>
              {range && <p className="truncate font-mono text-xs text-muted-foreground">{range}</p>}
            </div>
          </div>
          <div className="flex items-center justify-around border-2 border-border bg-background/50 py-4">
            <div className="text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {section.hero.score}
              </p>
              <p className="font-mono text-2xl font-bold">{formatScore(entry.score)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {section.hero.solved}
              </p>
              <p className="font-mono text-2xl font-bold">{entry.solved}</p>
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
  const { section } = leaderboardsConfig;

  return (
    <div className="flex items-center gap-3 border-2 border-primary/30 bg-primary/5 px-6 py-4 font-mono text-sm">
      <Send className="h-5 w-5 text-primary" />
      <p className="text-foreground">
        {section.viewer.prefix} <span className="font-bold text-primary">#{entry.rank}</span>{" "}
        {section.viewer.with}{" "}
        <span className="font-bold text-primary">{Math.round(entry.score)}</span>{" "}
        {section.viewer.points}
      </p>
    </div>
  );
}

type TableProps = {
  entries: LeaderboardEntry[];
  isLoading: boolean;
};

function LeaderboardTable({ entries, isLoading }: TableProps) {
  const { section } = leaderboardsConfig;

  const showSubmissions = entries.some((entry) => typeof entry.submissions === "number");
  const showAvgRuntime = entries.some(
    (entry) => typeof entry.avgRuntimeMs === "number" && entry.avgRuntimeMs !== null,
  );
  const showPenalty = entries.some(
    (entry) => typeof entry.timePenalty === "number" && entry.timePenalty !== null,
  );

  if (isLoading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center border-2 border-border bg-background p-16 font-mono text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
        {section.table.loading}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="border-2 border-dashed border-border bg-background p-16 text-center font-mono text-sm text-muted-foreground">
        {section.table.empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden border-2 border-border bg-background">
      <div className="hidden border-b-2 border-border bg-muted/30 font-mono text-xs font-bold uppercase text-muted-foreground lg:grid lg:grid-cols-12">
        <span className="col-span-1 px-6 py-4">{section.table.headers.rank}</span>
        <span className="col-span-4 px-6 py-4">{section.table.headers.competitor}</span>
        <span className="col-span-2 px-6 py-4">{section.table.headers.score}</span>
        <span className="col-span-2 px-6 py-4">{section.table.headers.solved}</span>
        {showSubmissions && (
          <span className="col-span-1 px-6 py-4">{section.table.headers.attempts}</span>
        )}
        {showPenalty && (
          <span className="col-span-1 px-6 py-4">{section.table.headers.penalty}</span>
        )}
        {showAvgRuntime && (
          <span className="col-span-1 px-6 py-4">{section.table.headers.runtime}</span>
        )}
      </div>
      <div className="divide-y-2 divide-border">
        {entries.map((entry, index) => (
          <div
            key={`${entry.user.id}-${entry.rank}-${index}`}
            className="grid grid-cols-2 items-center gap-3 px-6 py-5 font-mono text-sm transition-colors hover:bg-accent lg:grid-cols-12"
          >
            <div className="col-span-2 flex items-center gap-2 lg:col-span-1">
              <span className="text-base font-bold text-primary">#{entry.rank}</span>
            </div>
            <div className="col-span-2 flex items-center gap-3 lg:col-span-4">
              <Avatar className="h-11 w-11 rounded-none border-2 border-border">
                {entry.user.avatarUrl ? (
                  <AvatarImage src={entry.user.avatarUrl} alt={entry.user.handle} />
                ) : null}
                <AvatarFallback className="rounded-none bg-primary/10 font-mono text-xs font-bold uppercase text-primary">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/u/${entry.user.handle}`}
                  className="font-bold text-foreground hover:text-primary hover:underline"
                >
                  @{entry.user.handle}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RoleBadge role={entry.user.role} status={entry.user.status} />
                  {entry.user.country && <span>{formatCountry(entry.user.country)}</span>}
                </div>
              </div>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <p className="text-base font-bold">{formatScore(entry.score)}</p>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <p className="font-bold">{entry.solved}</p>
            </div>
            {showSubmissions && (
              <div className="col-span-1">
                {typeof entry.submissions === "number" ? entry.submissions : "–"}
              </div>
            )}
            {showPenalty && (
              <div className="col-span-1 text-xs text-muted-foreground">
                {typeof entry.timePenalty === "number" ? `${entry.timePenalty}` : "–"}
              </div>
            )}
            {showAvgRuntime && (
              <div className="col-span-1 text-xs text-muted-foreground">
                {entry.avgRuntimeMs ? `${Math.round(entry.avgRuntimeMs)} ms` : "–"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleBadge({ role, status }: { role: string; status: string }) {
  if (status === "SHADOW_BANNED") {
    return (
      <Badge variant="destructive" className="rounded-none border font-mono text-[10px] font-bold">
        Shadow Banned
      </Badge>
    );
  }
  if (role === "ADMIN") {
    return (
      <Badge variant="secondary" className="rounded-none border font-mono text-[10px] font-bold">
        Admin
      </Badge>
    );
  }
  if (role === "PROBLEM_CURATOR") {
    return (
      <Badge variant="outline" className="rounded-none border font-mono text-[10px] font-bold">
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
