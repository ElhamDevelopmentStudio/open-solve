-- CreateEnum
CREATE TYPE "ContestAntiCheatSessionStatus" AS ENUM ('ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ContestAntiCheatEventType" AS ENUM ('SESSION_START', 'SESSION_END', 'FOCUS_GAIN', 'FOCUS_LOSS', 'TAB_SWITCH', 'WINDOW_HIDDEN', 'LARGE_PASTE', 'MULTI_DEVICE', 'TIMING_SPIKE', 'SIMILARITY_CLUSTER', 'FLAG_STATUS', 'SYSTEM_WARNING');

-- CreateEnum
CREATE TYPE "ContestAntiCheatSeverity" AS ENUM ('INFO', 'WARNING', 'FLAG', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ContestAntiCheatFlagStatus" AS ENUM ('CLEAN', 'WARNING', 'UNDER_REVIEW', 'SUSPICIOUS', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "ContestAntiCheatClusterStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "ContestAntiCheatSession" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "osFamily" TEXT,
    "browserFamily" TEXT,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "connectionType" TEXT,
    "ipHash" TEXT,
    "geoRegion" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "ContestAntiCheatSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "violationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ContestAntiCheatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestAntiCheatFocusMetric" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT,
    "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
    "totalOutOfFocusMs" INTEGER NOT NULL DEFAULT 0,
    "maxConsecutiveOutMs" INTEGER NOT NULL DEFAULT 0,
    "warningsIssued" INTEGER NOT NULL DEFAULT 0,
    "flagsIssued" INTEGER NOT NULL DEFAULT 0,
    "lastEventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestAntiCheatFocusMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestAntiCheatFlag" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ContestAntiCheatFlagStatus" NOT NULL DEFAULT 'CLEAN',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
    "totalOutOfFocusMs" INTEGER NOT NULL DEFAULT 0,
    "largePasteCount" INTEGER NOT NULL DEFAULT 0,
    "suspiciousSessions" INTEGER NOT NULL DEFAULT 0,
    "lastEventAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestAntiCheatFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestAntiCheatEvent" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "registrationId" TEXT,
    "sessionId" TEXT,
    "flagId" TEXT,
    "userId" TEXT,
    "problemId" TEXT,
    "type" "ContestAntiCheatEventType" NOT NULL,
    "severity" "ContestAntiCheatSeverity" NOT NULL DEFAULT 'INFO',
    "note" TEXT,
    "payload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestAntiCheatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestAntiCheatCluster" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "ContestAntiCheatClusterStatus" NOT NULL DEFAULT 'OPEN',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContestAntiCheatCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestAntiCheatClusterMember" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "submissionId" TEXT,
    "similarity" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestAntiCheatClusterMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContestAntiCheatSession_registrationId_idx" ON "ContestAntiCheatSession"("registrationId");

-- CreateIndex
CREATE INDEX "ContestAntiCheatSession_userId_contestId_idx" ON "ContestAntiCheatSession"("userId", "contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestAntiCheatSession_contestId_sessionId_key" ON "ContestAntiCheatSession"("contestId", "sessionId");

-- CreateIndex
CREATE INDEX "ContestAntiCheatFocusMetric_contestId_registrationId_idx" ON "ContestAntiCheatFocusMetric"("contestId", "registrationId");

-- CreateIndex
CREATE INDEX "ContestAntiCheatFocusMetric_problemId_idx" ON "ContestAntiCheatFocusMetric"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestAntiCheatFocusMetric_contestId_registrationId_sessio_key" ON "ContestAntiCheatFocusMetric"("contestId", "registrationId", "sessionId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestAntiCheatFlag_registrationId_key" ON "ContestAntiCheatFlag"("registrationId");

-- CreateIndex
CREATE INDEX "ContestAntiCheatFlag_status_idx" ON "ContestAntiCheatFlag"("status");

-- CreateIndex
CREATE INDEX "ContestAntiCheatEvent_contestId_occurredAt_idx" ON "ContestAntiCheatEvent"("contestId", "occurredAt");

-- CreateIndex
CREATE INDEX "ContestAntiCheatEvent_registrationId_idx" ON "ContestAntiCheatEvent"("registrationId");

-- CreateIndex
CREATE INDEX "ContestAntiCheatEvent_flagId_idx" ON "ContestAntiCheatEvent"("flagId");

-- CreateIndex
CREATE INDEX "ContestAntiCheatEvent_sessionId_idx" ON "ContestAntiCheatEvent"("sessionId");

-- CreateIndex
CREATE INDEX "ContestAntiCheatEvent_problemId_idx" ON "ContestAntiCheatEvent"("problemId");

-- CreateIndex
CREATE INDEX "ContestAntiCheatCluster_contestId_problemId_idx" ON "ContestAntiCheatCluster"("contestId", "problemId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestAntiCheatClusterMember_clusterId_flagId_key" ON "ContestAntiCheatClusterMember"("clusterId", "flagId");

-- AddForeignKey
ALTER TABLE "ContestAntiCheatSession" ADD CONSTRAINT "ContestAntiCheatSession_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatSession" ADD CONSTRAINT "ContestAntiCheatSession_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ContestRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatSession" ADD CONSTRAINT "ContestAntiCheatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatFocusMetric" ADD CONSTRAINT "ContestAntiCheatFocusMetric_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatFocusMetric" ADD CONSTRAINT "ContestAntiCheatFocusMetric_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ContestRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatFocusMetric" ADD CONSTRAINT "ContestAntiCheatFocusMetric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ContestAntiCheatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatFocusMetric" ADD CONSTRAINT "ContestAntiCheatFocusMetric_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatFlag" ADD CONSTRAINT "ContestAntiCheatFlag_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatFlag" ADD CONSTRAINT "ContestAntiCheatFlag_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ContestRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatFlag" ADD CONSTRAINT "ContestAntiCheatFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatEvent" ADD CONSTRAINT "ContestAntiCheatEvent_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatEvent" ADD CONSTRAINT "ContestAntiCheatEvent_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ContestRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatEvent" ADD CONSTRAINT "ContestAntiCheatEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ContestAntiCheatSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatEvent" ADD CONSTRAINT "ContestAntiCheatEvent_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "ContestAntiCheatFlag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatEvent" ADD CONSTRAINT "ContestAntiCheatEvent_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatCluster" ADD CONSTRAINT "ContestAntiCheatCluster_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatCluster" ADD CONSTRAINT "ContestAntiCheatCluster_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatClusterMember" ADD CONSTRAINT "ContestAntiCheatClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ContestAntiCheatCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatClusterMember" ADD CONSTRAINT "ContestAntiCheatClusterMember_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "ContestAntiCheatFlag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestAntiCheatClusterMember" ADD CONSTRAINT "ContestAntiCheatClusterMember_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
