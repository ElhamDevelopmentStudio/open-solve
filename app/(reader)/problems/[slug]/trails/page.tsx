import { Layers, MessageSquareText } from "@/components/icons";
import { TrailsBoard } from "@/components/trails/trails-board";
import { Button } from "@/components/ui/button";
import { problemsConfig } from "@/config/problems";
import { getCachedProblemDetail } from "@/lib/cache/problems";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { HydrationBoundary } from "@tanstack/react-query";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = { slug: string };

export default async function ProblemTrailsPage({ params }: { params: Params | Promise<Params> }) {
  const { slug } = await params;
  const caller = await createTRPCCaller();
  const problem = await getCachedProblemDetail(slug).catch(() => null);
  if (!problem) {
    notFound();
  }
  const hydration = await buildHydrationState([
    prefetchTrpcQuery(
      "trails.getForProblem",
      () => caller.trails.getForProblem({ problemId: problem.id }),
      {
        input: { problemId: problem.id },
      },
    ),
  ]);

  const { trails } = problemsConfig;

  return (
    <div className="space-y-12">
      <div className="space-y-6 border-2 border-border bg-background p-6">
        <div className="space-y-4">
          <div className="font-mono text-xs font-bold uppercase text-primary/80">
            <Layers className="mr-2 inline h-4 w-4" />
            {trails.badge}
          </div>
          <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-2xl font-black leading-tight text-transparent">
            {problem.title}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">{trails.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            className="h-10 rounded-none border-2 border-primary bg-primary px-8 font-mono text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
          >
            <Link href={`/problems/${slug}`}>{trails.actions.backToProblem}</Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-10 rounded-none border-2 border-border bg-transparent px-8 font-mono text-sm hover:border-primary/50 hover:bg-accent"
          >
            <Link href={`/problems/${slug}/discuss`}>
              <MessageSquareText className="mr-2 h-4 w-4" />
              {trails.actions.viewDiscussions}
            </Link>
          </Button>
        </div>
      </div>
      <HydrationBoundary state={hydration}>
        <TrailsBoard problemId={problem.id} />
      </HydrationBoundary>
    </div>
  );
}
