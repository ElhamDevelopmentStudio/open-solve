## 18) Deployment & Operations

**Goals:** Reproducible, safe, and boringly reliable environments.

OpenSolve should run the same way everywhere: **dev → staging → prod**, with controlled changes, easy rollbacks, and good visibility when things go wrong.

---

### 18.1 Environments & Parity

**Environments:**

- **Local/dev**
  - Developer machines.
  - Uses dev DB, dev RabbitMQ, dev object storage.
  - Debugging features on; email + analytics typically redirected to dev sinks.

- **Staging**
  - Mirrors production topology as closely as possible.
  - Same container images, same configuration shape (but different secrets).
  - Used for:
    - Pre-release validation.
    - Running heavy E2E tests.
    - Trying new infra changes.

- **Production**
  - User-facing environment.
  - Strictly controlled deploys, monitored closely.
  - No direct DB edits; all schema changes via migrations.

**Rules:**

- Each env has **separate DB**, **separate RabbitMQ**, **separate object storage**, and (optional) **separate Redis** if you use it for caching/rate-limits.
- Config drift between envs should be limited to:
  - Secrets
  - URLs
  - Resource sizes (e.g., smaller DB in staging)

- Same Docker images run in staging and prod; only config differs.

**DoD:**

- Bugs reproducible across envs.
- No “works locally but not in prod” due to hidden config differences.

---

### 18.2 Containers & Services

**Services (at minimum):**

- **Web app**
  - Next.js (App Router), tRPC, React Query.
  - Serves SSR pages + static assets (or static offloaded to CDN).

- **Judge worker(s)**
  - Stateless consumers of RabbitMQ queues.
  - Responsible for running submissions in containers and writing results.

- **Language runner images**
  - Docker images per language (C++, Python, Java, Node…) used by judge worker.

- **Analytics ingestion**
  - Lightweight service/route that accepts beacon events and dumps into analytics store.

- **Admin tooling** (can be part of web app or a separate route).

**Container principles:**

- Web and workers are separate containers; scale independently.
- Language runners are **not long-running services** but container images pulled/executed on demand.
- All containers are:
  - Immutable (built once, deployed many).
  - Versioned (tagged by commit hash or version).
  - Configured via env vars (no baked-in secrets).

---

### 18.3 Networking, DNS & CDN

**Domains & DNS:**

- `app-domain` (e.g., `opensolve.example`) → web app (through reverse proxy / load balancer).
- `api-domain` (optional) → same or separate app for API.
- `cdn-domain` (e.g., `static.opensolve.example`) → CDN for static assets.

**Reverse proxy / LB:**

- Terminate TLS (HTTPS).
- Forward requests to web containers.
- Apply basic rate-limits and request size caps.

**CDN responsibilities:**

- Cache:
  - Static JS/CSS bundles.
  - Fonts, images.
  - Public problem pages (via SSR/ISR + cache hints).

- Use cache-control headers with:
  - immutable for static assets.
  - short-lived or tagged invalidation for dynamic but cacheable pages.

**DoD:**

- Problem list/detail pages served from edge most of the time.
- Static bundles rarely hit origin.
- No mixed HTTP/HTTPS warnings.

---

### 18.4 Configuration & Secrets

**Configuration:**

- All config values come from:
  - Environment variables.
  - Secret store (Vault / SSM / Doppler / etc.).

- No environment-specific conditionals hardcoded in app logic beyond “env name” checks.

**Secrets:**

- Database URLs.
- RabbitMQ credentials.
- Email provider API keys (Resend).
- JWT/cookie secrets.
- Encryption keys.

**Secrets rules:**

- Never in Git.
- Rotatable without full rebuild.
- Scoped per-env.

**DoD:**

- `ENV` files never committed.
- Clear doc on which secrets are required for each service.

---

### 18.5 CI/CD Pipeline

**Stages:**

1.  **Lint & Typecheck**
    - ESLint, TypeScript.

2.  **Unit & Integration Tests**
    - zod schema tests.
    - tRPC router tests.

3.  **E2E Tests**
    - Core flows: auth, problem solving, submissions, contests.

4.  **Build**
    - Web app build, worker build, language runner images.

5.  **Security Checks**
    - Dependency vulnerability scanning.
    - Docker image scanning (where feasible).

6.  **Migrations Check**
    - Ensure DB migrations apply cleanly on staging schema.

7.  **Deploy**
    - Push images to registry.
    - Update staging first, then prod (see rollout below).

**Gatekeeping:**

