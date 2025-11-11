import { notFound } from "next/navigation";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { HydrationBoundary } from "@tanstack/react-query";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { TrailsBoard } from "@/components/trails/trails-board";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Params = { slug: string };

export default async function ProblemTrailsPage({ params }: { params: Params | Promise<Params> }) {
  const { slug } = await params;
  const caller = await createTRPCCaller();
  const problem = await caller.problems.detail({ slug }).catch(() => null);
  if (!problem) {
    notFound();
  }
  const hydration = await buildHydrationState([
    prefetchTrpcQuery("trails.getForProblem", () => caller.trails.getForProblem({ problemId: problem.id }), {
      input: { problemId: problem.id },
    }),
  ]);
  return (
    <div className="space-y-8 py-10">
      <header className="rounded-3xl border border-border/70 bg-card/80 p-6">
        <p className="text-xs uppercase text-muted-foreground">Approach trails</p>
        <h1 className="text-2xl font-semibold">{problem.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Map the insights solvers used to unlock this problem and contribute your own breadcrumb.
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild>
            <Link href={`/problems/${slug}`}>Back to problem</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/problems/${slug}/discuss`}>View discussions</Link>
          </Button>
        </div>
      </header>
      <HydrationBoundary state={hydration}>
        <TrailsBoard problemId={problem.id} />
      </HydrationBoundary>
    </div>
  );
}
