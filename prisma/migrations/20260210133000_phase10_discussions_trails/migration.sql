-- CreateEnum
CREATE TYPE "ProblemJudgeMode" AS ENUM ('AUTO', 'MANUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "DiscussionCategory" AS ENUM ('GENERAL', 'HELP', 'META', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "DiscussionReportReason" AS ENUM ('SPAM', 'ABUSE', 'SPOILER_ABUSE', 'OFF_TOPIC');

-- CreateEnum
CREATE TYPE "DiscussionReportStatus" AS ENUM ('OPEN', 'VALID', 'INVALID');

-- CreateEnum
CREATE TYPE "EditorialReleaseStrategy" AS ENUM ('ON_PUBLISH', 'OFFSET_DAYS', 'AFTER_CONTEST', 'MANUAL');

-- CreateEnum
CREATE TYPE "TrailInsightCategory" AS ENUM ('IDEA', 'PATTERN', 'DATA_STRUCTURE', 'PITFALL');

-- CreateEnum
CREATE TYPE "TrailReportReason" AS ENUM ('SPAM', 'SPOILER', 'MISLEADING');

-- CreateEnum
CREATE TYPE "TrailReportStatus" AS ENUM ('OPEN', 'VALID', 'INVALID');

-- AlterTable (Discussions)
ALTER TABLE "Discussion"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "category" "DiscussionCategory",
  ADD COLUMN "containsSpoiler" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockedById" TEXT,
  ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "problemId" DROP NOT NULL;

-- AlterTable (Problem editorial releases)
ALTER TABLE "Problem"
  ADD COLUMN "judgeMode" "ProblemJudgeMode" NOT NULL DEFAULT 'AUTO',
  ADD COLUMN "editorialReleaseStrategy" "EditorialReleaseStrategy" NOT NULL DEFAULT 'ON_PUBLISH',
  ADD COLUMN "editorialReleaseAt" TIMESTAMP(3),
  ADD COLUMN "editorialReleasedAt" TIMESTAMP(3),
  ADD COLUMN "editorialReleaseOffsetDays" INTEGER,
  ADD COLUMN "editorialReleaseContestId" TEXT;

-- AlterTable (Test cases inline data)
ALTER TABLE "TestCase"
  ADD COLUMN "inputData" TEXT,
  ADD COLUMN "outputData" TEXT;

-- AlterTable (User social fields)
ALTER TABLE "User"
  ADD COLUMN "shareAcceptedCode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "showOnLeaderboard" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showCountry" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "showSocials" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "socialGithub" TEXT,
  ADD COLUMN "socialLinkedin" TEXT,
  ADD COLUMN "socialTwitter" TEXT,
  ADD COLUMN "socialWebsite" TEXT;

-- AlterTable (Submission metadata)
ALTER TABLE "Submission"
  ADD COLUMN "hiddenFromProfile" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isShareEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "manualDueAt" TIMESTAMP(3),
  ADD COLUMN "manualNotes" TEXT,
  ADD COLUMN "manualReviewedAt" TIMESTAMP(3),
  ADD COLUMN "manualReviewerId" TEXT,
  ADD COLUMN "manualScore" DOUBLE PRECISION,
  ADD COLUMN "requiresManualReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shareEnabledAt" TIMESTAMP(3),
  ADD COLUMN "sharePublicId" TEXT,
  ADD COLUMN "shareRevokedAt" TIMESTAMP(3),
  ALTER COLUMN "status" SET DEFAULT 'QUEUED';

CREATE UNIQUE INDEX IF NOT EXISTS "Submission_sharePublicId_key" ON "Submission"("sharePublicId");
CREATE INDEX IF NOT EXISTS "Submission_status_requiresManualReview_idx" ON "Submission"("status","requiresManualReview");

-- Discussion tag junction
CREATE TABLE "DiscussionTag" (
  "discussionId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscussionTag_pkey" PRIMARY KEY ("discussionId","tagId")
);

-- Discussion reports
CREATE TABLE "DiscussionReport" (
  "id" TEXT PRIMARY KEY,
  "discussionId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" "DiscussionReportReason" NOT NULL,
  "status" "DiscussionReportStatus" NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Trail insights
CREATE TABLE "TrailInsight" (
  "id" TEXT PRIMARY KEY,
  "problemId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" "TrailInsightCategory" NOT NULL DEFAULT 'IDEA',
  "score" INTEGER NOT NULL DEFAULT 0,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "updatedById" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "TrailEdge" (
  "id" TEXT PRIMARY KEY,
  "problemId" TEXT NOT NULL,
  "fromInsightId" TEXT NOT NULL,
  "toInsightId" TEXT NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "TrailInsightVote" (
  "id" TEXT PRIMARY KEY,
  "insightId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "TrailReport" (
  "id" TEXT PRIMARY KEY,
  "insightId" TEXT NOT NULL,
  "reporterId" TEXT NOT NULL,
  "reason" "TrailReportReason" NOT NULL,
  "status" "TrailReportStatus" NOT NULL DEFAULT 'OPEN',
  "note" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Indexes
CREATE INDEX "Discussion_category_lastActivityAt_idx" ON "Discussion"("category","lastActivityAt");
CREATE INDEX "TrailInsight_problemId_score_createdAt_idx" ON "TrailInsight"("problemId","score","createdAt");
CREATE INDEX "TrailEdge_problemId_fromInsightId_weight_idx" ON "TrailEdge"("problemId","fromInsightId","weight");
CREATE UNIQUE INDEX "TrailEdge_problemId_fromInsightId_toInsightId_key" ON "TrailEdge"("problemId","fromInsightId","toInsightId");
CREATE UNIQUE INDEX "TrailInsightVote_insightId_userId_key" ON "TrailInsightVote"("insightId","userId");
CREATE INDEX "TrailReport_status_createdAt_idx" ON "TrailReport"("status","createdAt");

-- Foreign keys
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiscussionTag" ADD CONSTRAINT "DiscussionTag_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionTag" ADD CONSTRAINT "DiscussionTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionReport" ADD CONSTRAINT "DiscussionReport_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionReport" ADD CONSTRAINT "DiscussionReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscussionReport" ADD CONSTRAINT "DiscussionReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrailInsight" ADD CONSTRAINT "TrailInsight_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailInsight" ADD CONSTRAINT "TrailInsight_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailEdge" ADD CONSTRAINT "TrailEdge_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailEdge" ADD CONSTRAINT "TrailEdge_fromInsightId_fkey" FOREIGN KEY ("fromInsightId") REFERENCES "TrailInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailEdge" ADD CONSTRAINT "TrailEdge_toInsightId_fkey" FOREIGN KEY ("toInsightId") REFERENCES "TrailInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailInsightVote" ADD CONSTRAINT "TrailInsightVote_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "TrailInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailInsightVote" ADD CONSTRAINT "TrailInsightVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailReport" ADD CONSTRAINT "TrailReport_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "TrailInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailReport" ADD CONSTRAINT "TrailReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrailReport" ADD CONSTRAINT "TrailReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Problem" ADD CONSTRAINT "Problem_editorialReleaseContestId_fkey" FOREIGN KEY ("editorialReleaseContestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_manualReviewerId_fkey" FOREIGN KEY ("manualReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
