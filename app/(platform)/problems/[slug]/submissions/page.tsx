import { SubmissionsClient } from "@/components/submissions/submissions-client";
import { submissionsConfig } from "@/config/submissions";
import { getCachedProblemDetail } from "@/lib/cache/problems";
import { buildSubmissionListInputFromParams } from "@/lib/submissions/filter-utils";
import { loadSubmissionSearchParams } from "@/lib/submissions/search-params";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { notFound } from "next/navigation";

export default async function ProblemSubmissionsPage({
  params,
  searchParams,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const resolvedSearch = await loadSubmissionSearchParams(searchParams);
  const enforcedSearch = { ...resolvedSearch, problem: resolvedParams.slug };
  const initialInput = buildSubmissionListInputFromParams(enforcedSearch);
  const caller = await createTRPCCaller();
  let initialData;
  let filterMetadata;
  let problem;
  try {
    [initialData, filterMetadata, problem] = await Promise.all([
      caller.submissions.listMine(initialInput),
      caller.submissions.filters(),
      getCachedProblemDetail(resolvedParams.slug),
    ]);
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

  return (
    <div className="space-y-8 font-mono text-foreground">
      <section className="border-2 border-border bg-card p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-primary/70">
          {submissionsConfig.problem.marker}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {submissionsConfig.problem.titlePrefix}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {submissionsConfig.problem.description}
        </p>
        <div className="mt-4 border border-border bg-background px-4 py-3">
          <p className="text-[11px] uppercase text-muted-foreground">Problem</p>
          <p className="text-2xl font-black">{problem.title}</p>
        </div>
      </section>
      <SubmissionsClient
        initialInput={initialInput}
        initialData={initialData}
        filterMetadata={filterMetadata}
        lockedProblemSlug={resolvedParams.slug}
        lockedProblemTitle={problem.title}
      />
    </div>
  );
}
