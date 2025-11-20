-- Add the missing contest enums and columns to keep schema and DB aligned
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ContestType'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public."ContestType" AS ENUM ('COMPETITIVE', 'EDUCATIONAL', 'PRIVATE', 'CUSTOM');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ContestRegistrationStatus'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public."ContestRegistrationStatus" AS ENUM ('REGISTERED', 'INVITED', 'WAITLISTED', 'DECLINED', 'REMOVED');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ClarificationVisibility'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public."ClarificationVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'ClarificationStatus'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public."ClarificationStatus" AS ENUM ('OPEN', 'ANSWERED', 'ANNOUNCED', 'CLOSED');
    END IF;
END
$$;

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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Contest' AND column_name = 'type'
    ) THEN
        ALTER TABLE "Contest" ADD COLUMN "type" public."ContestType" NOT NULL DEFAULT 'COMPETITIVE';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Contest' AND column_name = 'settings'
    ) THEN
        ALTER TABLE "Contest" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ContestProblem' AND column_name = 'settings'
    ) THEN
        ALTER TABLE "ContestProblem" ADD COLUMN "settings" JSONB NOT NULL DEFAULT '{}';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ContestRegistration' AND column_name = 'status'
    ) THEN
        ALTER TABLE "ContestRegistration" ADD COLUMN "status" public."ContestRegistrationStatus" NOT NULL DEFAULT 'REGISTERED';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ContestRegistration' AND column_name = 'isDisqualified'
    ) THEN
        ALTER TABLE "ContestRegistration" ADD COLUMN "isDisqualified" BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ContestRegistration' AND column_name = 'disqualifiedAt'
    ) THEN
        ALTER TABLE "ContestRegistration" ADD COLUMN "disqualifiedAt" TIMESTAMP(3);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ContestRegistration' AND column_name = 'dqReason'
    ) THEN
        ALTER TABLE "ContestRegistration" ADD COLUMN "dqReason" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ContestRegistration' AND column_name = 'deviceFingerprint'
    ) THEN
        ALTER TABLE "ContestRegistration" ADD COLUMN "deviceFingerprint" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ContestRegistration' AND column_name = 'ipHash'
    ) THEN
        ALTER TABLE "ContestRegistration" ADD COLUMN "ipHash" TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ContestRegistration' AND column_name = 'inviteCode'
    ) THEN
        ALTER TABLE "ContestRegistration" ADD COLUMN "inviteCode" TEXT;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ContestSnapshot" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContestSnapshot_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ContestSnapshot_contestId_frozenAt_idx" ON "ContestSnapshot"("contestId", "frozenAt");

CREATE TABLE IF NOT EXISTS "ContestClarification" (
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

CREATE INDEX IF NOT EXISTS "ContestClarification_contestId_status_idx" ON "ContestClarification"("contestId", "status");
CREATE INDEX IF NOT EXISTS "ContestClarification_userId_createdAt_idx" ON "ContestClarification"("userId", "createdAt");

ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "isFrozen" BOOLEAN NOT NULL DEFAULT false;