- Any failure in lint/tests/build/security/migrations → **no deploy**.
- Deploy requires:
  - All tests green.
  - Manual approval for prod (recommended).

**DoD:**

- No manual “ssh & deploy” in normal workflow.
- Single pipeline defines how code goes from Git commit → prod.

---

### 18.6 Database & Migrations

**Migrations:**

- Managed by a single tool (e.g., Prisma migrations).
- Always versioned and committed.
- Run in CI (dry-run) and automatically at deploy time (staging → prod).

**Rules:**

- Back up DB before destructive migrations.
- Use zero-downtime patterns:
  - Add new columns, backfill, then switch, then drop.
  - Avoid `ALTER TABLE` locks during peak.

**DoD:**

- No out-of-band schema changes.
- Migrations can be rolled forward/backward if needed.
- DB state consistent with app expectations.

---

### 18.7 Scaling & Resilience

**Horizontal scaling:**

- Web:
  - Scale by CPU/latency thresholds.

- Worker:
  - Scale by queue depth/processing time.

**Vertical considerations:**

- Judge nodes may need more CPU/memory than web nodes.
- DB sized for expected writes from contest peaks.

**Resilience:**

- Health checks for:
  - web readiness/liveness.
  - worker readiness.

- Auto-restart failed containers.
- Rate-limits and back-pressure:
  - If judge queues grow too large, throttle submissions.

**DoD:**

- System can handle contest spikes without falling over.
- Clear autoscaling triggers and safe upper bounds.

---

### 18.8 Monitoring, Logging & Alerting

**Monitoring:**

- Uptime checks:
  - Home page.
  - Login.
  - Problem list.

- Metrics:
  - Request rate, latency per route (p50/p95/p99).
  - DB query latency + slow query counts.
  - RabbitMQ queue depth, consumer lag.
  - Worker success/failure rates.
  - Error rate per tRPC router.

**Logging:**

- Structured logs (JSON) for:
  - Errors.
  - Judge jobs.
  - Admin actions.

- Logs shipped to central log system (ELK/Loki/etc.).

**Alerting:**

- Alerts for:
  - High error rates.
  - SLO breaches (latency, uptime).
  - Judge queue backlog.
  - DB under stress (connections, locks).
  - SSL cert expiring.

**DoD:**

- Oncall can see current state at a glance.
- Alerts are actionable and not noisy.

---

### 18.9 Rollouts, Blue/Green & Rollbacks

**Rollout strategies:**

- **Staging first**:
  - Every change goes to staging.
  - Minimal manual smoke tests, E2E tests green.

- **Prod rollout:**
  - **Canary**:
    - Release to small % of traffic or one AZ/node.
    - Watch metrics.

  - OR **Blue/Green**:
    - Bring up new version (Blue) alongside current (Green).
    - Switch traffic when satisfied; keep Green for quick rollback.

**Rollback:**

- Requirements:
  - Deploy system must be able to roll back to previous image/version quickly.
  - DB migrations:
    - Prefer non-breaking migrations (forward-only).
    - For breaking changes, have a rollback path (or require manual signoff).

**Documentation:**

- Runbook:
  - “If deploy breaks X, do Y and roll back to build Z.”

- Verified:
  - Rollback tested at least once per quarter.

**DoD:**

- Rollback path is documented and tested.
- No “oh God, how do we undo this?” on production issues.

---

### 18.10 Maintenance & Operations Runbooks

**Periodic tasks:**

- Dependency updates and runtime patching.
- Database index review & cleanup.
- Judge runner image updates (language versions).
- Backups and restore drills.
- Analytics store compaction/rotation.

**Runbooks:**

- “Judge is stuck” → steps to drain / restart / requeue.
- “DB is slow” → steps to identify queries, apply mitigations.
- “RabbitMQ is overloaded” → steps to scale workers, apply rate-limits.
- “Incident SEV1/2” → escalation path, status page update, postmortem process.

**DoD:**

- Ops knowledge is written down, not trapped in someone’s head.
- Oncall can respond consistently, even if they didn’t build the feature.

---

### 18.11 Final DoD (Deployment & Ops)

- Dev, staging, prod environment definitions are clear and reproducible.
- Web, worker, runner containers are built and deployed via CI/CD.
- CDN in front of static + suitable caching for problem pages.
- DB and queues sized and indexed, with safe migrations.
- Monitoring, logs, and alerts wired and visible in Admin/System panels.
- Blue/green or canary deploys used for prod, with tested rollback.
- Runbooks exist for judge, DB, queue, and incident response.
