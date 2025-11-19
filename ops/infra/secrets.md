# Secrets & Configuration

All environments consume the same variables validated in `lib/env.ts`. Use the templates in `ops/env/*.env` as the canonical definitions.

## Required Secrets
- **Session/Auth:** `SESSION_SECRET`, `SENSITIVE_DATA_KEY`, `REALTIME_WORKER_TOKEN`.
- **Databases:** `DATABASE_URL`, `DIRECT_URL` (read replica optional).
- **RabbitMQ:** `JUDGE_RABBIT_URL`, `JUDGE_RABBIT_PREFETCH`.
- **MinIO / Object Storage:** `MINIO_ENDPOINT`, `MINIO_BUCKET`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_PUBLIC_URL`.
- **Email/OAuth:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, OAuth client IDs/secrets.
- **Observability:** `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `METRICS_ACCESS_TOKEN`.
- **AI (optional):** `AI_PROVIDER`, `OPENAI_API_KEY`, `OLLAMA_HOST`.

## Storage Strategy
- **Dev:** `.env` or `direnv` referencing `ops/env/dev.env`.
- **Staging:** managed secret manager (AWS SSM, Doppler, 1Password). Render to `/etc/opensolve/staging.env` before invoking compose.
- **Production (Fly):** `flyctl secrets import < ops/env/prod.env`.

Rotate secrets quarterly. Update the corresponding env template so new engineers know which keys exist.
