import { SubmissionsClient } from "@/components/submissions/submissions-client";
import { buildSubmissionListInputFromParams } from "@/lib/submissions/filter-utils";
import { loadSubmissionSearchParams } from "@/lib/submissions/search-params";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { notFound } from "next/navigation";
import { getCachedProblemDetail } from "@/lib/cache/problems";

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
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card/70 p-4">
        <p className="text-xs uppercase text-muted-foreground">Problem</p>
        <h1 className="text-xl font-semibold text-foreground">{problem.title}</h1>
      </div>
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
