import { env } from "@/lib/env";
import { JUDGE_QUEUES } from "@/lib/judge/config";
import { withJudgeChannel } from "@/lib/judge/queue";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

export type HealthCheck = {
  healthy: boolean;
  latencyMs?: number;
  error?: string;
  optional?: boolean;
  details?: string;
};

export async function databaseHealthCheck(): Promise<HealthCheck> {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      healthy: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    logError(error, { component: "health-check", dependency: "database" });
    return {
      healthy: false,
      error: "Database connection failed",
    };
  }
}

export async function runCoreChecks(): Promise<Record<string, HealthCheck>> {
  return {
    database: await databaseHealthCheck(),
    rabbitmq: await rabbitHealthCheck(),
    objectStorage: await objectStorageHealthCheck(),
  };
}

async function rabbitHealthCheck(): Promise<HealthCheck> {
  if (!env.JUDGE_RABBIT_URL) {
    return {
      healthy: true,
      optional: true,
      details: "RabbitMQ disabled",
    };
  }

  const startedAt = Date.now();
  try {
    const result = await withJudgeChannel(async (channel) => {
      await Promise.all([
        channel.checkQueue(JUDGE_QUEUES.submissions),
        channel.checkQueue(JUDGE_QUEUES.rejudge),
        channel.checkQueue(JUDGE_QUEUES.manual),
        channel.checkQueue(JUDGE_QUEUES.retry1m),
        channel.checkQueue(JUDGE_QUEUES.retry5m),
        channel.checkQueue(JUDGE_QUEUES.retry30m),
      ]);
      return true;
    });

    if (!result) {
      return {
        healthy: false,
        error: "RabbitMQ unreachable",
      };
    }

    return {
      healthy: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    logError(error, { component: "health-check", dependency: "rabbitmq" });
    return {
      healthy: false,
      error: "RabbitMQ connection failed",
    };
  }
}

async function objectStorageHealthCheck(): Promise<HealthCheck> {
  if (!env.MINIO_ENDPOINT || !env.MINIO_BUCKET || !env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
    return {
      healthy: true,
      optional: true,
      details: "Object storage not configured",
    };
  }

  const startedAt = Date.now();
  try {
    const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      forcePathStyle: true,
      region: env.MINIO_REGION ?? "us-east-1",
      endpoint: `${env.MINIO_USE_SSL ? "https" : "http"}://${env.MINIO_ENDPOINT}`,
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
    });
    await client.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
    return {
      healthy: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    logError(error, { component: "health-check", dependency: "object-storage" });
    return {
      healthy: false,
      error: "Object storage check failed",
    };
  }
}
