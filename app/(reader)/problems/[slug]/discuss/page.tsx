import { notFound } from "next/navigation";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { publicContentQueryOptions } from "@/lib/react-query/policies";
import { HydrationBoundary } from "@tanstack/react-query";
import { ProblemDiscussionPanel } from "@/components/discussions/problem-discussion-panel";
import { getCachedProblemDetail } from "@/lib/cache/problems";
import type { Metadata } from "next";

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
  return (
    <div className="space-y-8 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase text-muted-foreground">Problem</p>
        <h1 className="text-2xl font-semibold">{problem.title}</h1>
        <p className="text-sm text-muted-foreground">
          Discuss hints, tricky cases, and approaches with the community.
        </p>
      </header>
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
