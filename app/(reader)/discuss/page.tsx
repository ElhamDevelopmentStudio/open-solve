import { HydrationBoundary } from "@tanstack/react-query";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { GlobalDiscussionsClient } from "@/components/discussions/global-discussions-client";

export const dynamic = "force-dynamic";

export default async function GlobalDiscussPage() {
  const caller = await createTRPCCaller();
  const [metadata] = await Promise.all([
    caller.problems.filterMetadata(),
  ]);
  const hydration = await buildHydrationState([
    prefetchTrpcQuery(
      "discussions.listGlobal",
      () => caller.discussions.listGlobal({ tab: "trending" }),
      { input: { tab: "trending" }, staleTime: publicContentQueryOptions.staleTime },
    ),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-10">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Community</p>
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">Global Discussions</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Share hints, ask for help, and talk platform meta with the OpenSolve community
        </p>
      </div>
      <HydrationBoundary state={hydration}>
        <GlobalDiscussionsClient
          tagOptions={metadata.tags.map((tag) => ({ slug: tag.slug, name: tag.name }))}
          difficultyOptions={metadata.difficulties}
        />
      </HydrationBoundary>
    </div>
  );
}
