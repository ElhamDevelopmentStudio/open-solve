# Step 01 – Baseline Inventory & Repository Map

_Date:_ <!-- TODO: keep updated -->  
_Scope:_ Establish current-state understanding of OpenSolve’s codebase before deeper audits.

## 1. Method & Sources

- Walked the root tree (`README.md`, `package.json`, `tsconfig.json`, `app/`, `components/`, `workers/`, `ops/`, `docs/`).
- Skimmed primary reference docs (`docs/to-complete.md`, `docs/quality/runbooks.md`, `ops/infra/*.md`) to align with the SRS.
- Reviewed runtime configuration (`lib/env.ts`, `ops/env/staging.env`) and deployment assets (`ops/docker/docker-compose.staging.yml`, `.github/workflows/ci-cd.yml`).
- Sampled key layouts to understand navigation plumbing (`app/(platform)/layout.tsx`, `app/admin/layout.tsx`, `app/staff/layout.tsx`, `components/layout/sidebar-shell.tsx`, `config/navigation.ts`, `components/layout/nav-icons.tsx`).

## 2. Repository Topology & Feature Surfaces

- **App Router Segments:**
  - Public/reader experiences reside in `app/(reader)` (`problems`, `tags`, `leaderboards`, discuss forums, etc.).
  - Auth flows live inside `app/(auth)`; marketing/landing pages under `app/(marketing)`.
  - The primary authed workspace is `app/(platform)` (dashboard, problems, submissions, contests, proposals, teams, settings).
  - Dedicated spaces exist for `app/admin` (god mode) and `app/staff` (problem/contest curation + judge oversight).
  - Additional shared utilities live under `app/share`, `app/api`, and feature-specific routes like `app/global-error.tsx`.
- **Component System:** `components/` houses shared layout primitives (e.g., `layout/sidebar-shell.tsx`), UI kits (`components/ui/*` from shadcn), data displays, and table abstractions. Icon resolution already funnels through `hugeicons-react` (`components/layout/nav-icons.tsx`).
- **Domain Logic:**
  - `lib/` includes environment parsing, auth/session helpers, permissions, analytics, and third-party integrations.
  - `hooks/`, `stores/`, and `types/` supply client-side state, TanStack hooks, and shared TS models.
  - Submission workers live under `workers/` (judge, queue consumers).
  - Prisma schema + migrations in `prisma/`; instrumentation split between `instrumentation.ts` and `instrumentation.client.ts`.
- **Documentation & Ops:**
  - `docs/` includes build-phase trackers (`phase18.md`), completion checklists, QA runbooks, and quality playbooks.
  - `ops/infra` captures environment guides, rollout notes, and deployment procedures; `ops/docker` + `ops/env` keep compose bundles and env templates.
  - CI/CD is GitHub Actions-led (`.github/workflows/ci-cd.yml`) with lint/type/test → Playwright → Docker push → staging release.

## 3. Navigation & Reachability Snapshot

- Workspace sidebar (`app/(platform)/layout.tsx` + `config/navigation.ts`) exposes Dashboard, Problems, Submissions, Leaderboards, Proposals, Contests, and (flagged “soon”) Teams.
- Sidebar shell handles breadcrumbed topbar, theme toggle, and user menu; staff/admin quick-links live in the footer (links to `/staff/contests` and `/admin`).
- Admin shell (`app/admin/layout.tsx`) defines control-plane areas: Overview, Analytics, Users & Roles, Problems, Submissions/Judge, Discussions & Trails, Contests, System & Flags, Audit & Incidents.
- Staff shell provides entry points for contest staffing, judge workflows, and proposals (mirrors `/staff` subroutes).
- Public reader shell (in `app/(reader)/layout.tsx`) governs SEO-friendly experiences (problem reader, leaderboards, tagging) but currently lacks explicit links from the authed workspace (gap to revisit in later steps).

## 4. Configuration, Environments & Delivery

- Runtime env contract enforced via `lib/env.ts` using `@t3-oss/env-nextjs`; covers Postgres URLs, session secret, deploy env flagging, MinIO, RabbitMQ, judge sandbox driver, telemetry tokens, etc. Defaults align with self-host and CI.
- Staging template (`ops/env/staging.env`) mirrors production topology with explicit placeholders for secrets, staging hostnames, and RabbitMQ TLS endpoints.
- Docker Compose bundle (`ops/docker/docker-compose.staging.yml`) wires web + judge-worker + MinIO (+ bootstrap helper), ready for registries via CI artifact.
- CI workflow performs lint, typecheck, Vitest, Prisma generate; Playwright smoke; multi-arch Docker builds; staging artifacts + tag retagging. No Kubernetes references found—deployment remains Docker-only.

## 5. Immediate Follow-Ups / Open Questions

- Verify every reader/admin/staff route is reachable via visible UI entry points (no manual URL dependency) once we move into Step 2.
- Audit RBAC for role leakage (e.g., ensure `/staff/*` vs `/admin/*` gating matches SRS).
- Confirm TanStack Query adoption is consistent (various hooks exist, but usage per page to be validated later).
- Ensure upcoming requirements (Trails tab on problems, Anti-Cheat dashboard, telemetry beacons) have both backend and surfaced navigation.
- Need a canonical map of “hidden” marketing/public routes vs workspace to reduce future duplication; add to documentation when discovered.

---

_Next Action:_ Proceed to **Step 02 – Global Shell & Navigation audit** (ensure reachability + layout compliance).  
_Reporter:_ Codex QA agent.
