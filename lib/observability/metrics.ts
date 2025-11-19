import { ContestState } from "@prisma/client";
import { Gauge, Histogram, Counter, Registry, collectDefaultMetrics } from "prom-client";
import { withJudgeChannel } from "@/lib/judge/queue";
import { JUDGE_QUEUES } from "@/lib/judge/config";
import { prisma } from "@/lib/prisma";

type MetricsBundle = {
  register: Registry;
  trpcDuration: Histogram<string>;
  trpcRequests: Counter<string>;
  submissionEvents: Counter<string>;
  judgeWorkerFailures: Counter<string>;
  judgeQueueDepth: Gauge<string>;
  contestsRunning: Gauge<string>;
  contestsFrozen: Gauge<string>;
};

declare global {
  var __opensolveMetrics__: MetricsBundle | undefined;
}

const bundle = getMetricsBundle();

function getMetricsBundle(): MetricsBundle {
  if (!globalThis.__opensolveMetrics__) {
    const register = new Registry();
    collectDefaultMetrics({ register, prefix: "opensolve_" });
    const trpcDuration = new Histogram({
      name: "opensolve_trpc_duration_seconds",
      help: "tRPC procedure duration",
      labelNames: ["procedure", "method"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [register],
    });
    const trpcRequests = new Counter({
      name: "opensolve_trpc_requests_total",
      help: "tRPC request totals",
      labelNames: ["procedure", "method", "status"],
      registers: [register],
    });
    const submissionEvents = new Counter({
      name: "opensolve_submission_events_total",
      help: "Submission events emitted by the platform",
      labelNames: ["event", "language", "manual"],
      registers: [register],
    });
    const judgeWorkerFailures = new Counter({
      name: "opensolve_judge_worker_failures_total",
      help: "Judge worker failures",
      labelNames: ["node"],
      registers: [register],
    });
    const judgeQueueDepth = new Gauge({
      name: "opensolve_judge_queue_messages",
      help: "Messages queued per judge queue",
      labelNames: ["queue"],
      registers: [register],
    });
    const contestsRunning = new Gauge({
      name: "opensolve_contests_running_total",
      help: "Number of running contests",
      registers: [register],
    });
    const contestsFrozen = new Gauge({
      name: "opensolve_contests_frozen_total",
      help: "Number of contests currently in freeze",
      registers: [register],
    });
    globalThis.__opensolveMetrics__ = {
      register,
      trpcDuration,
      trpcRequests,
      submissionEvents,
      judgeWorkerFailures,
      judgeQueueDepth,
      contestsRunning,
      contestsFrozen,
    } satisfies MetricsBundle;
  }
  return globalThis.__opensolveMetrics__!;
}

export const metricsRegistry = bundle.register;

export function startTrpcTimer({ procedure, method }: { procedure: string; method: string }) {
  return bundle.trpcDuration.startTimer({ procedure, method });
}

export function recordTrpcResult({
  procedure,
  method,
  status,
}: {
  procedure: string;
  method: string;
  status: string;
}) {
  bundle.trpcRequests.inc({ procedure, method, status });
}

export function recordSubmissionEvent({
  event,
  language,
  manual,
}: {
  event: "enqueued" | "processed" | "failed";
  language: string;
  manual: boolean;
}) {
  bundle.submissionEvents.inc({ event, language, manual: manual ? "true" : "false" });
}

export function recordJudgeWorkerFailure(nodeId: string) {
  bundle.judgeWorkerFailures.inc({ node: nodeId });
}

export async function refreshOperationalMetrics() {
  await Promise.all([sampleJudgeQueues(), sampleContestStates()]);
}

async function sampleJudgeQueues() {
  try {
    await withJudgeChannel(async (channel) => {
      if (!channel) {
        setEmptyQueueMetrics();
        return null;
      }
      const [submissions, rejudge, manual] = await Promise.all([
        channel.checkQueue(JUDGE_QUEUES.submissions),
        channel.checkQueue(JUDGE_QUEUES.rejudge),
        channel.checkQueue(JUDGE_QUEUES.manual),
      ]);
      bundle.judgeQueueDepth.set({ queue: "submissions" }, submissions.messageCount);
      bundle.judgeQueueDepth.set({ queue: "rejudge" }, rejudge.messageCount);
      bundle.judgeQueueDepth.set({ queue: "manual" }, manual.messageCount);
      return null;
    });
  } catch {
    setEmptyQueueMetrics();
  }
}

function setEmptyQueueMetrics() {
  bundle.judgeQueueDepth.set({ queue: "submissions" }, 0);
  bundle.judgeQueueDepth.set({ queue: "rejudge" }, 0);
  bundle.judgeQueueDepth.set({ queue: "manual" }, 0);
}

async function sampleContestStates() {
  const now = new Date();
  const [running, frozen] = await Promise.all([
    prisma.contest.count({
      where: {
        deletedAt: null,
        state: ContestState.RUNNING,
      },
    }),
    prisma.contest.count({
      where: {
        deletedAt: null,
        freezeAt: { not: null, lte: now },
        endsAt: { gte: now },
      },
    }),
  ]);
  bundle.contestsRunning.set(running);
  bundle.contestsFrozen.set(frozen);
}
