-- DropIndex
DROP INDEX "Problem_state_visibility_difficultyId_createdAt_idx";

-- CreateIndex
CREATE INDEX "Problem_state_visibility_difficultyId_createdAt_idx" ON "Problem"("state", "visibility", "difficultyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProblemTag_tagId_problemId_idx" ON "ProblemTag"("tagId", "problemId");

-- CreateIndex
CREATE INDEX "Submission_contestId_userId_idx" ON "Submission"("contestId", "userId");

-- CreateIndex
CREATE INDEX "Submission_contestId_problemId_userId_idx" ON "Submission"("contestId", "problemId", "userId");
