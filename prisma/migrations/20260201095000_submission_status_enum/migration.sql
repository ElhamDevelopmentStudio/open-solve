-- Ensure SubmissionStatus enum contains values used in schema/seed

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubmissionStatus') THEN
    CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'RUNNING', 'FAILED', 'COMPLETED', 'MANUAL_PENDING');
  END IF;
END $$;

ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'RUNNING';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'SUCCEEDED';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'RETRYING';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'MANUAL_PENDING';
