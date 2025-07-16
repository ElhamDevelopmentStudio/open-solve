# OpenSolve — Build Steps (from zero → launch)

## 1) Authentication & Accounts (Do this first)

**Goals:**  Secure sign-in, stable sessions, org/team support ready for later.

- **Providers:**  Email+password, magic link, GitHub, Google.
- **Sessions:**  HttpOnly cookies, rolling session, short access + long refresh.
- **2FA (Phase 1.5):**  TOTP with recovery codes.
- **User profiles:**  name, handle (unique), avatar, country/timezone, bio.
- **Account management:**  change email, change password, revoke sessions, delete account (GDPR-style).
- **Rate-limits:**  login, signup, password reset.
- **RBAC (initial):**  `user`, `problem_curator`, `admin`.
- **Audit log (minimal):**  auth events (login, provider link/unlink).
  **DoD:**  All flows tested on mobile/desktop; lockout & recovery clear; sessions survive refresh; basic admin can ban user.

---

## 2) Core Data Model (Domain)

**Goals:**  Stable schema before UI work explodes.

- **Entities:**  User, Problem, ProblemVersion, Tag, Difficulty, Company (optional), TestCase (hidden/public), Submission, Language, Verdict, Contest, ContestProblem, Discussion, Vote, Badge, LeaderboardSnapshot.
- **IDs:**  Stable, non-guessable (ULID/UUID).
- **Timestamps &amp; ownership:**  createdBy, updatedBy everywhere.
- **Soft delete:**  most content; hard delete for PII.
  **DoD:**  Prisma schema reviewed; migrations run; seed minimal data (users, tags, a few problems).

---

## 3) API & Data-Fetching Contract

**Goals:**  Define what SWR consumes; stable routes + JSON shapes.

- **REST/Route Handlers:**  `/api/problems`, `/api/submissions`, `/api/tags`, `/api/contests`, `/api/profile`, `/api/judge/submit`, etc.
- **Pagination &amp; filters:**  cursor-based; tag, difficulty, status (solved/attempted).
- **Errors:**  structured error envelope; human-readable + machine codes.
- **Caching strategy:**  SWR keys, revalidation on focus/reconnect, optimistic updates only where safe (e.g., discussions).
  **DoD:**  API spec doc exists; SWR usage patterns decided (stale-while-revalidate + mutate patterns).

---

## 4) Problem Library (Reader)

**Goals:**  Public, SEO-friendly problem browsing & reading.

- **Pages:**  Problem list, Problem details (statement, constraints, examples), Tags/difficulty filters, Search.
- **SEO:**  dynamic metadata, sitemaps, OG images (optional).
- **Status chips:**  solved/attempted/unseen (per user).
- **Accessibility:**  keyboard focus order; semantic headings.
  **DoD:**  Can find, filter, and read any problem fast; list loads \<200ms TTFB (cached).

---

## 5) Problem Authoring (Editor) — Staff/Curators

**Goals:**  Internal panel to create/manage problems.

- **Features:**  Draft → Review → Published workflow, versions (ProblemVersion), markdown+math (KaTeX), constraints, hints, editorial field (hidden).
- **Test cases:**  public sample vs hidden exhaustive, constraints validator, input/output pair bulk upload (CSV/JSON).
- **Preview:**  run samples locally (no judge queue yet).
- **Permissions:**  only `problem_curator`+ can publish.
  **DoD:**  A curator can draft → review → publish a problem with tags/difficulty/testcases/version notes.

---

## 6) Submission Flow (Client)

**Goals:**  Smooth editor + run/submit UX.

- **Editor:**  Monaco, language dropdown, boilerplate per language, stdin/out preview.
- **Actions:**  Run against samples (fast path), Submit to judge (queued).
- **State:**  show pending/running/finished; per-test feedback (optional), memory/time used.
- **Persistence:**  autosave code drafts per problem+language.
  **DoD:**  User can select language, run samples, submit, and see result without reload.

---

## 7) Judge System (Backend Worker + Sandbox)

**Goals:**  Deterministic, secure, language-agnostic judging.

- **Queue:**  Redis + BullMQ (or equivalent): `submissions` queue.
- **Isolation:**  Docker per run; CPU/memory/time limits per language.
- **Languages (phase 1):**  Python, C++, Java, JavaScript/Node.
- **Runners:**  standardized contract (compile, run, capture stdout/stderr, exit code).
- **Verdicts:**  AC, WA, TLE, MLE, RE, CE; per-test results stored.
- **Security:**  no network, no filesystem write outside sandbox; timeouts enforced.
- **Telemetry:**  run duration, queue latency, container failures.
  **DoD:**  1K submissions/hour stable on a single node; no cross-tenant leaks; reproducible verdicts.

---

## 8) Submissions & History

**Goals:**  Make progress visible & useful.

