/*
  Warnings:

  - The values [PENDING,COMPLETED] on the enum `SubmissionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubmissionStatus_new" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'MANUAL_PENDING');
ALTER TABLE "public"."Submission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Submission" ALTER COLUMN "status" TYPE "SubmissionStatus_new" USING ("status"::text::"SubmissionStatus_new");
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
ALTER TYPE "SubmissionStatus_new" RENAME TO "SubmissionStatus";
DROP TYPE "public"."SubmissionStatus_old";
ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
COMMIT;

-- AlterTable
ALTER TABLE "ContestClarification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "LeaderboardRealtimeSolve" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "DiscussionReport_status_createdAt_idx" ON "DiscussionReport"("status", "createdAt");
