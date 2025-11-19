# Staging Deployment (Docker Host)

Use the staging compose file to run the Next.js SSR app, judge worker, and MinIO on a single VM or bare-metal host. Staging connects to managed Postgres + RabbitMQ instances so you can mimic production without hosting databases locally.

## 1. Provision infrastructure
- Linux host with Docker Engine + Compose.
- Managed Postgres database + RabbitMQ cluster (use the connection strings inside `ops/env/staging.env`).
- Optional: point `APP_URL` / `NEXT_PUBLIC_SITE_URL` to the host’s HTTPS endpoint.

## 2. Configure secrets
1. Copy `ops/env/staging.env` to a secure location on the server (e.g., `/etc/opensolve/staging.env`).
2. Fill in the placeholders: SESSION_SECRET, database credentials, RabbitMQ URL, Sentry DSN, etc.
3. Set MinIO credentials; the compose file will run MinIO locally so the endpoint should stay `minio:9000`. Expose it via reverse proxy or Tunnel if needed.

## 3. Deploy

```bash
ssh my-staging-host
cd /opt/opensolve
# pull the git repo or sync artifacts first
cp /etc/opensolve/staging.env ops/env/staging.runtime.env
docker compose \
  -f ops/docker/docker-compose.staging.yml \
  --env-file ops/env/staging.runtime.env \
  up -d --build
```

- Port 3000 serves the web app. Terminate TLS with Nginx/Caddy and forward to `localhost:3000`.
- Ports 9000/9001 expose MinIO API + console; firewall as needed.

## 4. Updates & rollback
- Deploy a new commit: `git pull && docker compose ... build web worker && docker compose ... up -d web worker`.
- Roll back: check out the previous commit/tag and re-run the compose command.
- Inspect logs: `docker compose -f ops/docker/docker-compose.staging.yml logs -f web worker`.

## 5. Data persistence
- MinIO data lives in the `minio-data` named volume (map it to a host path if you need backups).
- Application state (Postgres/RabbitMQ) remains in the managed services you connect to.

This staging flow keeps MinIO + judge behavior consistent with production without running heavy databases locally.
