import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HydrationBoundary } from "@tanstack/react-query";

import { DifficultyLeaderboardClient } from "@/components/leaderboards/leaderboard-client";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import type { LeaderboardWindow } from "@/lib/leaderboard/service";
import { DIFFICULTIES } from "@/lib/problems/constants";

const DEFAULT_WINDOW: LeaderboardWindow = "all_time";

type Params = { level: string };

export async function generateMetadata({
  params,
}: {
  params: Params | Promise<Params>;
}): Promise<Metadata> {
  const { level } = await params;
  const upper = level.toUpperCase();
  if (!DIFFICULTIES.includes(upper as (typeof DIFFICULTIES)[number])) {
    return { title: "Difficulty Leaderboard | OpenSolve" };
  }
  const label = upper.charAt(0) + upper.slice(1).toLowerCase();
  return {
    title: `${label} Difficulty Leaderboard | OpenSolve`,
    description: `Top performers on ${label.toLowerCase()} problems.`,
  };
}

export default async function DifficultyLeaderboardPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { level } = await params;
  const upper = level.toUpperCase();
  if (!DIFFICULTIES.includes(upper as (typeof DIFFICULTIES)[number])) {
    notFound();
  }
  const difficulty = upper as (typeof DIFFICULTIES)[number];
  const caller = await createTRPCCaller();
  const state = await buildHydrationState([
    prefetchTrpcQuery(
      "leaderboard.difficulty",
      () => caller.leaderboard.difficulty({ difficulty, window: DEFAULT_WINDOW, limit: 30 }),
      {
        input: { difficulty, window: DEFAULT_WINDOW, limit: 30 },
      },
    ),
  ]);
  const label = difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
  return (
    <HydrationBoundary state={state}>
      <DifficultyLeaderboardClient
        initialWindow={DEFAULT_WINDOW}
        title={`${label} leaderboard`}
        subtitle={`Focused look at ${label.toLowerCase()} practice`}
        difficulty={difficulty}
      />
    </HydrationBoundary>
  );
}
