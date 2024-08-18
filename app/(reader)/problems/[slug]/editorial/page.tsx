import "katex/dist/katex.min.css";

import { Lock, MessageSquareText } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { problemsConfig } from "@/config/problems";
import { getCachedProblemDetail } from "@/lib/cache/problems";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { format } from "date-fns";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

type Params = { slug: string };

export default async function ProblemEditorialPage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { slug } = await params;
  const caller = await createTRPCCaller();
  const problem = await getCachedProblemDetail(slug).catch(() => null);
  if (!problem) {
    notFound();
  }
  const editorial = await caller.editorials.getByProblem({ slug }).catch(() => null);
  const releaseAt = editorial?.releaseAt ?? problem.editorialReleaseAt;
  const isReleased = editorial?.isReleased ?? problem.editorialIsReleased;
  const content =
    editorial?.content ?? (problem.editorialIsReleased ? problem.content.editorial : null);

  const { editorial: editorialConfig } = problemsConfig;

  return (
    <div className="space-y-12">
      <div className="space-y-6 border-2 border-border bg-background p-6">
        <div className="space-y-4">
          <div className="font-mono text-xs font-bold uppercase text-primary/80">
            {editorialConfig.badge}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="bg-linear-to-br from-foreground via-foreground to-foreground/70 bg-clip-text font-mono text-3xl font-black leading-tight text-transparent">
              {problem.title}
            </h1>
            {problem.difficulty ? (
              <Badge className="rounded-none border font-mono text-xs font-bold uppercase">
                {problem.difficulty}
              </Badge>
            ) : null}
            {problem.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag.slug}
                variant="outline"
                className="rounded-none border font-mono text-xs font-bold uppercase"
              >
                #{tag.name}
              </Badge>
            ))}
            <Badge
              variant={isReleased ? "secondary" : "outline"}
              className="ml-auto rounded-none border font-mono text-xs font-bold uppercase"
            >
              {isReleased ? editorialConfig.states.released : editorialConfig.states.locked}
            </Badge>
          </div>
          {releaseAt && !isReleased ? (
            <p className="font-mono text-sm text-muted-foreground">
              {editorialConfig.states.scheduledPrefix} {format(releaseAt, "PPP p")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            className="h-10 rounded-none border-2 border-primary bg-primary px-8 font-mono text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:shadow-md hover:shadow-primary/30"
          >
            <Link href={`/problems/${slug}`}>{editorialConfig.actions.backToProblem}</Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-10 rounded-none border-2 border-border bg-transparent px-8 font-mono text-sm hover:border-primary/50 hover:bg-accent"
          >
            <Link href={`/problems/${slug}/discuss`}>
              <MessageSquareText className="mr-2 h-4 w-4" />
              {editorialConfig.actions.viewDiscussions}
            </Link>
          </Button>
        </div>
      </div>

      {isReleased && content ? (
        <article className="prose prose-neutral max-w-none border-2 border-border bg-background p-6 font-mono text-sm text-foreground dark:prose-invert">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        </article>
      ) : (
        <div className="border-2 border-border bg-background p-10 text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 font-mono text-xl font-bold text-foreground">
            {editorialConfig.states.lockedTitle}
          </h2>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {releaseAt
              ? `${editorialConfig.states.lockedDescription} ${format(releaseAt, "PPP p")}.`
              : editorialConfig.states.lockedFallback}
          </p>
        </div>
      )}

      {problem.content.hints ? (
        <div className="space-y-4 border-2 border-border bg-background p-6">
          <h3 className="font-mono text-lg font-bold">{editorialConfig.hints.title}</h3>
          <div className="border-t border-border pt-4">
            <p className="whitespace-pre-line font-mono text-sm text-muted-foreground">
              {problem.content.hints}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
