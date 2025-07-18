import pino from "pino";
import { env } from "@/lib/env";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      },
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
