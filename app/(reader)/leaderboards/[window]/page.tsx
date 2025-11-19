import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { GlobalLeaderboardClient } from "@/components/leaderboards/leaderboard-client";
import type { LeaderboardWindow } from "@/lib/leaderboard/service";

const WINDOW_MAP: Record<string, LeaderboardWindow> = {
  global: "all_time",
  monthly: "monthly",
  weekly: "weekly",
};

type Params = { window: string };

export async function generateMetadata({
  params,
}: {
  params: Params | Promise<Params>;
}): Promise<Metadata> {
  const resolved = await params;
  if (!WINDOW_MAP[resolved.window]) {
    return { title: "Leaderboards | OpenSolve" };
  }
  const label =
    resolved.window === "global"
      ? "All time"
      : resolved.window.charAt(0).toUpperCase() + resolved.window.slice(1);
  return {
    title: `${label} Leaderboard | OpenSolve`,
    description: `Top performers on the ${label.toLowerCase()} leaderboard.`,
  };
}

export default async function LeaderboardWindowPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { window } = await params;
  const resolved = WINDOW_MAP[window];
  if (!resolved) {
    notFound();
  }
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery(
      "leaderboard.global",
      () => caller.leaderboard.global({ window: resolved, limit: 30 }),
      {
        input: { window: resolved, limit: 30 },
      },
    ),
  ]);
  return (
    <HydrationBoundary state={state}>
      <GlobalLeaderboardClient initialWindow={resolved} />
    </HydrationBoundary>
  );
}
