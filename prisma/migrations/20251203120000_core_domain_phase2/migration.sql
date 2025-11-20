-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED', 'SHADOW_BANNED');

-- CreateEnum
CREATE TYPE "ProblemState" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProblemVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'INTERNAL');

-- CreateEnum
CREATE TYPE "TestCaseKind" AS ENUM ('SAMPLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "DiscussionState" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');

-- CreateEnum
CREATE TYPE "ContestState" AS ENUM ('UPCOMING', 'RUNNING', 'FINISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContestVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ContestRuleset" AS ENUM ('ICPC', 'CF');

-- CreateEnum
CREATE TYPE "BadgeAwardSource" AS ENUM ('SYSTEM', 'ADMIN', 'CONTEST');

-- AlterEnum
BEGIN;
CREATE TYPE "SubmissionStatus_new" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
ALTER TABLE "Submission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Submission" ALTER COLUMN "status" TYPE "SubmissionStatus_new" USING ("status"::text::"SubmissionStatus_new");
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
ALTER TYPE "SubmissionStatus_new" RENAME TO "SubmissionStatus";
DROP TYPE "SubmissionStatus_old";
ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

-- DropForeignKey
ALTER TABLE "Editorial" DROP CONSTRAINT "Editorial_problemId_fkey";

-- DropForeignKey
ALTER TABLE "ProblemTag" DROP CONSTRAINT "ProblemTag_problemId_fkey";

-- DropForeignKey
ALTER TABLE "ProblemTag" DROP CONSTRAINT "ProblemTag_tagId_fkey";

-- DropForeignKey
ALTER TABLE "TestCase" DROP CONSTRAINT "TestCase_problemId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_userId_fkey";

-- DropForeignKey
ALTER TABLE "Submission" DROP CONSTRAINT "Submission_problemId_fkey";

-- DropForeignKey
ALTER TABLE "LeaderboardSnapshot" DROP CONSTRAINT "LeaderboardSnapshot_userId_fkey";

-- DropIndex
DROP INDEX "Problem_difficulty_isPublished_idx";

-- DropIndex
DROP INDEX "Submission_userId_problemId_idx";

-- DropIndex
DROP INDEX "Submission_status_createdAt_idx";

-- DropIndex
DROP INDEX "LeaderboardSnapshot_userId_capturedAt_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "constraints",
DROP COLUMN "difficulty",
DROP COLUMN "isPublished",
DROP COLUMN "memoryLimitMb",
DROP COLUMN "starterCode",
DROP COLUMN "statement",
DROP COLUMN "templates",
DROP COLUMN "timeLimitMs",
DROP COLUMN "title",
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "currentVersionId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "difficultyId" TEXT,
ADD COLUMN     "state" "ProblemState" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "visibility" "ProblemVisibility" NOT NULL DEFAULT 'INTERNAL';

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "category" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "ProblemTag" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "TestCase" DROP COLUMN "input",
DROP COLUMN "isSample",
DROP COLUMN "output",
DROP COLUMN "problemId",
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "inputBlobRef" TEXT NOT NULL,
ADD COLUMN     "kind" "TestCaseKind" NOT NULL DEFAULT 'HIDDEN',
ADD COLUMN     "memoryLimitMb" INTEGER NOT NULL,
ADD COLUMN     "ordinal" INTEGER NOT NULL,
ADD COLUMN     "outputBlobRef" TEXT NOT NULL,
ADD COLUMN     "points" INTEGER,
ADD COLUMN     "problemVersionId" TEXT NOT NULL,
ADD COLUMN     "timeLimitMs" INTEGER NOT NULL,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "Submission" DROP COLUMN "diagnostics",
DROP COLUMN "language",
DROP COLUMN "memoryKb",
DROP COLUMN "runtimeMs",
DROP COLUMN "sourceCode",
ADD COLUMN     "codeHash" TEXT NOT NULL,
ADD COLUMN     "contestId" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "judgeNodeId" TEXT,
ADD COLUMN     "languageCode" TEXT NOT NULL,
ADD COLUMN     "memoryUsedKb" INTEGER,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "problemVersionId" TEXT,
ADD COLUMN     "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "sourceCodeRef" TEXT NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "timeUsedMs" INTEGER,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "verdictCode" TEXT;

-- AlterTable
ALTER TABLE "LeaderboardSnapshot" DROP COLUMN "capturedAt",
DROP COLUMN "problemsSolved",
DROP COLUMN "rating",
DROP COLUMN "streak",
DROP COLUMN "userId",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedById" TEXT,
ADD COLUMN     "window" TEXT NOT NULL;

-- DropTable
DROP TABLE "Editorial";

-- DropEnum
DROP TYPE "Difficulty";

-- DropEnum
DROP TYPE "ProgrammingLanguage";

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "totalSolved" INTEGER NOT NULL DEFAULT 0,
    "solvedEasy" INTEGER NOT NULL DEFAULT 0,
    "solvedMedium" INTEGER NOT NULL DEFAULT 0,
    "solvedHard" INTEGER NOT NULL DEFAULT 0,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "firstAcAt" TIMESTAMP(3),
    "lastAcAt" TIMESTAMP(3),
    "languagesUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Difficulty" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Difficulty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagStats" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "problemCount" INTEGER NOT NULL DEFAULT 0,
    "solvedByCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyStats" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "problemCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemVersion" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "hints" TEXT,
    "editorial" TEXT,
    "samples" JSONB NOT NULL,
    "dataHash" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemCompany" (
    "problemId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemCompany_pkey" PRIMARY KEY ("problemId","companyId")
);

