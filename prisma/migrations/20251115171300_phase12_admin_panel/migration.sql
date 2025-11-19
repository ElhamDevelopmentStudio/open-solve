-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'MITIGATED', 'MONITORING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('SEV1', 'SEV2', 'SEV3');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthAuditAction" ADD VALUE 'USER_ROLE_CHANGED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'USER_STATUS_CHANGED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'IMPERSONATION_STARTED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'IMPERSONATION_ENDED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'FEATURE_FLAG_CREATED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'FEATURE_FLAG_UPDATED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'FEATURE_FLAG_DELETED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'SYSTEM_SETTING_UPDATED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'INCIDENT_CREATED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'INCIDENT_UPDATED';
ALTER TYPE "AuthAuditAction" ADD VALUE 'INCIDENT_RESOLVED';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "impersonatorId" TEXT,
ADD COLUMN     "impersonatorSessionId" TEXT;

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "value" JSONB NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "targeting" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'SEV3',
    "impact" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "timeline" JSONB,
    "createdById" TEXT,
    "resolvedById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "Incident_status_severity_idx" ON "Incident"("status", "severity");

-- CreateIndex
CREATE INDEX "Incident_startedAt_idx" ON "Incident"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_title_key" ON "Incident"("title");

-- CreateIndex
CREATE INDEX "Session_impersonatorId_idx" ON "Session"("impersonatorId");

-- CreateIndex
CREATE INDEX "Session_impersonatorSessionId_idx" ON "Session"("impersonatorSessionId");
