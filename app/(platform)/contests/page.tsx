import { ContestsOverview } from "@/components/contests/contests-overview";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { HydrationBoundary } from "@tanstack/react-query";

export const dynamic = "force-dynamic";

export default async function ContestsPage() {
  const caller = await createTRPCCaller();

  const state = await buildHydrationState([
    prefetchTrpcQuery("contests.overview", () => caller.contests.overview()),
  ]);

  return (
    <HydrationBoundary state={state}>
      <ContestsOverview />
    </HydrationBoundary>
  );
}
