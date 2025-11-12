-- Submission Flow phase 6 scaffolding: drafts + relationships
CREATE TABLE "SubmissionDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "cursorOffset" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "savedVia" TEXT NOT NULL DEFAULT 'autosave',
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubmissionDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubmissionDraft_userId_problemId_languageCode_createdAt_idx"
  ON "SubmissionDraft"("userId", "problemId", "languageCode", "createdAt");

CREATE INDEX "SubmissionDraft_problemId_languageCode_createdAt_idx"
  ON "SubmissionDraft"("problemId", "languageCode", "createdAt");

ALTER TABLE "SubmissionDraft"
  ADD CONSTRAINT "SubmissionDraft_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionDraft"
  ADD CONSTRAINT "SubmissionDraft_problemId_fkey"
  FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionDraft"
  ADD CONSTRAINT "SubmissionDraft_languageCode_fkey"
  FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
