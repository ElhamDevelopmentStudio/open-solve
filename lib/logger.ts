import { env } from "@/lib/env";
import pino from "pino";

// Use a simple stdout logger in all environments to avoid worker thread transports
export const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    bindings(bindings) {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
      };
    },
    level(label) {
      return { level: label };
    },
  },
});

export type RequestLogFields = {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  ip?: string | null;
  userAgent?: string | null;
};

export const logRequest = (fields: RequestLogFields) => {
  logger.info(fields, "request completed");
};

export const logError = (error: unknown, context?: Record<string, unknown>) => {
  logger.error({ err: error, ...context }, "application error");
};
