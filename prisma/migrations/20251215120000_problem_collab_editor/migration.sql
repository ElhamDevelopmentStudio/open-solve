/*
  Warnings:

  - You are about to drop the column `points` on the `TestCase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TestCase" DROP COLUMN IF EXISTS "points",
ADD COLUMN     "strength" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProblemCurator" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemCurator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemLanguage" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "codeStub" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProblemCurator_problemId_userId_key" ON "ProblemCurator"("problemId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemLanguage_problemId_languageCode_key" ON "ProblemLanguage"("problemId", "languageCode");

-- AddForeignKey
ALTER TABLE "ProblemCurator" ADD CONSTRAINT "ProblemCurator_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemCurator" ADD CONSTRAINT "ProblemCurator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemLanguage" ADD CONSTRAINT "ProblemLanguage_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemLanguage" ADD CONSTRAINT "ProblemLanguage_languageCode_fkey" FOREIGN KEY ("languageCode") REFERENCES "Language"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
