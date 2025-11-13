CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'DELETED';
ALTER TYPE "AuthAuditAction" ADD VALUE IF NOT EXISTS 'USER_PURGED';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "emailHash" TEXT,
  ADD COLUMN IF NOT EXISTS "emailEncrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "piiScrubbedAt" TIMESTAMP(3);

UPDATE "User"
SET "emailHash" = encode(digest(lower(trim("email")), 'sha256'), 'hex')
WHERE "emailHash" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_emailHash_key" ON "User"("emailHash");
