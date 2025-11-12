import { HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { DiscussionDetailShell } from "@/components/discussions/discussion-detail-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type ProblemThreadPageParams = {
  slug: string;
  threadId: string;
};

export async function generateMetadata({ params }: { params: ProblemThreadPageParams | Promise<ProblemThreadPageParams> }) {
  const { slug } = await params;
  return {
    title: `${slug} • Discussion thread`,
  };
}

export default async function ProblemThreadDetailPage({ params }: { params: ProblemThreadPageParams | Promise<ProblemThreadPageParams> }) {
  const { slug, threadId } = await params;
  const caller = await createTRPCCaller();

  const [problem, thread] = await Promise.all([
    caller.problems.detail({ slug }).catch(() => null),
    caller.discussions.thread({ id: threadId }).catch(() => null),
  ]);

  if (!problem || !thread || thread.problem?.slug !== slug) {
    notFound();
  }

  const hydration = await buildHydrationState([
    prefetchTrpcQuery("discussions.thread", () => caller.discussions.thread({ id: threadId }), {
      input: { id: threadId },
    }),
    prefetchTrpcQuery("discussions.replies", () => caller.discussions.replies({ threadId }), {
      input: { threadId },
    }),
  ]);

  return (
    <div className="space-y-6 py-8">
      <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
        <Link href={`/problems/${slug}/discuss`}>
          <ArrowLeft className="h-4 w-4" /> Back to discussions
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <HydrationBoundary state={hydration}>
          <DiscussionDetailShell threadId={threadId} />
        </HydrationBoundary>
        <aside className="space-y-4 rounded-3xl border border-border/70 bg-card/60 p-6">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Problem</p>
            <h2 className="text-lg font-semibold leading-tight">{problem.title}</h2>
            {problem.difficulty ? <Badge className="mt-2">{problem.difficulty}</Badge> : null}
          </div>
          {problem.tags.length ? (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">Tags</span>
                <span>{problem.tags.length}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex flex-wrap gap-2 text-xs">
                {problem.tags.map((tag) => (
                  <Badge key={tag.slug} variant="outline">
                    #{tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {problem.hasEditorial ? (
            <Button variant="secondary" asChild className="w-full">
              <Link href={`/problems/${slug}/editorial`}>View editorial</Link>
            </Button>
          ) : null}
          <Separator />
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-semibold uppercase tracking-wide">House rules</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Share hints, not full solutions.</li>
              <li>Mark spoilers and be respectful.</li>
              <li>Report abuse so moderators can step in.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
