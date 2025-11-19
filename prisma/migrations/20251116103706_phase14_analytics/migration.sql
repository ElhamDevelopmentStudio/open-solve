-- CreateTable
CREATE TABLE "ProblemAnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "windowHours" INTEGER NOT NULL DEFAULT 168,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT,
    "sessionId" TEXT,
    "problemId" TEXT,
    "contestId" TEXT,
    "languageCode" TEXT,
    "deviceType" TEXT,
    "osFamily" TEXT,
    "browserFamily" TEXT,
    "route" TEXT,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "context" JSONB NOT NULL DEFAULT '{}',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemAnalyticsSnapshot_computedAt_idx" ON "ProblemAnalyticsSnapshot"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemAnalyticsSnapshot_problemId_windowHours_key" ON "ProblemAnalyticsSnapshot"("problemId", "windowHours");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventName_createdAt_idx" ON "AnalyticsEvent"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_problemId_createdAt_idx" ON "AnalyticsEvent"("problemId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_contestId_createdAt_idx" ON "AnalyticsEvent"("contestId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProblemAnalyticsSnapshot" ADD CONSTRAINT "ProblemAnalyticsSnapshot_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
