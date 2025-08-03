import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight, Hash, TrendUp, Trophy } from "@/components/icons";
import { GlobalLeaderboardClient } from "@/components/leaderboards/leaderboard-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { leaderboardsConfig } from "@/config/leaderboards";
import type { LeaderboardEntry, LeaderboardWindow } from "@/lib/leaderboard/service";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

const DEFAULT_WINDOW: LeaderboardWindow = "all_time";

export const metadata: Metadata = {
  title: "Leaderboards | OpenSolve",
  description: "Track global rankings, tags, and difficulty-specific leaderboards.",
};

export default async function LeaderboardsPage() {
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

  return (
    <div className="space-y-8">
      <Hero overview={overview} />
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

function Hero({ overview }: { overview: OverviewCard[] }) {
  const { global } = leaderboardsConfig;

  return (
    <section className="space-y-6">
      <div className="border-2 border-border bg-background p-8">
        <div className="mb-6 inline-flex items-center gap-2 border-2 border-primary/50 bg-primary/5 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-primary">
          <Trophy className="h-3.5 w-3.5" />
          {global.badge}
        </div>

        <div className="mb-6 space-y-4">
          <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-4xl font-black leading-tight tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            {global.headline.line1}
            <br />
            {global.headline.line2}
          </h1>
          <p className="max-w-3xl font-mono text-sm leading-relaxed text-muted-foreground">
            {global.description}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overview.map((window) => (
          <div key={window.window} className="border-2 border-border bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-base font-bold uppercase">
                {window.window.replace("_", " ")}
              </h3>
              <Badge
                variant="secondary"
                className="rounded-none border font-mono text-[10px] font-bold uppercase"
              >
                Top 3
              </Badge>
            </div>
            <div className="space-y-3 border-2 border-border bg-background/50 p-4 font-mono text-sm">
              {window.hero.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground">
                  {global.overview.emptyState}
                </p>
              ) : (
                window.hero.map((entry, idx) => (
                  <div
                    key={entry.user.id}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">#{idx + 1}</span>
                      <span className="text-foreground">@{entry.user.handle}</span>
                    </div>
                    <span className="font-bold">{Math.round(entry.score)}</span>
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
    </section>
  );
}

function Callouts() {
  const { global } = leaderboardsConfig;

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="border-2 border-border bg-background p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-primary bg-primary/10">
            <TrendUp className="h-5 w-5 text-primary" />
          </div>
          <h3 className="font-mono text-base font-bold">{global.callouts.difficulty.title}</h3>
        </div>
        <p className="mb-4 font-mono text-sm text-muted-foreground">
          {global.callouts.difficulty.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {global.callouts.difficulty.levels.map((level) => (
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
          <h3 className="font-mono text-base font-bold">{global.callouts.tags.title}</h3>
        </div>
        <p className="mb-4 font-mono text-sm text-muted-foreground">
          {global.callouts.tags.description}
        </p>
        <div className="flex flex-wrap gap-2">
          {global.callouts.tags.featured.map((slug) => (
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
