# Local Development (Docker Compose)

OpenSolve’s local stack runs entirely via Docker Compose with Postgres, RabbitMQ, MinIO, the Next.js app, and the judge worker.

## 1. Prerequisites

- Docker Engine 24+
- Docker Compose V2 (`docker compose`)
- Node.js 20+ (only if you also run `npm run dev` locally)

## 2. Environment variables

Copy `ops/env/dev.env` and adjust secrets if needed:

```bash
cp ops/env/dev.env ops/env/dev.local.env
# edit dev.local.env with your secrets (SESSION_SECRET, etc.)
```

## 3. Start the stack

From the repository root:

```bash
docker compose up --build
```

Shortcuts are available too:

```bash
make up
npm run docker:up
```

By default, Compose reads `ops/env/dev.env`. To use your private copy:

```bash
OPENSOLVE_ENV_FILE=./ops/env/dev.local.env docker compose up --build
```

Services exposed:

- Web: http://localhost:3000
- Postgres: localhost:5432
- RabbitMQ UI: http://localhost:15672 (opensolve / opensolve)
- MinIO console: http://localhost:9001 (credentials from env file)

MinIO bootstrap is automatic via the `minio-mc` sidecar. Buckets and access keys come from the same env file.

## 4. Useful commands

- Rebuild after code changes: add `--build` or run `docker compose build web worker`.
- Tail logs: `docker compose logs -f web`.
- Show service status: `docker compose ps`.
- Stop containers: `docker compose down`.
- Reset Postgres/MinIO: remove the named volumes `postgres-data` / `minio-data`.

## 5. Stopping the stack

`Ctrl+C` stops foreground sessions. To remove containers and volumes:

```bash
docker compose down --volumes
```

This workflow mirrors production settings (RabbitMQ + MinIO) so judge behavior matches other environments.
