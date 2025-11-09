import { ContestScoreboard } from "@/components/contests/contest-scoreboard";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export default async function ContestScoreboardPage({ params }: { params: Params | Promise<Params> }) {
  const { slug } = await params;
  const caller = await createTRPCCaller();

  let state;
  try {
    state = await buildHydrationState([
      prefetchTrpcQuery("contests.detail", () => caller.contests.detail({ slug }), { input: { slug } }),
    ]);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <HydrationBoundary state={state}>
      <ContestScoreboard slug={slug} />
    </HydrationBoundary>
  );
}

