/*
  Warnings:

  - The values [PENDING,COMPLETED] on the enum `SubmissionStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[sharePublicId]` on the table `Submission` will be added. If there are existing duplicate values, this will fail.

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
ALTER TABLE "Submission" ADD COLUMN     "hiddenFromProfile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isShareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareEnabledAt" TIMESTAMP(3),
ADD COLUMN     "sharePublicId" TEXT,
ADD COLUMN     "shareRevokedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'QUEUED';

-- CreateIndex
CREATE UNIQUE INDEX "Submission_sharePublicId_key" ON "Submission"("sharePublicId");

-- CreateIndex
CREATE INDEX "Submission_status_requiresManualReview_idx" ON "Submission"("status", "requiresManualReview");
