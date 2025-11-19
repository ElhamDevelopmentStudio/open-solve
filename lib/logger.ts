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

const SENSITIVE_KEYS = new Set(["password", "token", "code", "secret"]);

const redactValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
          return [key, "[REDACTED]"];
        }
        return [key, redactValue(val)];
      }),
    );
  }
  return value;
};

export const logRequest = (fields: RequestLogFields) => {
  logger.info(redactValue(fields), "request completed");
};

export const logError = (error: unknown, context?: Record<string, unknown>) => {
  const safeContext = context ? (redactValue(context) as Record<string, unknown>) : undefined;
  logger.error({ err: error, ...(safeContext ?? {}) }, "application error");
};
