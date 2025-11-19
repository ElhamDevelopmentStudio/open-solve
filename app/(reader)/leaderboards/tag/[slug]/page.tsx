import type { Metadata } from "next";
import { HydrationBoundary } from "@tanstack/react-query";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { TagLeaderboardClient } from "@/components/leaderboards/leaderboard-client";
import type { LeaderboardWindow } from "@/lib/leaderboard/service";

const DEFAULT_WINDOW: LeaderboardWindow = "all_time";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Params | Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `#${slug} Leaderboard | OpenSolve`,
    description: `See who’s dominating the #${slug} topic.`,
  };
}

export default async function TagLeaderboardPage({ params }: { params: Params | Promise<Params> }) {
  const { slug } = await params;
  const caller = await createTRPCCaller();
  const initial = await caller.leaderboard.tag({ slug, window: DEFAULT_WINDOW, limit: 30 });
  const state = await buildHydrationState([
    prefetchTrpcQuery("leaderboard.tag", () => Promise.resolve(initial), {
      input: { slug, window: DEFAULT_WINDOW, limit: 30 },
    }),
  ]);
  return (
    <HydrationBoundary state={state}>
      <TagLeaderboardClient
        initialWindow={DEFAULT_WINDOW}
        title={`#${slug}`}
        subtitle={initial?.subtitle}
        slug={slug}
      />
    </HydrationBoundary>
  );
}
