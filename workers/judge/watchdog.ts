import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { dispatchSubmissionToJudge } from "@/lib/judge/dispatcher";

const RUNNING_STALE_MS = 5 * 60 * 1000;
const RETRYING_STALE_MS = 3 * 60 * 1000;
const BATCH_SIZE = 25;

async function requeueStaleSubmissions() {
  const now = Date.now();
  const runningCutoff = new Date(now - RUNNING_STALE_MS);
  const retryingCutoff = new Date(now - RETRYING_STALE_MS);

  const stale = await prisma.submission.findMany({
    where: {
      deletedAt: null,
      OR: [
        { status: SubmissionStatus.RUNNING, updatedAt: { lt: runningCutoff } },
        { status: SubmissionStatus.RETRYING, updatedAt: { lt: retryingCutoff } },
      ],
    },
    take: BATCH_SIZE,
    select: {
      id: true,
      problemId: true,
      problemVersionId: true,
      languageCode: true,
      requiresManualReview: true,
      userId: true,
    },
  });

  for (const submission of stale) {
    logger.warn({ submissionId: submission.id }, "watchdog requeue");
    if (!submission.problemVersionId) {
      continue;
    }
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.QUEUED,
        verdictCode: null,
        startedAt: null,
        finishedAt: null,
        judgeNodeId: null,
      },
    });
    await dispatchSubmissionToJudge({
      submissionId: submission.id,
      problemId: submission.problemId,
      problemVersionId: submission.problemVersionId,
      languageCode: submission.languageCode,
      requiresManualReview: submission.requiresManualReview,
      manualOnly: false,
      userId: submission.userId,
      trigger: "watchdog",
      reason: "stale",
    }).catch((error) => {
      logger.error({ err: error, submissionId: submission.id }, "watchdog dispatch failed");
    });
  }
}

async function main() {
  await requeueStaleSubmissions();
  process.exit(0);
}

main().catch((error) => {
  logger.error({ err: error }, "watchdog failed");
  process.exit(1);
});
