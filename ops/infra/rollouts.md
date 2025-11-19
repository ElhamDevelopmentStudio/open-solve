# Rollouts & Rollbacks

## Docker Compose (staging/prod on VMs)

1. Spin up a parallel stack pointing at a different port or host directory: `docker compose -f ops/docker/docker-compose.prod.yml -p opensolve-blue up -d --build`.
2. Verify health checks (`curl http://localhost:<port>/api/trpc/health.status`) and run smoke tests.
3. Switch the reverse proxy (NGINX/Caddy) to the new stack.
4. Decommission the old stack with `docker compose -p opensolve-green down` once traffic drains.

For canaries, limit the proxy route to a subset of users while monitoring `/api/internal/metrics` (queue depth, error rates) and the Admin → System dashboard.

## Fly.io

1. Deploy normally with `flyctl deploy`. Fly keeps the previous release for instant rollback.
2. For canary, create a second app (e.g., `opensolve-canary`), deploy the new image (`flyctl deploy --image ghcr.io/...:staging`), and route a percentage of traffic using DNS or CDN rules.
3. Roll back: `flyctl releases` to find the prior version, then `flyctl deploy --image <previous-image>`.

## Checklist

- Watch Prometheus metrics (`/api/internal/metrics`) and Sentry error rates for 10+ minutes post-deploy.
- Confirm judge queue depth returns to steady-state (Admin → System → Judge queues).
- Record every rollout in the incident log/runbook with commit SHA, image tags, and notable observations.
