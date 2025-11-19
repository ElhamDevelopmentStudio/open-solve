-- Add the missing contest enums and columns to keep schema and DB aligned
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContestType') THEN
        CREATE TYPE "ContestType" AS ENUM ('COMPETITIVE', 'EDUCATIONAL', 'PRIVATE', 'CUSTOM');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContestRegistrationStatus') THEN
        CREATE TYPE "ContestRegistrationStatus" AS ENUM ('REGISTERED', 'INVITED', 'WAITLISTED', 'DECLINED', 'REMOVED');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClarificationVisibility') THEN
        CREATE TYPE "ClarificationVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClarificationStatus') THEN
        CREATE TYPE "ClarificationStatus" AS ENUM ('OPEN', 'ANSWERED', 'ANNOUNCED', 'CLOSED');
    END IF;
END$$;

DO $$
BEGIN
    BEGIN
        ALTER TYPE "ContestRuleset" ADD VALUE IF NOT EXISTS 'ATCODER';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE "ContestRuleset" ADD VALUE IF NOT EXISTS 'CUSTOM';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END$$;

ALTER TABLE "Contest" ADD COLUMN "type" "ContestType" NOT NULL DEFAULT 'COMPETITIVE';
ALTER TABLE "Contest" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "ContestProblem" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "ContestRegistration" ADD COLUMN "status" "ContestRegistrationStatus" NOT NULL DEFAULT 'REGISTERED';
ALTER TABLE "ContestRegistration" ADD COLUMN "isDisqualified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ContestRegistration" ADD COLUMN "disqualifiedAt" TIMESTAMP(3);
ALTER TABLE "ContestRegistration" ADD COLUMN "dqReason" TEXT;
ALTER TABLE "ContestRegistration" ADD COLUMN "deviceFingerprint" TEXT;
ALTER TABLE "ContestRegistration" ADD COLUMN "ipHash" TEXT;
ALTER TABLE "ContestRegistration" ADD COLUMN "inviteCode" TEXT;

CREATE TABLE "ContestSnapshot" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContestSnapshot_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContestSnapshot_contestId_frozenAt_idx" ON "ContestSnapshot"("contestId", "frozenAt");

CREATE TABLE "ContestClarification" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "visibility" "ClarificationVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "ClarificationStatus" NOT NULL DEFAULT 'OPEN',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestClarification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContestClarification_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContestClarification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContestClarification_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContestClarification_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ContestClarification_contestId_status_idx" ON "ContestClarification"("contestId", "status");
CREATE INDEX "ContestClarification_userId_createdAt_idx" ON "ContestClarification"("userId", "createdAt");

ALTER TABLE "Submission" ADD COLUMN "isFrozen" BOOLEAN NOT NULL DEFAULT false;
