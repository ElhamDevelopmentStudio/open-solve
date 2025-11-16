import "katex/dist/katex.min.css";

import { notFound } from "next/navigation";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format } from "date-fns";
import { getCachedProblemDetail } from "@/lib/cache/problems";

type Params = { slug: string };

export default async function ProblemEditorialPage({ params }: { params: Params | Promise<Params> }) {
  const { slug } = await params;
  const caller = await createTRPCCaller();
  const problem = await getCachedProblemDetail(slug).catch(() => null);
  if (!problem) {
    notFound();
  }
  const editorial = await caller.editorials.getByProblem({ slug }).catch(() => null);
  const releaseAt = editorial?.releaseAt ?? problem.editorialReleaseAt;
  const isReleased = editorial?.isReleased ?? problem.editorialIsReleased;
  const content = editorial?.content ?? (problem.editorialIsReleased ? problem.content.editorial : null);

  return (
    <div className="space-y-8 py-10">
      <header className="rounded-3xl border border-border/70 bg-card/80 p-6">
        <p className="text-xs uppercase text-muted-foreground">Editorial</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{problem.title}</h1>
          {problem.difficulty ? <Badge>{problem.difficulty}</Badge> : null}
          {problem.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.slug} variant="outline">
              #{tag.name}
            </Badge>
          ))}
          <Badge variant={isReleased ? "secondary" : "outline"} className="ml-auto">
            {isReleased ? "Released" : "Locked"}
          </Badge>
        </div>
        {releaseAt && !isReleased ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Scheduled to unlock {format(releaseAt, "PPP p")}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/problems/${slug}`}>Back to problem</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href={`/problems/${slug}/discuss`}>View discussions</Link>
          </Button>
        </div>
      </header>

      {isReleased && content ? (
        <article className="prose prose-neutral max-w-none rounded-3xl border border-border/60 bg-card/80 p-6 text-foreground dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>{content}</ReactMarkdown>
        </article>
      ) : (
        <div className="rounded-3xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
          <h2 className="text-xl font-semibold">Editorial locked</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {releaseAt ? `This write-up unlocks ${format(releaseAt, "PPP p")}.` : "Editors will publish this walkthrough soon."}
          </p>
        </div>
      )}

      {problem.content.hints ? (
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6">
          <h3 className="text-lg font-semibold">Hints refresher</h3>
          <Separator className="my-3" />
          <p className="text-sm text-muted-foreground whitespace-pre-line">{problem.content.hints}</p>
        </section>
      ) : null}
    </div>
  );
}