- **Views:**  My submissions (filter by problem/status/lang/date), submission detail (code, verdicts timeline), re-run disabled, re-submit allowed.
- **Privacy:**  code private by default; user can share link (read-only).
- **Diffs:**  show attempts vs accepted (optional later).
  **DoD:**  Users can audit their path to AC; admins can inspect any submission.

---

## 9) Leaderboards & Profiles

**Goals:**  Healthy competition.

- **Profile:**  stats (solved by difficulty, streak, languages, first AC time), badges (seed a few), social links optional.
- **Global leaderboards:**  weekly/monthly/all-time; also per-tag and per-difficulty.
- **Anti-cheat (minimal):**  flag anomaly (sudden mass-AC), manual review queue.
  **DoD:**  Leaderboards update automatically; profile loads fast and shows solved distribution.

---

## 10) Discussions & Editorials

**Goals:**  Community help without spoiling.

- **Per-problem discussions:**  threads, replies, vote up/down, report.
- **Editorials (staff):**  published after grace period; link from problem.
- **Spam control:**  basic rate limits; shadow-ban in RBAC.
  **DoD:**  Users can ask/answer; moderators can remove; editorials render math/code.

---

## 11) Contests (Phase 2)

**Goals:**  Timed sets with fair scoring.

- **Contest types:**  rated/unrated; individual only (teams later).
- **Features:**  registration, start timer, problems locked to window, freeze board option, anti-leak measures.
- **Scoring:**  ICPC or CF-style; tie-breakers consistent.
- **Results:**  standings, per-problem stats, upsolving mode.
  **DoD:**  You can host a 1–2 hour contest end-to-end; standings are trustworthy.

---

## 12) Admin Panel

**Goals:**  One place to run the site.

- **Areas:**  Users (ban/unban, roles), Problems (states, versions), Submissions (inspect, rejudge), Discussions (moderate), Contests (create/manage), System (judge nodes health).
- **Observability:**  metrics (queue depth, success/failure rates), logs (structured), config flags (maintenance mode).
  **DoD:**  Oncall can diagnose spikes and rejudge safely.

---

## 13) Quality & Security

**Goals:**  Ship confidently.

- **Testing:**  unit (schema & utils), integration (API), E2E (critical paths: auth, problem read, submit, judge verdict).
- **Validation:**  server-side schema validation on inputs; sanitize markdown.
- **Secrets:**  centralized management; no secrets in logs.
- **Backups:**  daily Postgres backups; restore drill.
- **Compliance:**  delete account removes PII; clear privacy policy.
  **DoD:**  CI blocks on failing tests; restore drill documented.

---

## 14) Performance & Caching

**Goals:**  Snappy UX at scale.

- **SWR strategy:**  sensible cache TTLs; prefetch lists on nav; mutate after submit.
- **Server caching:**  problem lists & details edge-cached (tagged revalidation on publish).
- **DB performance:**  key indexes (problem slug, tags, difficulty, user/problem composite keys).
  **DoD:**  P95 page interactive \<1.5s on mid-tier cloud; DB dashboards clean.

---

## 15) Docs & Developer Experience

**Goals:**  Attract contributors.

- **Repo docs:**  README (what/why), CONTRIBUTING (setup, scripts, code style), SECURITY, CODE OF CONDUCT, ISSUE/PR templates.
- **Runbook:**  judge troubleshooting, rejudge process, incident checklist.
- **Content guidelines:**  how to write a good problem; tagging rules; review checklist.
  **DoD:**  New dev onboarded in \<30 minutes.

---

## 16) Deployment & Operations

**Goals:**  Reproducible environments.

- **Envs:**  dev, staging, prod; separate DB & Redis.
- **Containers:**  web (Next.js), worker (judge), language runners.
- **CDN:**  static assets, images; cache rules for problem pages.
- **CI/CD:**  lint, typecheck, tests, build, deploy; migrations gated.
- **Monitoring:**  uptime, error tracking, metrics; alerting thresholds set.
  **DoD:**  Blue/green or canary deploys; rollbacks documented & tested.

---

## 17) Launch & Growth

**Goals:**  Community momentum.

- **Initial content:**  150–300 curated problems (balanced by difficulty).
- **SEO:**  sitemaps, meaningful slugs, structured data.
- **Community:**  discussions open, starter issues, roadmap board, weekly changelog.
- **Governance:**  core maintainers listed; decision process clear.
  **DoD:**  Public launch post; first contributor PR merged; weekly release cadence.

---

## Parallelization Notes

- **Track A:**  Auth, domain schema, API contracts.
- **Track B:**  Problem reader UI + SWR hooks.
- **Track C:**  Judge queue + sandbox runners.
- **Track D:**  Admin panel + observability.
- **Track E:**  Docs, governance, community.

---

## Cut-Line for v1 (“MVP you can love”)

1. Auth & RBAC
2. Problem library (browse/read/search/filter)
3. Submission flow + judge (4 languages)
4. Submissions history
5. Basic profiles & global leaderboard
6. Curator editor (publish problems)
7. Minimal admin panel

Everything else (contests, badges, editorial polish) can follow as v1.x.