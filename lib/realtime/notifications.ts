import { env } from "@/lib/env";
import { getSubmissionDetailForBroadcast } from "@/lib/submissions/detail";
import { getSubmissionRealtimeHub, hasSubmissionRealtimeHub } from "@/lib/realtime/submission-hub";
import { logger } from "@/lib/logger";

export const broadcastSubmissionUpdate = async (submissionId: string) => {
  if (!hasSubmissionRealtimeHub()) {
    return false;
  }
  const detail = await getSubmissionDetailForBroadcast(submissionId);
  if (!detail) {
    return false;
  }
  const hub = getSubmissionRealtimeHub();
  hub.publish(detail.userId, submissionId, detail.payload);
  return true;
};

export const notifySubmissionUpdate = async (submissionId: string) => {
  const dispatched = await broadcastSubmissionUpdate(submissionId);
  if (dispatched) {
    return;
  }
  if (!env.APP_URL || !env.REALTIME_WORKER_TOKEN) {
    return;
  }
  try {
    await fetch(`${env.APP_URL}/api/internal/submission-events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.REALTIME_WORKER_TOKEN}`,
      },
      body: JSON.stringify({ submissionId }),
    });
  } catch (error) {
    logger.error({ error, submissionId }, "failed to relay submission update to realtime bridge");
  }
};
