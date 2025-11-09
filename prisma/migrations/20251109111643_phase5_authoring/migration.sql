-- CreateEnum
CREATE TYPE "ProblemProposalStatus" AS ENUM ('SUBMITTED', 'PRESCREEN', 'IN_REVIEW', 'ACCEPTED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProblemReviewDecision" AS ENUM ('APPROVED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "ProblemReview" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ProblemReviewDecision" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemProposal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intendedDifficulty" TEXT,
    "statement" TEXT NOT NULL,
    "samples" JSONB NOT NULL,
    "originalityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProblemProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "convertedProblemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemProposalComment" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemProposalComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemReview_problemId_idx" ON "ProblemReview"("problemId");

-- CreateIndex
CREATE INDEX "ProblemReview_reviewerId_idx" ON "ProblemReview"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemProposal_slug_key" ON "ProblemProposal"("slug");

-- CreateIndex
CREATE INDEX "ProblemProposal_status_idx" ON "ProblemProposal"("status");

-- CreateIndex
CREATE INDEX "ProblemProposal_authorId_idx" ON "ProblemProposal"("authorId");

-- CreateIndex
CREATE INDEX "ProblemProposal_reviewerId_idx" ON "ProblemProposal"("reviewerId");

-- CreateIndex
CREATE INDEX "ProblemProposalComment_proposalId_idx" ON "ProblemProposalComment"("proposalId");

-- CreateIndex
CREATE INDEX "ProblemProposalComment_authorId_idx" ON "ProblemProposalComment"("authorId");

-- AddForeignKey
ALTER TABLE "ProblemReview" ADD CONSTRAINT "ProblemReview_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemReview" ADD CONSTRAINT "ProblemReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemProposal" ADD CONSTRAINT "ProblemProposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemProposal" ADD CONSTRAINT "ProblemProposal_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemProposalComment" ADD CONSTRAINT "ProblemProposalComment_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ProblemProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemProposalComment" ADD CONSTRAINT "ProblemProposalComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
