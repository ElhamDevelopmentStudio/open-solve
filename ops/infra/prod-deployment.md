# Production Deployment (Fly.io)

Production runs on [Fly.io](https://fly.io) using the `fly.toml` descriptor at the repo root. Fly builds the Dockerfile, provisions regional machines, and runs two processes (`app` and `worker`).

## 1. Prerequisites

- Fly CLI (`flyctl`) authenticated with your organization.
- Dedicated MinIO endpoint (run MinIO as a separate Fly app, on another VM, or point to an existing S3-compatible store). Update `ops/env/prod.env` accordingly.
- Managed Postgres & RabbitMQ (Neon/Planetscale/AWS RDS, CloudAMQP, etc.).

## 2. Configure secrets

Convert `ops/env/prod.env` into Fly secrets:

```bash
flyctl secrets import < ops/env/prod.env
```

Update placeholders first (SESSION_SECRET, DATABASE_URL, MINIO credentials, SENTRY, etc.).

## 3. Launch / deploy

```bash
flyctl launch --no-deploy --copy-config
flyctl deploy
```

- `app` process serves HTTP traffic on port 3000 and exposes `/api/trpc/health.status` as a health check.
- `worker` process runs `npm run judge:worker`. Scale it separately: `flyctl scale count worker=2`.

## 4. MinIO options

- Run MinIO as another Fly app using the official image + a volume, then point `MINIO_ENDPOINT` to `<app>.internal:9000`.
- Or keep MinIO on the same VM/VM cluster you already run (update `MINIO_PUBLIC_URL` to expose it via CDN/reverse proxy).

## 5. Rolling deploys & rollback

- Every `flyctl deploy` uses the Dockerfile and the latest Git commit. The CLI streams progress and keeps the previous release available.
- Roll back: `flyctl releases` to find the prior version, then `flyctl deploy --image <image_ref>`.
- Health checks hit `/api/trpc/health.status`; traffic only shifts after the new release passes checks.

## 6. Observability

- Expose `/api/internal/metrics` through a private Fly machine or tunnel for Prometheus scraping (protect with `METRICS_ACCESS_TOKEN`).
- Sentry DSN + log drains are configured via env vars/secrets.

If you prefer to run production on bare metal/VPS instead of Fly, use `ops/docker/docker-compose.prod.yml` with `ops/env/prod.env`—the containers are identical.
