import { env } from "@/lib/env";
import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

// In development, use console transport to avoid worker thread issues
export const logger = isDev
  ? pino({
      level: env.LOG_LEVEL,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
      formatters: {
        level(label) {
          return { level: label };
        },
      },
    })
  : pino({
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
