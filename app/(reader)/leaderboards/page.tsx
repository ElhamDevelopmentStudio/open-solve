import { GlobalLeaderboardClient } from "@/components/leaderboards/leaderboard-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LeaderboardEntry, LeaderboardWindow } from "@/lib/leaderboard/service";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import Link from "next/link";

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
    <div className="space-y-10">
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
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">OpenSolve Rankings</p>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Leaderboards</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Discover the most consistent problem solvers across weekly, monthly, and all-time windows.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {overview.map((window) => (
          <div key={window.window} className="premium-card space-y-4 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold capitalize">{window.window.replace("_", " ")}</h3>
              <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase">
                Top 3
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              {window.hero.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground">No data yet</p>
              ) : (
                window.hero.map((entry, idx) => (
                  <div key={entry.user.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-card/30 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                      <span className="font-medium">@{entry.user.handle}</span>
                    </div>
                    <span className="font-semibold">{Math.round(entry.score)}</span>
                  </div>
                ))
              )}
            </div>
            <Button variant="ghost" size="sm" asChild className="w-full justify-between rounded-xl">
              <Link href={`/leaderboards/${window.window === "all_time" ? "global" : window.window}`}>
                View Full Board
                <span aria-hidden>→</span>
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Callouts() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="premium-card space-y-4 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Badge className="h-6 w-6 rounded-md bg-primary text-[10px] font-bold">D</Badge>
          </div>
          <h3 className="text-lg font-semibold">Difficulty Capsules</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Compare how solvers perform on easy, medium, and hard sets independently.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["easy", "medium", "hard"] as const).map((level) => (
            <Button key={level} variant="outline" size="sm" asChild className="rounded-xl capitalize">
              <Link href={`/leaderboards/difficulty/${level}`}>{level}</Link>
            </Button>
          ))}
        </div>
      </div>
      <div className="premium-card space-y-4 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10">
            <Badge className="h-6 w-6 rounded-md bg-secondary text-[10px] font-bold">#</Badge>
          </div>
          <h3 className="text-lg font-semibold">Tag Spotlights</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Track mastery for specific topics like DP, graphs, and arrays.
        </p>
        <div className="flex flex-wrap gap-2">
          {["graphs", "dp", "arrays"].map((slug) => (
            <Button key={slug} variant="outline" size="sm" asChild className="rounded-xl">
              <Link href={`/leaderboards/tag/${slug}`}>#{slug}</Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
