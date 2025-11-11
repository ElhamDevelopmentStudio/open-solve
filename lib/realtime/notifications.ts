import { env } from "@/lib/env";
import { getSubmissionDetailForBroadcast } from "@/lib/submissions/detail";
import { getSubmissionRealtimeHub, hasSubmissionRealtimeHub } from "@/lib/realtime/submission-hub";
import { getLeaderboardRealtimeHub, hasLeaderboardRealtimeHub } from "@/lib/realtime/leaderboard-hub";
import { logger } from "@/lib/logger";
import { syncRealtimeLeaderboards } from "@/lib/leaderboard/live";
import type { LeaderboardWindow } from "@/lib/leaderboard/service";

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

export const broadcastLeaderboardUpdate = (windows: LeaderboardWindow[]) => {
  if (!hasLeaderboardRealtimeHub()) {
    return false;
  }
  const hub = getLeaderboardRealtimeHub();
  hub.broadcast(windows);
  return true;
};

export const notifyLeaderboardUpdate = async (windows: LeaderboardWindow[]) => {
  if (windows.length === 0) {
    return;
  }
  const dispatched = broadcastLeaderboardUpdate(windows);
  if (dispatched) {
    return;
  }
  if (!env.APP_URL || !env.REALTIME_WORKER_TOKEN) {
    return;
  }
  try {
    await fetch(`${env.APP_URL}/api/internal/leaderboard-events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.REALTIME_WORKER_TOKEN}`,
      },
      body: JSON.stringify({ windows }),
    });
  } catch (error) {
    logger.error({ error, windows }, "failed to relay leaderboard update to realtime bridge");
  }
};

export const notifySubmissionUpdate = async (submissionId: string) => {
  let leaderboardWindows: LeaderboardWindow[] = [];
  try {
    leaderboardWindows = await syncRealtimeLeaderboards(submissionId);
  } catch (error) {
    logger.error({ error, submissionId }, "failed to sync realtime leaderboards");
  }

  const dispatched = await broadcastSubmissionUpdate(submissionId);
  if (!dispatched) {
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
  }

  if (leaderboardWindows.length > 0) {
    await notifyLeaderboardUpdate(leaderboardWindows);
  }
};
