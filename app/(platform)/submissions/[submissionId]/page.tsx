import { SubmissionDetailClient } from "@/components/submissions/submission-detail";
import { createTRPCCaller } from "@/lib/trpc/server/caller";
import { notFound } from "next/navigation";

export default async function SubmissionDetailPage({
  params,
}: {
  params: { submissionId: string } | Promise<{ submissionId: string }>;
}) {
  const resolved = params instanceof Promise ? await params : params;
  const caller = await createTRPCCaller();
  let submission;
  try {
    submission = await caller.submissions.get({ submissionId: resolved.submissionId });
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
    <SubmissionDetailClient submissionId={resolved.submissionId} initialSubmission={submission} />
  );
}
