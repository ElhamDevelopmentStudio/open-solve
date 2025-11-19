import { SubmissionReadOnlyView } from "@/components/submissions/submission-detail";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { notFound } from "next/navigation";

export default async function SharedSubmissionPage({
  params,
}: {
  params: { publicId: string } | Promise<{ publicId: string }>;
}) {
  const resolved = params instanceof Promise ? await params : params;
  const caller = await createTRPCCaller();
  let submission;
  try {
    submission = await caller.submissions.getShare({ publicId: resolved.publicId });
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
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-10">
      <div className="rounded-xl border border-border bg-card/80 p-4 text-sm text-muted-foreground">
        Shared submission — read-only view
      </div>
      <SubmissionReadOnlyView submission={submission} />
    </div>
  );
}
