# Step 10 – Telemetry, Analytics & Ops Audit

_Date:_ <!-- keep updated -->  
_Scope:_ Validate the telemetry pipeline, analytics ingestion, CI/CD artifacts, and ops/deployment docs (env handling, runbooks, health checks).

## 1. Method
- Reviewed analytics client + API (`lib/analytics/client.ts`, `app/api/analytics/route.ts`) and supporting schema files.
- Read ops runbooks/docs (e.g., `ops/infra/*.md`, `docs/quality/runbooks.md`) and inspected the Docker Compose specs in `ops/docker`.
- Checked CI workflow artifacts (`.github/workflows/ci-cd.yml`) and the health/metrics plumbing (`lib/health.ts`, `lib/observability/metrics.ts`, `app/api/internal/metrics/route.ts`).

## 2. Issues & Fixes

### 2.1 Dev/staging env instructions don’t match Compose files
- **Where:** `ops/infra/local-setup.md:18-36`, `ops/infra/staging-deployment.md:18-39`, `ops/docker/docker-compose.dev.yml:6-30`, `ops/docker/docker-compose.staging.yml`, `ops/docker/docker-compose.prod.yml`
- **Issue:** The docs tell operators to copy `ops/env/<env>.env` into a host-specific file (e.g., `dev.local.env`, `staging.runtime.env`) and pass it via `--env-file`. However, each Compose file hardcodes `env_file: ../env/<env>.env` for the `web` and `worker` services. Passing `--env-file` only influences variable substitution, not the container env. So any secrets edited in the runtime file are ignored; containers still read the checked-in template values.
- **Fix:** Update the compose specs to honor an override (e.g., respect an `ENV_FILE` variable or point `env_file` to the path supplied via `--env-file`), or change the docs to instruct editing `ops/env/<env>.env` directly so the instructions are accurate.
- **Impact:** Operators think they’re using secure secrets but the stacks boot with the default placeholder values, breaking deployments and leaking demo credentials in real environments.

### 2.2 Analytics ingestion accepts arbitrary payloads (PII/code risk)
- **Where:** `lib/analytics/client.ts`, `app/api/analytics/route.ts:12-70`
- **Issue:** The spec requires “No user code or PII ever included,” but the analytics endpoint simply parses arbitrary JSON via `z.record(z.any())` and stores it verbatim (`payload` column). There is no server-side allowlist or size check per event. A malicious user (or a bug) could send submission source code, email addresses, etc., and they’d be permanently stored in `AnalyticsEvent.payload`.
- **Fix:** Implement per-event schema validation (or at least an allowlist of permitted fields) on the server, reject oversized payloads, and strip/deny unexpected keys. Also document the policy so client changes don’t regress privacy guarantees.
- **Impact:** Analytics DB can accumulate sensitive data, violating the beacon-mode privacy requirement and complicating compliance/legal obligations.

### 2.3 Analytics beacons write to the session table on every event
- **Where:** `app/api/analytics/route.ts:41-63`, `lib/auth/session.ts:88-121`
- **Issue:** The analytics API calls `getSession()` for every request “just” to attach a user id. `getSession` always updates `Session.lastUsedAt`, so each beacon (and there are many per page) triggers a Prisma write in the auth database. This creates unnecessary write-amplification, bloats replication/WAL logs, and can lock tables under high traffic.
- **Fix:** Avoid calling `getSession` inside analytics ingestion. Instead, read the signed session token manually (without updating lastUsedAt) or let the client pass a hashed user identifier. Reserve the session write for actual user interactions (auth, submissions, etc.).
- **Impact:** High-volume analytics can saturate the auth DB, delaying genuine requests and causing unnecessary database contention.

## 3. Remaining Work
- After fixing the above, re-test local/staging compose stacks with custom env files to confirm secrets actually flow.
- Add tests/validation for analytics payload schemas and size limits.
- Rerun the telemetry audit once the session-write fix is deployed to ensure beacons stay read-only.

_Reporter:_ Codex QA agent.
