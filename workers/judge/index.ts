import { JudgeWorker } from "@/lib/judge/worker";
import { logger } from "@/lib/logger";

const worker = new JudgeWorker();

worker.start().catch((error) => {
  logger.error({ error }, "judge worker failed to start");
  process.exit(1);
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, "shutting down judge worker");
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
