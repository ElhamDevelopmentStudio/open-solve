export type JudgeSubmissionMessage = {
  submissionId: string;
  problemId: string;
  problemVersionId: string;
  languageCode: string;
  requiresManualReview: boolean;
  trigger: "submission" | "rejudge";
  requestedBy?: string;
  reason?: string;
  queuedAt: string;
};

export type ManualJudgeMessage = {
  submissionId: string;
  problemId: string;
  userId: string;
  reason: "MANUAL_ONLY" | "HYBRID";
  queuedAt: string;
};

export type JudgeQueueMessage = JudgeSubmissionMessage | ManualJudgeMessage;

export const isJudgeSubmissionMessage = (
  payload: JudgeQueueMessage,
): payload is JudgeSubmissionMessage => "problemVersionId" in payload;

export const isManualJudgeMessage = (
  payload: JudgeQueueMessage,
): payload is ManualJudgeMessage => "reason" in payload && !("problemVersionId" in payload);
