CREATE TABLE IF NOT EXISTS "LeaderboardRealtimeSolve" (
  "id" TEXT NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "window" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "problemId" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaderboardRealtimeSolve_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeaderboardRealtimeSolve_snapshotId_userId_problemId_key"
  ON "LeaderboardRealtimeSolve"("snapshotId", "userId", "problemId");
CREATE INDEX IF NOT EXISTS "LeaderboardRealtimeSolve_snapshotId_window_idx"
  ON "LeaderboardRealtimeSolve"("snapshotId", "window");
CREATE INDEX IF NOT EXISTS "LeaderboardRealtimeSolve_userId_window_idx"
  ON "LeaderboardRealtimeSolve"("userId", "window");
CREATE INDEX IF NOT EXISTS "LeaderboardRealtimeSolve_submissionId_idx"
  ON "LeaderboardRealtimeSolve"("submissionId");

ALTER TABLE "LeaderboardRealtimeSolve"
  ADD CONSTRAINT "LeaderboardRealtimeSolve_snapshotId_fkey"
  FOREIGN KEY ("snapshotId") REFERENCES "LeaderboardSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaderboardRealtimeSolve"
  ADD CONSTRAINT "LeaderboardRealtimeSolve_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaderboardRealtimeSolve"
  ADD CONSTRAINT "LeaderboardRealtimeSolve_problemId_fkey"
  FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaderboardRealtimeSolve"
  ADD CONSTRAINT "LeaderboardRealtimeSolve_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
