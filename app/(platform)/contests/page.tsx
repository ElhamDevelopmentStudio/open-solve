import { HydrationBoundary } from "@tanstack/react-query";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { ContestDashboard } from "@/components/contests/contest-dashboard";

export const dynamic = "force-dynamic";

export default async function ContestsPage() {
  const caller = await createTRPCCaller();
  const overview = await caller.contests.overview();
  const initialSlug =
    overview.featured?.slug ??
    overview.live[0]?.slug ??
    overview.upcoming[0]?.slug ??
    overview.past[0]?.slug ??
    null;

  const state = await buildHydrationState([
    prefetchTrpcQuery("contests.overview", () => caller.contests.overview()),
    ...(initialSlug
      ? [
          prefetchTrpcQuery(
            "contests.detail",
            () => caller.contests.detail({ slug: initialSlug }),
            { input: { slug: initialSlug } },
          ),
        ]
      : []),
  ]);

  return (
    <HydrationBoundary state={state}>
      <ContestDashboard initialSlug={initialSlug ?? undefined} />
    </HydrationBoundary>
  );
}
