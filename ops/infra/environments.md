# Environment Matrix

| Env           | Purpose                           | How to run                                                                                                       | Key differences                                                                                                 |
| ------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `development` | Contributor local machines.       | `docker compose up --build` from the repository root.                                                            | Bundled Postgres + RabbitMQ + MinIO containers; relaxed logging + debug tooling.                                |
| `staging`     | Pre-prod validation and heavy QA. | `docker compose -f ops/docker/docker-compose.staging.yml --env-file <staging.env> up -d --build` on a single VM. | Connects to managed Postgres/RabbitMQ; MinIO still local for parity; TLS handled by reverse proxy.              |
| `production`  | User-facing workloads.            | `flyctl deploy` (Fly.io) using `fly.toml` **or** run `ops/docker/docker-compose.prod.yml` on hardened hosts.     | Dedicated managed services, autoscaled app/worker processes, CDN/HTTPS enforced, alerting + SLO budgets active. |

## Parity Rules

- Same Docker images flow through dev → staging → prod. Compose & Fly both reference the main `Dockerfile`.
- Each environment has its own Postgres, RabbitMQ, and MinIO bucket/credentials.
- Feature flags control risky rollouts instead of env-specific hacks.
- `ops/env/*.env` share identical keys so secrets can be rotated by copying the template into your secret manager.
- Root `docker-compose.yml` is the contributor-friendly development entry point. The `ops/docker/*.yml` files remain deployment-oriented specs for staging and production.

## Health Targets

- Liveness: `/api/trpc/health.status`.
- Readiness: `/api/trpc/health.readiness`.
- Metrics: `/api/internal/metrics` (protected by `METRICS_ACCESS_TOKEN`).

Document incidents, migrations, and env drift in the runbooks (`docs/quality/runbooks.md`).
