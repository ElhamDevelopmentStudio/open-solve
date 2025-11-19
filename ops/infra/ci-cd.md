# CI/CD Pipeline

Workflow: `.github/workflows/ci-cd.yml`

## Stages

1. **quality** — installs deps, runs Prisma generate, ESLint, TypeScript, Vitest, and `next build` against a disposable Postgres service.
2. **e2e** — rebuilds, installs Playwright, runs `npm run start` and executes smoke specs.
3. **docker-images** — Buildx pushes `opensolve-web` and `opensolve-judge-worker` images to GHCR tagged with the commit SHA.
4. **deploy-staging** — retags images as `:staging` and uploads the Docker compose + env template + staging doc artifact.
5. **deploy-production** — retags images as `:latest`, publishes prod compose/env/Fly bundle for manual/automated rollout.

## Secrets & Permissions

- Uses `GITHUB_TOKEN` for GHCR pushes.
- Additional secrets (e.g., Fly API token) can be injected via environment protection rules.
- Artifacts contain no live secrets—only templates from `ops/env`.

## Manual Promotion

- Download the artifact (staging or production) and apply using `docker compose` or `flyctl` as documented in `ops/infra/*.md`.
- GitHub environment approvals gate staging/prod jobs; configure reviewers under repository settings.
