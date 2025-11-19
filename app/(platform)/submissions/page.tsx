import { SubmissionsClient } from "@/components/submissions/submissions-client";
import { buildSubmissionListInputFromParams } from "@/lib/submissions/filter-utils";
import { loadSubmissionSearchParams } from "@/lib/submissions/search-params";
import { createTRPCCaller } from "@/lib/trpc/server/caller";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const resolved = await loadSubmissionSearchParams(searchParams);
  const caller = await createTRPCCaller();
  const initialInput = buildSubmissionListInputFromParams(resolved);
  const [initialData, filterMetadata] = await Promise.all([
    caller.submissions.listMine(initialInput),
    caller.submissions.filters(),
  ]);

  return (
    <div className="space-y-6">
      <SubmissionsClient
        initialInput={initialInput}
        initialData={initialData}
        filterMetadata={filterMetadata}
      />
    </div>
  );
}
