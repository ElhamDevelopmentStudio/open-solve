import { HydrationBoundary } from "@tanstack/react-query";

import { GlobalDiscussionsClient } from "@/components/discussions/global-discussions-client";
import { MessageSquareText } from "@/components/icons";
import { discussionsConfig } from "@/config/discussions";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function GlobalDiscussPage() {
  const caller = await createTRPCCaller();
  const [metadata] = await Promise.all([caller.problems.filterMetadata()]);
  const hydration = await buildHydrationState([
    prefetchTrpcQuery(
      "discussions.listGlobal",
      () => caller.discussions.listGlobal({ tab: "trending" }),
      { input: { tab: "trending" }, staleTime: publicContentQueryOptions.staleTime },
    ),
  ]);

  const { global } = discussionsConfig;

  return (
    <div className="space-y-8">
      <section className="border-2 border-border bg-background p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 border-2 border-primary/50 bg-primary/5 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-primary">
            <MessageSquareText className="h-3.5 w-3.5" />
            {global.badge}
          </div>
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
      </section>

      <HydrationBoundary state={hydration}>
        <GlobalDiscussionsClient
          tagOptions={metadata.tags.map((tag) => ({ slug: tag.slug, name: tag.name }))}
          difficultyOptions={metadata.difficulties}
        />
      </HydrationBoundary>
    </div>
  );
}
