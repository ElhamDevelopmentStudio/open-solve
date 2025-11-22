import type { Metadata } from "next";
import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";

import { GlobalLeaderboardClient } from "@/components/leaderboards/leaderboard-client";
import { ArrowRight, Hash, TrendUp, Trophy } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { leaderboardsConfig } from "@/config/leaderboards";
import { workspaceHubConfig } from "@/config/workspace-hub";
import type { LeaderboardEntry, LeaderboardWindow } from "@/lib/leaderboard/service";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

const DEFAULT_WINDOW: LeaderboardWindow = "all_time";
type Metric = { label: string; value: string };

export const metadata: Metadata = {
  title: "Workspace Leaderboards | OpenSolve",
  description: "Operator view of global rankings, tag spotlights, and difficulty-specific boards.",
};

export default async function WorkspaceLeaderboardsPage() {
  const caller = await createTRPCCaller();
  const overview = await caller.leaderboard.overview();
  const state = await buildHydrationState([
    prefetchTrpcQuery(
      "leaderboard.global",
      () => caller.leaderboard.global({ window: DEFAULT_WINDOW, limit: 30 }),
      {
        input: { window: DEFAULT_WINDOW, limit: 30 },
      },
    ),
  ]);

  const podiumCount = overview.reduce((count, window) => count + window.hero.length, 0);
  const defaultWindowLabel =
    leaderboardsConfig.section.windows.find((window) => window.value === DEFAULT_WINDOW)?.label ??
    DEFAULT_WINDOW;
  const stats = [
    { label: workspaceHubConfig.leaderboards.stats.windows, value: overview.length.toString() },
    { label: workspaceHubConfig.leaderboards.stats.podiums, value: podiumCount.toString() },
    {
      label: workspaceHubConfig.leaderboards.stats.defaultWindow,
      value: defaultWindowLabel,
    },
  ];

  return (
    <div className="space-y-10 font-mono text-foreground">
      <Hero overview={overview} stats={stats} />
      <HydrationBoundary state={state}>
        <GlobalLeaderboardClient initialWindow={DEFAULT_WINDOW} />
      </HydrationBoundary>
      <Callouts />
    </div>
  );
}

type OverviewCard = {
  window: string;
  hero: LeaderboardEntry[];
};

function Hero({ overview, stats }: { overview: OverviewCard[]; stats: Metric[] }) {
  return (
    <section className="space-y-6">
      <div className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
              {workspaceHubConfig.leaderboards.marker}
              <span className="inline-flex items-center gap-2 border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <Trophy className="h-4 w-4 text-primary" />
                {workspaceHubConfig.leaderboards.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {workspaceHubConfig.leaderboards.headline.line1}
              <br />
              {workspaceHubConfig.leaderboards.headline.line2}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {workspaceHubConfig.leaderboards.headline.line3}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {workspaceHubConfig.leaderboards.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="h-12 rounded-none border-2 border-primary bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                <Link href={workspaceHubConfig.leaderboards.actions.primary.href}>
                  {workspaceHubConfig.leaderboards.actions.primary.label}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-none border-2 border-border bg-background px-6 font-mono text-xs font-bold uppercase text-foreground transition-all hover:border-primary/50 hover:bg-accent"
              >
                <Link href={workspaceHubConfig.leaderboards.actions.secondary.href}>
                  {workspaceHubConfig.leaderboards.actions.secondary.label}
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-2 border-border bg-background px-4 py-3 text-left"
              >
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {workspaceHubConfig.leaderboards.overview.title}
            </p>
            <h2 className="text-3xl font-black tracking-tight">
              {workspaceHubConfig.leaderboards.headline.line2} windows
            </h2>
            <p className="text-sm text-muted-foreground">
              {workspaceHubConfig.leaderboards.overview.description}
            </p>
          </div>
          <Badge className="rounded-none border-2 border-border bg-background px-3 py-1 font-mono text-[10px] font-bold uppercase">
            {overview.length} windows
          </Badge>
        </div>

        {overview.length === 0 ? (
          <div className="border-2 border-dashed border-border bg-background p-10 text-center text-sm text-muted-foreground">
            {workspaceHubConfig.leaderboards.overview.empty}
          </div>
        ) : (
          <div className="grid gap-px bg-border/40 md:grid-cols-2 lg:grid-cols-3">
            {overview.map((window) => (
              <div
                key={window.window}
                className="flex h-full flex-col justify-between border-2 border-border bg-background p-6 transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                      {window.window.replace("_", " ")}
                    </p>
                    <p className="mt-1 text-lg font-black uppercase">Top 3 snapshot</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded-none border font-mono text-[10px] font-bold uppercase"
                  >
                    Live
                  </Badge>
                </div>
                <div className="mt-4 space-y-3 border-2 border-border bg-background/60 p-4">
                  {window.hero.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {leaderboardsConfig.global.overview.emptyState}
                    </p>
                  ) : (
                    window.hero.map((entry) => (
                      <div
                        key={entry.user.id}
                        className="flex items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <Trophy className="h-4 w-4 text-primary" />
                          <span className="font-bold">@{entry.user.handle}</span>
                        </div>
                        <span className="text-sm font-bold">
                          {Math.round(entry.score).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 h-10 w-full justify-between rounded-none border-2 border-border font-mono text-xs font-bold uppercase hover:border-primary/50"
                >
                  <Link
                    href={`/leaderboards/${window.window === "all_time" ? "global" : window.window}`}
                  >
                    {leaderboardsConfig.section.actions.viewFull}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Callouts() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="border-2 border-border bg-background p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-primary bg-primary/10">
            <TrendUp className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-mono text-base font-bold">
            {workspaceHubConfig.leaderboards.callouts.difficulty.title}
          </h3>
        </div>
        <p className="mb-4 font-mono text-sm text-muted-foreground">
          {leaderboardsConfig.global.callouts.difficulty.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {workspaceHubConfig.leaderboards.callouts.difficulty.levels.map((level) => (
            <Button
              key={level}
              variant="outline"
              size="sm"
              asChild
              className="h-9 rounded-none border-2 border-border font-mono text-xs font-bold uppercase hover:border-primary/50"
            >
              <Link href={`/leaderboards/difficulty/${level}`}>{level}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="border-2 border-border bg-background p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-primary bg-primary/10">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-mono text-base font-bold">
            {workspaceHubConfig.leaderboards.callouts.tags.title}
          </h3>
        </div>
        <p className="mb-4 font-mono text-sm text-muted-foreground">
          {leaderboardsConfig.global.callouts.tags.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {workspaceHubConfig.leaderboards.callouts.tags.featured.map((slug) => (
            <Button
              key={slug}
              variant="outline"
              size="sm"
              asChild
              className="h-9 rounded-none border-2 border-border font-mono text-xs font-bold hover:border-primary/50"
            >
              <Link href={`/leaderboards/tag/${slug}`}>#{slug}</Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
