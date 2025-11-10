import { publishManualMessage, publishSubmissionMessage } from "@/lib/judge/queue";
import { runInlineJudge } from "@/lib/judge/inline-runner";
import type { JudgeSubmissionMessage, ManualJudgeMessage } from "@/lib/judge/messages";
import { logger } from "@/lib/logger";

type DispatchParams = {
  submissionId: string;
  problemId: string;
  problemVersionId: string;
  languageCode: string;
  requiresManualReview: boolean;
  manualOnly?: boolean;
  userId: string;
  trigger?: JudgeSubmissionMessage["trigger"];
  reason?: string;
};

export const dispatchSubmissionToJudge = async ({
  submissionId,
  problemId,
  problemVersionId,
  languageCode,
  requiresManualReview,
  manualOnly,
  userId,
  trigger = "submission",
  reason,
}: DispatchParams) => {
  const message: JudgeSubmissionMessage = {
    submissionId,
    problemId,
    problemVersionId,
    languageCode,
    requiresManualReview,
    trigger,
    requestedBy: userId,
    reason,
    queuedAt: new Date().toISOString(),
  };

  if (manualOnly) {
    await publishManualReviewMessage({
      submissionId,
      problemId,
      userId,
      reason: "MANUAL_ONLY",
    });
    return;
  }

  const published = await publishSubmissionMessage(message);
  if (published) {
    return;
  }

  logger.warn({ submissionId }, "queue unavailable, falling back to inline judge");
  await runInlineJudge(submissionId);
};

export const publishManualReviewMessage = async ({
  submissionId,
  problemId,
  userId,
  reason,
}: {
  submissionId: string;
  problemId: string;
  userId: string;
  reason: ManualJudgeMessage["reason"];
}) => {
  const payload: ManualJudgeMessage = {
    submissionId,
    problemId,
    userId,
    reason,
    queuedAt: new Date().toISOString(),
  };
  const sent = await publishManualMessage(payload);
  if (!sent) {
    logger.warn({ submissionId }, "failed to publish manual review message");
  }
};