-- CreateTable
CREATE TABLE "ProblemStats" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "code" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "compileCmd" TEXT NOT NULL,
    "runCmd" TEXT NOT NULL,
    "timeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "memoryCeilingMb" INTEGER NOT NULL,
    "fileExtension" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sandboxProfile" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Verdict" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "isTerminal" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verdict_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "SubmissionCaseResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "testOrdinal" INTEGER NOT NULL,
    "verdictCode" TEXT,
    "timeMs" INTEGER,
    "memoryKb" INTEGER,
    "stderrRef" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionCaseResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "state" "DiscussionState" NOT NULL DEFAULT 'VISIBLE',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "criteria" JSONB NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeAward" (
    "id" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "BadgeAwardSource" NOT NULL DEFAULT 'SYSTEM',
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "solved" INTEGER NOT NULL,
    "timePenalty" INTEGER,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "state" "ContestState" NOT NULL DEFAULT 'UPCOMING',
    "visibility" "ContestVisibility" NOT NULL DEFAULT 'PUBLIC',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "freezeAt" TIMESTAMP(3),
    "rules" "ContestRuleset" NOT NULL DEFAULT 'ICPC',
    "isRated" BOOLEAN NOT NULL DEFAULT false,
    "editorialReleaseAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestProblem" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "points" INTEGER,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestRegistration" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndextype
CREATE UNIQUE INDEX "Difficulty_code_key" ON "Difficulty"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TagStats_tagId_key" ON "TagStats"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_isHidden_idx" ON "Company"("isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyStats_companyId_key" ON "CompanyStats"("companyId");

-- CreateIndex
CREATE INDEX "ProblemVersion_dataHash_idx" ON "ProblemVersion"("dataHash");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemVersion_problemId_versionNumber_key" ON "ProblemVersion"("problemId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemStats_problemId_key" ON "ProblemStats"("problemId");

-- CreateIndex
CREATE INDEX "Language_isEnabled_idx" ON "Language"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionCaseResult_submissionId_testOrdinal_key" ON "SubmissionCaseResult"("submissionId", "testOrdinal");

-- CreateIndex
CREATE INDEX "Discussion_problemId_parentId_idx" ON "Discussion"("problemId", "parentId");

-- CreateIndex
CREATE INDEX "Discussion_problemId_score_createdAt_idx" ON "Discussion"("problemId", "score", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_discussionId_userId_key" ON "Vote"("discussionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeAward_badgeId_userId_key" ON "BadgeAward"("badgeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_snapshotId_rank_key" ON "LeaderboardEntry"("snapshotId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_snapshotId_userId_key" ON "LeaderboardEntry"("snapshotId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Contest_slug_key" ON "Contest"("slug");

-- CreateIndex
CREATE INDEX "Contest_state_startsAt_idx" ON "Contest"("state", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContestProblem_contestId_order_key" ON "ContestProblem"("contestId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ContestProblem_contestId_problemId_key" ON "ContestProblem"("contestId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestRegistration_contestId_userId_key" ON "ContestRegistration"("contestId", "userId");

-- CreateIndex
CREATE INDEX "User_status_role_idx" ON "User"("status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_currentVersionId_key" ON "Problem"("currentVersionId");

-- CreateIndex
-- Ensure the Problem composite index exists without colliding when earlier migrations already created it
CREATE INDEX IF NOT EXISTS "Problem_state_visibility_difficultyId_createdAt_idx" ON "Problem"("state", "visibility", "difficultyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Tag_category_isFeatured_idx" ON "Tag"("category", "isFeatured");

-- CreateIndex
CREATE INDEX "TestCase_problemVersionId_kind_ordinal_idx" ON "TestCase"("problemVersionId", "kind", "ordinal");

-- CreateIndex
CREATE INDEX "Submission_userId_problemId_createdAt_idx" ON "Submission"("userId", "problemId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_problemId_verdictCode_createdAt_idx" ON "Submission"("problemId", "verdictCode", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_codeHash_idx" ON "Submission"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardSnapshot_window_periodStart_key" ON "LeaderboardSnapshot"("window", "periodStart");

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagStats" ADD CONSTRAINT "TagStats_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyStats" ADD CONSTRAINT "CompanyStats_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_difficultyId_fkey" FOREIGN KEY ("difficultyId") REFERENCES "Difficulty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ProblemVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemVersion" ADD CONSTRAINT "ProblemVersion_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTag" ADD CONSTRAINT "ProblemTag_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTag" ADD CONSTRAINT "ProblemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemCompany" ADD CONSTRAINT "ProblemCompany_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemCompany" ADD CONSTRAINT "ProblemCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemStats" ADD CONSTRAINT "ProblemStats_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemVersionId_fkey" FOREIGN KEY ("problemVersionId") REFERENCES "ProblemVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemVersionId_fkey" FOREIGN KEY ("problemVersionId") REFERENCES "ProblemVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_verdictCode_fkey" FOREIGN KEY ("verdictCode") REFERENCES "Verdict"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionCaseResult" ADD CONSTRAINT "SubmissionCaseResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionCaseResult" ADD CONSTRAINT "SubmissionCaseResult_verdictCode_fkey" FOREIGN KEY ("verdictCode") REFERENCES "Verdict"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "LeaderboardSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaderboardEntry" ADD CONSTRAINT "LeaderboardEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProblemVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRegistration" ADD CONSTRAINT "ContestRegistration_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestRegistration" ADD CONSTRAINT "ContestRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
