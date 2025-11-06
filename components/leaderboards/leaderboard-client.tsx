"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import type { LeaderboardEntry, LeaderboardWindow } from "@/lib/leaderboard/service";
import { cn } from "@/lib/utils";
import { useLeaderboardRealtime } from "@/hooks/use-leaderboard-realtime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Medal, Trophy } from "lucide-react";

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

export function DifficultyLeaderboardClient({ initialWindow, title, subtitle, difficulty }: PracticeLeaderboardProps) {
  const [window, setWindow] = useState<LeaderboardWindow>(initialWindow);
  const utils = trpc.useUtils();
  const query = trpc.leaderboard.difficulty.useInfiniteQuery(
    { window, difficulty: difficulty as any, limit: PAGE_SIZE },
    {
      getNextPageParam: (last) => last.nextCursor,
    },
  );

  useLeaderboardRealtime((updatedWindow) => {
    if (updatedWindow === window) {
      void utils.leaderboard.difficulty.invalidate({ window, difficulty: difficulty as any, limit: PAGE_SIZE });
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

export function TagLeaderboardClient({ initialWindow, title, subtitle, slug }: PracticeLeaderboardProps) {
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Live
            </Badge>
          </div>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {onWindowChange ? (
          <Tabs value={window} onValueChange={(value) => onWindowChange(value as LeaderboardWindow)}>
            <TabsList className="flex flex-wrap">
              {WINDOW_TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="capitalize">
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
      <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
        <p>
          Updated {meta?.generatedAt ? formatDistanceToNow(new Date(meta.generatedAt), { addSuffix: true }) : "recently"}
        </p>
        <p>{meta?.totalEntries ? `${meta.totalEntries.toLocaleString()} competitors` : null}</p>
      </div>
      {hasMore ? (
        <Button onClick={loadMore} disabled={isFetchingMore} variant="outline" className="w-full">
          {isFetchingMore ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading more
            </>
          ) : (
            "Load more"
          )}
        </Button>
      ) : null}
    </div>
  );
}

function LeaderboardHero({ hero, meta }: { hero: LeaderboardEntry[]; meta?: { periodStart: Date | null; periodEnd: Date | null } | null }) {
  if (hero.length === 0) {
    return null;
  }
  const range = meta?.periodStart ? formatRange(meta.periodStart, meta?.periodEnd ?? null) : null;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {hero.map((entry, index) => (
        <Card key={entry.user.id} className={cn(index === 0 && "border-primary/60 shadow-lg shadow-primary/20")}
        >
          <CardHeader className="flex flex-row items-center gap-3">
            <Medal className={cn("h-5 w-5", index === 0 ? "text-primary" : "text-muted-foreground")}
            />
            <div>
              <CardTitle className="text-base">
                #{entry.rank} {entry.user.handle}
              </CardTitle>
              {range ? <p className="text-xs text-muted-foreground">{range}</p> : null}
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-between text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-lg font-semibold">{formatScore(entry.score)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Solved</p>
              <p className="text-lg font-semibold">{entry.solved}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type ViewerBadgeProps = {
  entry: LeaderboardEntry;
};

function ViewerBadge({ entry }: ViewerBadgeProps) {
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
      You’re currently #{entry.rank} with {Math.round(entry.score)} pts.
    </div>
  );
}

type TableProps = {
  entries: LeaderboardEntry[];
  isLoading: boolean;
};

function LeaderboardTable({ entries, isLoading }: TableProps) {
  const showSubmissions = entries.some((entry) => typeof entry.submissions === "number");
  const showAvgRuntime = entries.some((entry) => typeof entry.avgRuntimeMs === "number" && entry.avgRuntimeMs !== null);
  const showPenalty = entries.some((entry) => typeof entry.timePenalty === "number" && entry.timePenalty !== null);

  if (isLoading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading leaderboard…
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          Leaderboard entries will appear once submissions are available.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="hidden text-xs font-medium uppercase text-muted-foreground/80 lg:grid lg:grid-cols-12">
        <span className="col-span-1 px-4 py-3">Rank</span>
        <span className="col-span-4 px-4 py-3">Competitor</span>
        <span className="col-span-2 px-4 py-3">Score</span>
        <span className="col-span-2 px-4 py-3">Solved</span>
        {showSubmissions ? <span className="col-span-1 px-4 py-3">Attempts</span> : null}
        {showPenalty ? <span className="col-span-1 px-4 py-3">Penalty</span> : null}
        {showAvgRuntime ? <span className="col-span-1 px-4 py-3">Avg runtime</span> : null}
      </div>
      <div className="divide-y">
        {entries.map((entry, index) => (
          <div
            key={`${entry.user.id}-${entry.rank}-${index}`}
            className="grid grid-cols-2 items-center gap-2 px-4 py-4 text-sm lg:grid-cols-12"
          >
            <div className="col-span-2 flex items-center gap-2 lg:col-span-1">
              <span className="font-semibold">#{entry.rank}</span>
            </div>
            <div className="col-span-2 flex items-center gap-3 lg:col-span-4">
              <Avatar className="h-10 w-10">
                {entry.user.avatarUrl ? <AvatarImage src={entry.user.avatarUrl} alt={entry.user.handle} /> : null}
                <AvatarFallback>{entry.user.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <Link href={`/u/${entry.user.handle}`} className="font-medium text-primary hover:underline">
                  @{entry.user.handle}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RoleBadge role={entry.user.role} status={entry.user.status} />
                  {entry.user.country ? <span>{formatCountry(entry.user.country)}</span> : null}
                </div>
              </div>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <p className="font-semibold">{formatScore(entry.score)}</p>
            </div>
            <div className="col-span-1 lg:col-span-2">
              <p>{entry.solved}</p>
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
    return <Badge variant="destructive">shadow banned</Badge>;
  }
  if (role === "ADMIN") {
    return <Badge variant="secondary">admin</Badge>;
  }
  if (role === "PROBLEM_CURATOR") {
    return <Badge variant="outline">curator</Badge>;
  }
  return <Badge variant="outline">member</Badge>;
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
