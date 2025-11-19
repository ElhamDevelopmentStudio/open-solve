import { prisma } from "@/lib/prisma";

const EVENT_RETENTION_DAYS = 365;
const SNAPSHOT_RETENTION_DAYS = 90;
const MIN_RETENTION_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let lastRetentionRun = 0;

export async function enforceAnalyticsRetention() {
  const now = Date.now();
  if (now - lastRetentionRun < MIN_RETENTION_INTERVAL_MS) {
    return;
  }
  lastRetentionRun = now;

  const eventCutoff = new Date(now - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const snapshotCutoff = new Date(now - SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  await Promise.all([
    prisma.analyticsEvent.deleteMany({
      where: { createdAt: { lt: eventCutoff } },
    }),
    prisma.problemAnalyticsSnapshot.deleteMany({
      where: { computedAt: { lt: snapshotCutoff } },
    }),
  ]);
}
