import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional(),
  );

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    SESSION_SECRET: z.string().min(32),
    APP_URL: z.string().url(),
    GITHUB_CLIENT_ID: emptyToUndefined(z.string()),
    GITHUB_CLIENT_SECRET: emptyToUndefined(z.string()),
    GOOGLE_CLIENT_ID: emptyToUndefined(z.string()),
    GOOGLE_CLIENT_SECRET: emptyToUndefined(z.string()),
    RESEND_API_KEY: emptyToUndefined(z.string()),
    RESEND_FROM_EMAIL: z.string().email().default("auth@opensolve.dev"),
    AI_PROVIDER: emptyToUndefined(z.enum(["openai", "ollama"])),
    OPENAI_API_KEY: emptyToUndefined(z.string()),
    OLLAMA_HOST: emptyToUndefined(z.string().url()),
    SENTRY_DSN: emptyToUndefined(z.string().url()),
    SENTRY_ENVIRONMENT: z
      .string()
      .min(1)
      .default(process.env.NODE_ENV ?? "development"),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().catch(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().catch(250),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    // MinIO / S3-compatible storage (optional)
    MINIO_ENDPOINT: emptyToUndefined(z.string()),
    MINIO_BUCKET: emptyToUndefined(z.string()),
    MINIO_ACCESS_KEY: emptyToUndefined(z.string()),
    MINIO_SECRET_KEY: emptyToUndefined(z.string()),
    MINIO_REGION: emptyToUndefined(z.string()),
    MINIO_USE_SSL: z
      .preprocess(
        (v) => (typeof v === "string" ? v.toLowerCase() : v),
        z.enum(["true", "false"]).optional(),
      )
      .transform((v) => v === "true")
      .optional(),
    MINIO_PUBLIC_URL: emptyToUndefined(z.string().url()),
  },
  client: {
    NEXT_PUBLIC_SENTRY_DSN: emptyToUndefined(z.string().url()),
    NEXT_PUBLIC_SITE_URL: emptyToUndefined(z.string().url()),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_URL: process.env.APP_URL,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    AI_PROVIDER: process.env.AI_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OLLAMA_HOST: process.env.OLLAMA_HOST,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    RATE_LIMIT_WINDOW_SECONDS: process.env.RATE_LIMIT_WINDOW_SECONDS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    LOG_LEVEL: process.env.LOG_LEVEL,
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_BUCKET: process.env.MINIO_BUCKET,
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
    MINIO_REGION: process.env.MINIO_REGION,
    MINIO_USE_SSL: process.env.MINIO_USE_SSL,
    MINIO_PUBLIC_URL: process.env.MINIO_PUBLIC_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
