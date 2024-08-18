import { notFound } from "next/navigation";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { HydrationBoundary } from "@tanstack/react-query";
import { ProblemDiscussionPanel } from "@/components/discussions/problem-discussion-panel";
import { getCachedProblemDetail } from "@/lib/cache/problems";
import type { Metadata } from "next";
import { problemsConfig } from "@/config/problems";
import { MessageSquareText } from "@/components/icons";

type DiscussPageParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<DiscussPageParams> | DiscussPageParams;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug} • Discussions`,
  };
}

export default async function ProblemDiscussPage({
  params,
}: {
  params: Promise<DiscussPageParams> | DiscussPageParams;
}) {
  const { slug } = await params;
  const caller = await createTRPCCaller();
  let problem = null;
  try {
    problem = await getCachedProblemDetail(slug);
  } catch {
    problem = null;
  }
  if (!problem) {
    notFound();
  }
  const hydration = await buildHydrationState([
    prefetchTrpcQuery(
      "discussions.listByProblem",
      () => caller.discussions.listByProblem({ slug, sort: "top" }),
      { input: { slug, sort: "top" }, staleTime: publicContentQueryOptions.staleTime },
    ),
  ]);

  const { discuss } = problemsConfig;

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 border-2 border-primary/50 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-primary">
          <MessageSquareText className="h-4 w-4" />
          {discuss.badge}
        </div>
        <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-4xl font-black leading-tight text-transparent sm:text-5xl lg:text-6xl">
          {problem.title}
        </h1>
        <p className="max-w-2xl font-mono text-base text-muted-foreground">{discuss.description}</p>
      </div>
      <HydrationBoundary state={hydration}>
        <ProblemDiscussionPanel
          problem={{
            id: problem.id,
            slug: problem.slug,
            title: problem.title,
            difficulty: problem.difficulty,
            tags: problem.tags,
            hasEditorial: problem.hasEditorial,
          }}
        />
      </HydrationBoundary>
    </div>
  );
}
