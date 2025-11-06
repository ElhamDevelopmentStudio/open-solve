import type { Metadata } from "next";
import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { GlobalLeaderboardClient } from "@/components/leaderboards/leaderboard-client";
import type { LeaderboardEntry } from "@/lib/leaderboard/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LeaderboardWindow } from "@/lib/leaderboard/service";

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
    <div>
      <div className="space-y-3">
        <p className="text-xs uppercase text-muted-foreground">OpenSolve rankings</p>
        <h1 className="text-4xl font-semibold tracking-tight">Leaderboards</h1>
        <p className="text-sm text-muted-foreground">
          Discover the most consistent problem solvers across weekly, monthly, and all-time windows.
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {overview.map((window) => (
          <Card key={window.window}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base capitalize">{window.window.replace("_", " ")}</CardTitle>
              <Badge variant="secondary">Top performers</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {window.hero.length === 0 ? (
                <p className="text-muted-foreground">No data yet.</p>
              ) : (
                window.hero.map((entry) => (
                  <div key={entry.user.id} className="flex items-center justify-between">
                    <span>@{entry.user.handle}</span>
                    <span className="font-semibold">{Math.round(entry.score)}</span>
                  </div>
                ))
              )}
              <Button variant="ghost" size="sm" asChild className="w-full justify-between">
                <Link href={`/leaderboards/${window.window === "all_time" ? "global" : window.window}`}>
                  View board
                  <span aria-hidden>→</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Callouts() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Difficulty capsules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Compare how solvers perform on easy, medium, and hard sets independently.</p>
          <div className="flex gap-2">
            {(["easy", "medium", "hard"] as const).map((level) => (
              <Button key={level} variant="outline" asChild>
                <Link href={`/leaderboards/difficulty/${level}`}>{level}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tag spotlights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Track mastery for specific topics like DP, graphs, and arrays.</p>
          <div className="flex gap-2">
            {["graphs", "dp", "arrays"].map((slug) => (
              <Button key={slug} variant="outline" asChild>
                <Link href={`/leaderboards/tag/${slug}`}>#{slug}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
