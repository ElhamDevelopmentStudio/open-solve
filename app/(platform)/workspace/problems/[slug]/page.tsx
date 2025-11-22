import Link from "next/link";
import { notFound } from "next/navigation";
import { workspaceConfig } from "@/config/workspace";
import { ProblemReader } from "@/components/problems/problem-reader";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { getCachedProblemDetail } from "@/lib/cache/problems";
import type { ProblemDetailPayload } from "@/lib/trpc/router/problems";
import { formatDistanceToNow } from "date-fns";

export { generateMetadata } from "@/app/(reader)/problems/[slug]/page";

export default async function WorkspaceProblemDetailPage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const resolvedParams = await resolveParams(params);
  const session = await getSession();
  const viewerHasSession = Boolean(session);
  let problem: ProblemDetailPayload | null = null;
  try {
    problem = await fetchProblem(resolvedParams.slug, viewerHasSession);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "NOT_FOUND"
    ) {
      notFound();
    }
    throw error;
  }

  if (!problem) {
    notFound();
  }

  const stats = {
    difficulty: problem.difficulty ?? "Unrated",
    acceptance:
      problem.stats?.acceptanceRate != null
        ? `${Math.round(problem.stats.acceptanceRate * 100)}%`
        : "—",
    submissions: problem.stats?.submissionCount.toLocaleString() ?? "0",
    version: `v${problem.version.number}`,
  };

  const lastSubmission = problem.lastSubmissionAt
    ? formatDistanceToNow(new Date(problem.lastSubmissionAt), { addSuffix: true })
    : "No submissions yet";

  return (
    <div className="space-y-10 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.35em] text-primary/70">
            {workspaceConfig.detail.hero.marker}
            <Badge variant="outline" className="text-[10px] uppercase">
              {stats.difficulty}
            </Badge>
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {problem.title}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {workspaceConfig.detail.hero.description}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={workspaceConfig.detail.hero.primaryCta.anchor}
              className="border-2 border-primary bg-primary px-6 py-3 text-xs font-bold uppercase text-primary-foreground"
            >
              {workspaceConfig.detail.hero.primaryCta.label}
            </Link>
            <Link
              href={`/problems/${problem.slug}/discuss`}
              className="border-2 border-border px-6 py-3 text-xs font-bold uppercase"
            >
              {workspaceConfig.detail.hero.secondaryCta.label}
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <StatBlock label={workspaceConfig.detail.stats.difficulty} value={stats.difficulty} />
            <StatBlock label={workspaceConfig.detail.stats.acceptance} value={stats.acceptance} />
            <StatBlock label={workspaceConfig.detail.stats.submissions} value={stats.submissions} />
            <StatBlock label={workspaceConfig.detail.stats.version} value={stats.version} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="font-bold uppercase">{workspaceConfig.detail.meta.tagsLabel}:</span>
            {problem.tags.length ? (
              problem.tags.map((tag) => (
                <Badge key={tag.slug} variant="outline" className="text-[10px] uppercase">
                  {tag.name}
                </Badge>
              ))
            ) : (
              <span>Untagged</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {workspaceConfig.detail.meta.lastSubmission}: {lastSubmission}
          </p>
        </div>
      </section>

      {problem.relatedProblems.length ? (
        <section className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/70">
            {workspaceConfig.detail.related.title}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {problem.relatedProblems.map((related) => (
              <Link
                key={related.slug}
                href={`/workspace/problems/${related.slug}`}
                className="border-2 border-border bg-card p-5 transition hover:border-primary"
              >
                <p className="text-sm font-bold uppercase">{related.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {related.difficulty ?? "Unrated"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="border-2 border-border bg-card p-5 text-xs text-muted-foreground">
          {workspaceConfig.detail.related.empty}
        </section>
      )}

      <div className="border-2 border-border bg-card">
        <ProblemReader key={problem.id} problem={problem} />
      </div>
    </div>
  );
}

async function fetchProblem(slug: string, viewerHasSession: boolean) {
  if (viewerHasSession) {
    const caller = await createTRPCCaller();
    return caller.problems.detail({ slug });
  }
  return getCachedProblemDetail(slug);
}

async function resolveParams(paramsOrPromise: { slug: string } | Promise<{ slug: string }>) {
  if (paramsOrPromise instanceof Promise) {
    return await paramsOrPromise;
  }
  return paramsOrPromise;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-background px-4 py-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}
