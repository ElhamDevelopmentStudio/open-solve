import { ArrowLeft, FileText } from "@/components/icons";
import { HydrationBoundary } from "@tanstack/react-query";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DiscussionDetailShell } from "@/components/discussions/discussion-detail-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { problemsConfig } from "@/config/problems";
import { getCachedProblemDetail } from "@/lib/cache/problems";
import { buildHydrationState, prefetchTrpcQuery } from "@/lib/react-query/server";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

type ProblemThreadPageParams = {
  slug: string;
  threadId: string;
};

export async function generateMetadata({
  params,
}: {
  params: ProblemThreadPageParams | Promise<ProblemThreadPageParams>;
}) {
  const { slug } = await params;
  return {
    title: `${slug} • Discussion thread`,
  };
}

export default async function ProblemThreadDetailPage({
  params,
}: {
  params: ProblemThreadPageParams | Promise<ProblemThreadPageParams>;
}) {
  const { slug, threadId } = await params;
  const caller = await createTRPCCaller();

  const [problem, thread] = await Promise.all([
    getCachedProblemDetail(slug).catch(() => null),
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

  const { discuss } = problemsConfig;

  return (
    <div className="space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-9 rounded-none font-mono text-sm text-muted-foreground hover:bg-accent hover:text-primary"
      >
        <Link href={`/problems/${slug}/discuss`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {discuss.thread.backLink}
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <HydrationBoundary state={hydration}>
          <DiscussionDetailShell threadId={threadId} />
        </HydrationBoundary>
        <aside className="space-y-4">
          <div className="space-y-4 border-2 border-border bg-background p-6">
            <div className="space-y-2">
              <div className="font-mono text-xs font-bold uppercase text-primary/80">
                {discuss.sidebar.problem}
              </div>
              <h2 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-xl font-black leading-tight text-transparent">
                {problem.title}
              </h2>
              {problem.difficulty ? (
                <Badge className="rounded-none border font-mono text-xs font-bold uppercase">
                  {problem.difficulty}
                </Badge>
              ) : null}
            </div>
            {problem.tags.length ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-xs font-bold uppercase text-primary/80">
                  <span>{discuss.sidebar.tags}</span>
                  <span>{problem.tags.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {problem.tags.map((tag) => (
                    <Badge
                      key={tag.slug}
                      variant="outline"
                      className="rounded-none border font-mono text-xs font-bold uppercase"
                    >
                      #{tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {problem.hasEditorial ? (
              <Button
                variant="outline"
                asChild
                className="h-10 w-full rounded-none border-2 border-border bg-transparent px-8 font-mono text-sm hover:border-primary/50 hover:bg-accent"
              >
                <Link href={`/problems/${slug}/editorial`}>
                  <FileText className="mr-2 h-4 w-4" />
                  {discuss.sidebar.editorial}
                </Link>
              </Button>
            ) : null}
            <div className="space-y-2 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
              <div className="font-mono text-xs font-bold uppercase text-primary/80">
                {discuss.sidebar.rules.title}
              </div>
              <ul className="list-disc space-y-1 pl-4">
                {discuss.sidebar.rules.items.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
