import amqplib from "amqplib";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { JUDGE_EXCHANGES, JUDGE_QUEUES } from "@/lib/judge/config";
import type { JudgeSubmissionMessage, ManualJudgeMessage } from "@/lib/judge/messages";

let connectionPromise: Promise<amqplib.Connection> | null = null;
let publishChannelPromise: Promise<amqplib.ConfirmChannel> | null = null;
let infrastructureReady = false;

const ROUTING_KEYS = {
  submissions: "auto",
  rejudge: "rejudge",
  manual: "manual",
  retry1m: "retry.1m",
  retry5m: "retry.5m",
  retry30m: "retry.30m",
} as const;

const ensureConnection = async () => {
  if (!env.JUDGE_RABBIT_URL) {
    return null;
  }
  if (!connectionPromise) {
    connectionPromise = (amqplib.connect(env.JUDGE_RABBIT_URL) as unknown as Promise<amqplib.Connection>)
      .then((conn) => {
        conn.on("close", () => {
          infrastructureReady = false;
          connectionPromise = null;
          publishChannelPromise = null;
        });
        conn.on("error", (error) => {
          logger.error({ error }, "judge broker connection error");
        });
        return conn;
      })
      .catch((error) => {
        connectionPromise = null;
        logger.error({ error }, "failed to connect to rabbitmq");
        throw error;
      });
  }
  return connectionPromise;
};

const ensurePublishChannel = async () => {
  const connection = await ensureConnection();
  if (!connection) {
    return null;
  }
  if (!publishChannelPromise) {
    const confirmConnection = connection as amqplib.Connection & {
      createConfirmChannel: () => Promise<amqplib.ConfirmChannel>;
    };
    publishChannelPromise = confirmConnection
      .createConfirmChannel()
      .then(async (channel) => {
        await setupInfrastructure(channel);
        return channel;
      })
      .catch((error) => {
        publishChannelPromise = null;
        logger.error({ error }, "failed to create judge publish channel");
        throw error;
      });
  }
  return publishChannelPromise;
};

const setupInfrastructure = async (channel: amqplib.Channel) => {
  if (infrastructureReady) {
    return;
  }
  await channel.assertExchange(JUDGE_EXCHANGES.submissions, "direct", { durable: true });
  await channel.assertExchange(JUDGE_EXCHANGES.rejudge, "direct", { durable: true });
  await channel.assertExchange(JUDGE_EXCHANGES.manual, "direct", { durable: true });
  await channel.assertExchange(JUDGE_EXCHANGES.dlx, "topic", { durable: true });

  await channel.assertQueue(JUDGE_QUEUES.submissions, {
    durable: true,
    arguments: {
      "x-queue-type": "quorum",
      "x-dead-letter-exchange": JUDGE_EXCHANGES.dlx,
      "x-dead-letter-routing-key": ROUTING_KEYS.retry1m,
    },
  });
  await channel.bindQueue(JUDGE_QUEUES.submissions, JUDGE_EXCHANGES.submissions, ROUTING_KEYS.submissions);

  await channel.assertQueue(JUDGE_QUEUES.rejudge, {
    durable: true,
    arguments: {
      "x-queue-type": "quorum",
      "x-dead-letter-exchange": JUDGE_EXCHANGES.dlx,
      "x-dead-letter-routing-key": ROUTING_KEYS.retry1m,
    },
  });
  await channel.bindQueue(JUDGE_QUEUES.rejudge, JUDGE_EXCHANGES.rejudge, ROUTING_KEYS.rejudge);

  await channel.assertQueue(JUDGE_QUEUES.manual, {
    durable: true,
    arguments: {
      "x-queue-type": "quorum",
    },
  });
  await channel.bindQueue(JUDGE_QUEUES.manual, JUDGE_EXCHANGES.manual, ROUTING_KEYS.manual);

  await declareRetryQueue(channel, JUDGE_QUEUES.retry1m, 60_000);
  await declareRetryQueue(channel, JUDGE_QUEUES.retry5m, 5 * 60_000);
  await declareRetryQueue(channel, JUDGE_QUEUES.retry30m, 30 * 60_000);

  infrastructureReady = true;
};

const declareRetryQueue = async (channel: amqplib.Channel, queueName: string, ttl: number) => {
  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      "x-queue-type": "quorum",
      "x-message-ttl": ttl,
      "x-dead-letter-exchange": JUDGE_EXCHANGES.submissions,
      "x-dead-letter-routing-key": ROUTING_KEYS.submissions,
    },
  });
  const routingKey =
    queueName === JUDGE_QUEUES.retry1m
      ? ROUTING_KEYS.retry1m
      : queueName === JUDGE_QUEUES.retry5m
        ? ROUTING_KEYS.retry5m
        : ROUTING_KEYS.retry30m;
  await channel.bindQueue(queueName, JUDGE_EXCHANGES.dlx, routingKey);
};

export const publishSubmissionMessage = async (payload: JudgeSubmissionMessage) => {
  try {
    const channel = await ensurePublishChannel();
    if (!channel) {
      return false;
    }
    const buffer = Buffer.from(JSON.stringify(payload));
    channel.publish(JUDGE_EXCHANGES.submissions, ROUTING_KEYS.submissions, buffer, {
      persistent: true,
      contentType: "application/json",
      timestamp: Date.now(),
      messageId: payload.submissionId,
    });
    await channel.waitForConfirms();
    return true;
  } catch (error) {
    logger.error({ error, submissionId: payload.submissionId }, "failed to publish submission");
    return false;
  }
};

export const publishManualMessage = async (payload: ManualJudgeMessage) => {
  try {
    const channel = await ensurePublishChannel();
    if (!channel) {
      return false;
    }
    const buffer = Buffer.from(JSON.stringify(payload));
    channel.publish(JUDGE_EXCHANGES.manual, ROUTING_KEYS.manual, buffer, {
      persistent: true,
      contentType: "application/json",
      timestamp: Date.now(),
      messageId: payload.submissionId,
    });
    await channel.waitForConfirms();
    return true;
  } catch (error) {
    logger.error({ error, submissionId: payload.submissionId }, "failed to publish manual review");
    return false;
  }
};

export const withJudgeChannel = async <T>(
  handler: (channel: amqplib.Channel) => Promise<T>,
) => {
  const connection = await ensureConnection();
  if (!connection) {
    return null;
  }
  const standardConnection = connection as amqplib.Connection & {
    createChannel: () => Promise<amqplib.Channel>;
  };
  const channel = await standardConnection.createChannel();
  await setupInfrastructure(channel);
  try {
    return await handler(channel);
  } finally {
    await channel.close().catch(() => {});
  }
};

export const createConsumerChannel = async () => {
  const connection = await ensureConnection();
  if (!connection) {
    return null;
  }
  const standardConnection = connection as amqplib.Connection & {
    createChannel: () => Promise<amqplib.Channel>;
  };
  const channel = await standardConnection.createChannel();
  await setupInfrastructure(channel);
  return channel;
};
