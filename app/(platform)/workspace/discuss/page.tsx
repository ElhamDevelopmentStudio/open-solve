import Link from "next/link";
import { HydrationBoundary } from "@tanstack/react-query";

import { GlobalDiscussionsClient } from "@/components/discussions/global-discussions-client";
import { ArrowUpRight, MessageSquareText } from "@/components/icons";
import { discussionsConfig } from "@/config/discussions";
import { workspaceHubConfig } from "@/config/workspace-hub";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function WorkspaceDiscussPage() {
  const caller = await createTRPCCaller();
  const [metadata] = await Promise.all([caller.problems.filterMetadata()]);
  const hydration = await buildHydrationState([
    prefetchTrpcQuery(
      "discussions.listGlobal",
      () => caller.discussions.listGlobal({ tab: "trending" }),
      { input: { tab: "trending" }, staleTime: publicContentQueryOptions.staleTime },
    ),
  ]);

  const stats = [
    { label: workspaceHubConfig.discuss.stats.tags, value: metadata.tags.length.toString() },
    {
      label: workspaceHubConfig.discuss.stats.difficulty,
      value: metadata.difficulties.length.toString(),
    },
    {
      label: workspaceHubConfig.discuss.stats.defaultTab,
      value: discussionsConfig.global.tabs[0]?.label ?? "Trending",
    },
  ];

  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/80">
              {workspaceHubConfig.discuss.marker}
              <span className="inline-flex items-center gap-2 border-2 border-border bg-background px-3 py-1 text-[10px] tracking-[0.25em] text-muted-foreground">
                <MessageSquareText className="h-4 w-4 text-primary" />
                {workspaceHubConfig.discuss.badge}
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {workspaceHubConfig.discuss.headline.line1}
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {workspaceHubConfig.discuss.headline.line2}
              </span>
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              {workspaceHubConfig.discuss.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={workspaceHubConfig.discuss.actions.primary.href}
                className="inline-flex h-12 items-center justify-center border-2 border-primary bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
              >
                {workspaceHubConfig.discuss.actions.primary.label}
              </Link>
              <Link
                href={workspaceHubConfig.discuss.actions.secondary.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center border-2 border-border bg-background px-6 font-mono text-xs font-bold uppercase text-foreground transition-all hover:border-primary/50 hover:bg-accent"
              >
                {workspaceHubConfig.discuss.actions.secondary.label}
              </Link>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:max-w-md">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-2 border-border bg-background px-4 py-3 text-left"
              >
                <p className="text-[11px] uppercase text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
              {workspaceHubConfig.discuss.tabsTitle}
            </p>
            <h2 className="text-3xl font-black tracking-tight">
              {discussionsConfig.global.headline.line1} {discussionsConfig.global.headline.line2}
            </h2>
            <p className="text-sm text-muted-foreground">{discussionsConfig.global.description}</p>
          </div>
          <div className="inline-flex items-center gap-2 border-2 border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <ArrowUpRight className="h-4 w-4 text-primary" />
            {workspaceHubConfig.discuss.badge}
          </div>
        </div>

        <div className="grid gap-px bg-border/40 md:grid-cols-2">
          {discussionsConfig.global.tabs.map((tab) => (
            <div
              key={tab.value}
              className="border-2 border-border bg-background p-5 transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                {tab.label}
              </p>
              <p className="mt-2 text-base font-bold uppercase">{tab.description}</p>
            </div>
          ))}
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
