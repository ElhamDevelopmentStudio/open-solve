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
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: emptyToUndefined(z.string().url()),
    GITHUB_CLIENT_ID: emptyToUndefined(z.string()),
    GITHUB_CLIENT_SECRET: emptyToUndefined(z.string()),
    GOOGLE_CLIENT_ID: emptyToUndefined(z.string()),
    GOOGLE_CLIENT_SECRET: emptyToUndefined(z.string()),
    JWT_PRIVATE_KEY: z.string().min(1),
    JWT_PUBLIC_KEY: z.string().min(1),
    AI_PROVIDER: emptyToUndefined(z.enum(["openai", "ollama"])),
    OPENAI_API_KEY: emptyToUndefined(z.string()),
    OLLAMA_HOST: emptyToUndefined(z.string().url()),
    SENTRY_DSN: emptyToUndefined(z.string().url()),
    SENTRY_ENVIRONMENT: z
      .string()
      .min(1)
      .default(process.env.NODE_ENV ?? "development"),
    RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().catch(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().catch(30),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
  },
  client: {
    NEXT_PUBLIC_SENTRY_DSN: emptyToUndefined(z.string().url()),
    NEXT_PUBLIC_SITE_URL: emptyToUndefined(z.string().url()),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
    JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
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
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
