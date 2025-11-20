-- Guarded drop to avoid failures on fresh databases where the index was never created
DROP INDEX IF EXISTS "Problem_state_visibility_difficultyId_createdAt_idx";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Problem'
      AND column_name = 'state'
  ) THEN
    CREATE INDEX IF NOT EXISTS "Problem_state_visibility_difficultyId_createdAt_idx" ON "Problem"("state", "visibility", "difficultyId", "createdAt" DESC);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Submission'
      AND column_name = 'contestId'
  ) THEN
    CREATE INDEX IF NOT EXISTS "Submission_contestId_userId_idx" ON "Submission"("contestId", "userId");
    CREATE INDEX IF NOT EXISTS "Submission_contestId_problemId_userId_idx" ON "Submission"("contestId", "problemId", "userId");
  END IF;
END
$$;

-- CreateIndex
CREATE INDEX "ProblemTag_tagId_problemId_idx" ON "ProblemTag"("tagId", "problemId");
