import { Prisma, SubmissionStatus, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACCEPTED_VERDICTS } from "@/lib/submissions/constants";
import { LEADERBOARD_WINDOWS, difficultyScore, resolveDifficulty } from "@/lib/leaderboard/service";
import type { LeaderboardWindow } from "@/lib/leaderboard/service";
import { logger } from "@/lib/logger";

type SubmissionForRealtime = {
  id: string;
  userId: string;
  problemId: string;
  contestId: string | null;
  createdAt: Date;
  finishedAt: Date | null;
  verdictCode: string | null;
  status: SubmissionStatus;
  deletedAt: Date | null;
  score: number | null;
  user: {
    status: UserStatus;
    showOnLeaderboard: boolean;
  };
  problem: {
    difficulty: {
      code: string | null;
      weight: number | null;
    } | null;
  } | null;
};

const resolveSubmissionScore = (submission: SubmissionForRealtime): number => {
  if (
    typeof submission.score === "number" &&
    Number.isFinite(submission.score) &&
    submission.score > 0
  ) {
    return submission.score;
  }
  const difficultyKey = resolveDifficulty(submission.problem?.difficulty?.code);
  const weight = submission.problem?.difficulty?.weight ?? difficultyScore[difficultyKey];
  return weight > 0 ? weight : 1;
};

const isMissingRealtimeTableError = (error: unknown): boolean => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021";
  }
  if (typeof error === "object" && error && "code" in error) {
    return (error as { code?: string }).code === "P2021";
  }
  return false;
};

let realtimeTableUnavailable = false;

export async function syncRealtimeLeaderboards(submissionId: string): Promise<LeaderboardWindow[]> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      userId: true,
      problemId: true,
      contestId: true,
      createdAt: true,
      finishedAt: true,
      verdictCode: true,
      status: true,
      deletedAt: true,
      score: true,
      user: {
        select: {
          status: true,
          showOnLeaderboard: true,
        },
      },
      problem: {
        select: {
          difficulty: {
            select: {
              code: true,
              weight: true,
            },
          },
        },
      },
    },
  });
  if (!submission) {
    return [];
  }
  if (submission.deletedAt) {
    return [];
  }
  if (submission.status !== SubmissionStatus.SUCCEEDED) {
    return [];
  }
  if (
    !submission.verdictCode ||
    !ACCEPTED_VERDICTS.includes(submission.verdictCode as (typeof ACCEPTED_VERDICTS)[number])
  ) {
    return [];
  }
  if (!submission.user?.showOnLeaderboard || submission.user.status === UserStatus.BANNED) {
    return [];
  }
  if (submission.contestId) {
    return [];
  }
  if (!submission.problem) {
    return [];
  }

  const timestamp = submission.finishedAt ?? submission.createdAt;
  if (!timestamp) {
    return [];
  }

  const updatedWindows: LeaderboardWindow[] = [];

  if (realtimeTableUnavailable) {
    return [];
  }

  for (const window of LEADERBOARD_WINDOWS) {
    const snapshot = await prisma.leaderboardSnapshot.findFirst({
      where: { window },
      orderBy: { periodStart: "desc" },
    });
    if (!snapshot) {
      continue;
    }
    if (timestamp < snapshot.periodStart) {
      continue;
    }
    const cutoff = snapshot.periodEnd ?? snapshot.generatedAt;
    if (timestamp <= cutoff) {
      continue;
    }
    try {
      await prisma.leaderboardRealtimeSolve.create({
        data: {
          snapshotId: snapshot.id,
          window,
          userId: submission.userId,
          problemId: submission.problemId,
          submissionId: submission.id,
          score: resolveSubmissionScore(submission as SubmissionForRealtime),
          createdAt: timestamp,
        },
      });
      updatedWindows.push(window);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }
      if (isMissingRealtimeTableError(error)) {
        realtimeTableUnavailable = true;
        logger.warn("leaderboard realtime table missing; skipping live delta writes");
        return [];
      }
      throw error;
    }
  }

  return updatedWindows;
}
