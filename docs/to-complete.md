# OpenSolve — Build Steps (from zero → launch)

## 1) Authentication & Accounts (Do this first)

**Goals:** Secure sign-in, stable sessions, org/team support ready for later.

- **Providers:** Email+password, magic link, GitHub, Google.
- **Sessions:** HttpOnly cookies, rolling session, short access + long refresh.
- **2FA (Phase 1.5):** TOTP with recovery codes.
- **User profiles:** name, handle (unique), avatar, country/timezone, bio.
- **Account management:** change email, change password, revoke sessions, delete account (GDPR-style).
- **Rate-limits:** login, signup, password reset.
- **RBAC (initial):** `user`, `problem_curator`, `admin`.
- **Audit log (minimal):** auth events (login, provider link/unlink).
  **DoD:** All flows tested on mobile/desktop; lockout & recovery clear; sessions survive refresh; basic admin can ban user.

---

## 2) Core Data Model (Domain)

**Goals:** Stable schema before UI work explodes.

- **Entities:** User, Problem, ProblemVersion, Tag, Difficulty, Company (optional), TestCase (hidden/public), Submission, Language, Verdict, Contest, ContestProblem, Discussion, Vote, Badge, LeaderboardSnapshot.
- **IDs:** Stable, non-guessable (ULID/UUID).
- **Timestamps &amp; ownership:** createdBy, updatedBy everywhere.
- **Soft delete:** most content; hard delete for PII.
  **DoD:** Prisma schema reviewed; migrations run; seed minimal data (users, tags, a few problems).

---

## 3) API & Data-Fetching Contract

# Delta: React Query (tRPC-powered)

**Keep:** tRPC procedures, in-house auth, router topology, cursor pagination, error model, no NextAuth.

**Change:**

- **Client cache layer:** Use **@tanstack/react-query** as the single source of truth.
- **Keys:** Follow a strict, namespaced key convention (see 3.6).
- **Invalidation:** Use query **invalidation by key** + optional tag map (3.7).
- **Optimistic updates:** Drive via `onMutate/onError/onSettled` (conceptually; no code here).
- **Prefetch + SSR/ISR:** Preload queries server-side and **hydrate** on the client (3.8).
- **Polling:** Use React Query refetch intervals for judge status, not manual timers.
- **Devtools:** Enable React Query Devtools in non-prod for onboarding/debug.

---

## 3) tRPC Router & Data-Fetching Contract (React Query edition)

**Goals:** Stable tRPC procedure surface; React Query manages caching, prefetch, optimistic updates, and invalidation. Transport remains tRPC HTTP/Batch link. No NextAuth—auth is in-house and enforced in tRPC middleware.

The **router topology (3.1)** , **I/O contracts (3.2)** , **Auth/RBAC (3.3)** , **Pagination (3.4)** , **Errors (3.5)** , **Observability (3.10)** , and **DoD (3.11)** remain exactly as previously defined.

Only the client consumption layer changes, detailed below.

---

## 3.6 React Query Strategy over tRPC (keying, lifetimes, fetch policy)

**Key convention (must be consistent across app):**

- Base key: `['trpc', '<namespace.procedure>']`
- With input: `['trpc', '<namespace.procedure>', stableHash(input)]`
- Infinite lists: `['trpc', '<namespace.procedure>', stableHash(filters), 'infinite']`

**Default lifetimes (tune per data class):**

- **User/session data** (auth.getSession, submissions.listMine):
  `staleTime: 0–10s`, `refetchOnWindowFocus: true`, `refetchOnReconnect: true`
- **Public content** (problems.getBySlug, problems.list, tags.list):
  `staleTime: 60–300s` (edge/ISR backed), `refetchOnWindowFocus: false`
- **Leaderboards**: `staleTime: 30–60s`, optional `refetchInterval: 15–30s` during contest windows
- **Judge status polling**: `refetchInterval: 1–2s` until terminal verdict, then stop

**Mutations (principles):**

- Always define the **post-mutation invalidation targets** (see 3.7).
- Use **optimistic updates** sparingly: submissions.create (add pending), discussions.vote (adjust count), discussions.create (prepend).
- On auth mutations (sign-in/out, password reset), **clear** or **refetch** all user-scoped keys.

**Retry &amp; backoff:**

- Reads: light retries with jitter (e.g., 2 attempts) to smooth transient errors.
- Writes: **no automatic retries** for non-idempotent mutations (e.g., signUp, createSubmission) — surface clear error states and allow user re-submit.

---

## 3.7 Invalidation Model (by key + optional tag map)

**Minimal approach (required):**

- After **curation publish**: invalidate `['trpc','problems.list']`, `['trpc','problems.getBySlug', slug]`, `['trpc','tags.list']`.
- After **submissions.create**: invalidate `['trpc','submissions.listMine']` and start **status polling** on `['trpc','submissions.get', id]`.
- After **account.updateProfile**: invalidate `['trpc','account.getProfile']` and public `['trpc','profile.getByHandle', handle]`.
- After **role changes / bans (admin)** : invalidate affected user’s `['trpc','auth.getSession']` and any user-scoped lists.

**Optional tag map (nice to have):**

- Maintain a small in-app map `{ tag: string -> array of keys }`.
  Example: publishing a problem emits tags `['problems', 'tags']`; a single helper expands to exact keys to invalidate.
  This keeps invalidation **declarative** and prevents key drift as filters evolve.

---

## 3.8 Prefetch, SSR/ISR & Hydration (SEO-safe)

**Public pages (SEO):**

- Preload `problems.getBySlug`, `problems.list`, `tags.list` **server-side** during SSG/ISR to render HTML with data.
- Embed the dehydrated React Query state and **hydrate** on the client to avoid double-fetch.

**Authed pages (dashboards):**

- Preload `auth.getSession` and **critical above-the-fold** queries server-side when cookies are present; hydrate client.
- For privacy, **only** preload data the current user is authorized to see.

**Revalidation policy:**

- Public content uses ISR/edge caching (outside React Query), but the client still has `staleTime` to avoid flicker.
- When curators publish, your server emits an event → triggers ISR revalidate + client key invalidations per 3.7.

---

## 3.9 Infinite & Cursor Pagination (React Query’s infinite pattern)

**Lists to use infinite mode:**

- `problems.list`, `submissions.listMine`, `discussions.list`, `leaderboard.global` (optional)

**Rules:**

- Keep the **opaque cursor** in each page’s payload; React Query’s next/prev page params are derived from server cursors.
- Sorting is stable and documented (see 3.4).
- **Merging strategy**: append-only for forward pagination; on filter change, **reset** cache for that key.

**DoD:** Scrolling never duplicates items; cursor mismatches return a clean “refresh list” UX (graceful reset).

---

## 3.12 Error Surfaces & UX with React Query (unchanged server model, better client handling)

- Map tRPC error codes to **typed UI states**:
  - `UNAUTHORIZED` → gate with sign-in prompt
  - `FORBIDDEN` → “You don’t have access to this action”
  - `RATE_LIMITED` → “Too many attempts—try again in N minutes”
  - `VALIDATION_ERROR` → field-level messages
  - `CONFLICT/NOT_FOUND` → toast + return path

- Use **error boundaries** on high-traffic pages (problem details, editor) with a single retry action.
- Surface **correlation id** in a tiny “More info” expander for support (no PII).

---

## 3.13 Dev Ergonomics (React Query specifics)

- **React Query Devtools** in non-prod for contributors (teaches caching mental model quickly).
- **Key helpers**: centralize key builders (tiny utility that returns the array keys) to avoid typos across the app.
- **Network discipline**: Batch link on; validate that keystroke-heavy UIs (search) **debounce** queries to prevent stampede.
- **Accessibility**: Loading and error states use consistent patterns (skeletons/spinners/alerts) and are keyboard/screen-reader friendly.

---

## 3.14 React Query DoD (acceptance)

- A **one-pager** in `/docs/api/react-query-keys.md` lists every procedure with:
  - Query key shape
  - Default `staleTime`/`gcTime`
  - Invalidation targets after each mutation
  - Whether it’s infinite-enabled

- No duplicate network calls on focus/navigation for public pages.
- Polling stops on terminal judge verdicts.
- Auth mutations flush/refetch relevant keys; no stale user state after sign-in/out.
- Devtools show a **bounded** number of cached queries after typical flows (no unbounded growth).

---

## 4) Problem Library (Reader)

**Goals:** Public, SEO-friendly problem browsing & reading.

- **Pages:** Problem list, Problem details (statement, constraints, examples), Tags/difficulty filters, Search.
- **SEO:** dynamic metadata, sitemaps, OG images (optional).
- **Status chips:** solved/attempted/unseen (per user).
- **Accessibility:** keyboard focus order; semantic headings.
  **DoD:** Can find, filter, and read any problem fast; list loads \<200ms TTFB (cached).

---

## 5) Problem Authoring (Editor) — Staff/Curators

**Goals:** Internal panel to create/manage problems.

- **Features:** Draft → Review → Published workflow, versions (ProblemVersion), markdown+math (KaTeX), constraints, hints, editorial field (hidden).
- **Test cases:** public sample vs hidden exhaustive, constraints validator, input/output pair bulk upload (CSV/JSON).
- **Preview:** run samples locally (no judge queue yet).
- **Permissions:** only `problem_curator`+ can publish.
  **DoD:** A curator can draft → review → publish a problem with tags/difficulty/testcases/version notes.

---

## 6) Submission Flow (Client)

**Goals:** Smooth editor + run/submit UX.

- **Editor:** Codemirror, language dropdown, boilerplate per language, stdin/out preview.
- **Actions:** Run against samples (fast path), Submit to judge (queued).
- **State:** show pending/running/finished; per-test feedback (optional), memory/time used.
- **Persistence:** autosave code drafts per problem+language.
  **DoD:** User can select language, run samples, submit, and see result without reload.

---


## 7) Judge System (Backend Worker + Sandbox)

**Goals:** Deterministic, secure, flexible judging with **Autonomic (automatic)** and **Manual (human)**  
modes.

_Status (OpenSolve): RabbitMQ + Docker worker wired with manual/hybrid modes and a staff console for manual verdicts._
- **Queue:** **RabbitMQ** (durable **quorum queues**), exchanges: `judge.submissions`, `judge.rejudge`, `judge.manual`, DLX: `judge.DLX`.
- **Modes:**
  - **Autonomic Judge** — automated via sandbox runners.
  - **Manual Judge** — routed to staff for review.
- **Isolation:** Docker-per-run; strict CPU/memory/time caps per language; **no network**.
- **Languages (phase 1):** Python, C++, Java, JavaScript/Node.
- **Runners:** unified contract: compile → run → capture stdout/stderr → compare (or checker script).
- **Verdicts:** AC, WA, TLE, MLE, RE, CE, **MANUAL_PENDING**, **MANUAL_ACCEPTED**, **MANUAL_REJECTED**, **MANUAL_PARTIAL**.
- **Retries:** TTL + **DLX** backoff tiers, **idempotency by `submissionId`**.
- **Telemetry:** queue depth/latency, container failures, node health.
    **DoD:** ≥ **1K submissions/hour per node**, reproducible verdicts, no cross-tenant leaks.

---

## 8) Submissions & History

**Goals:** Make progress visible & useful.

- **Views:** My submissions (filter by problem/status/lang/date), submission detail (code, verdicts timeline), re-run disabled, re-submit allowed.
- **Privacy:** code private by default; user can share link (read-only).
- **Diffs:** show attempts vs accepted (optional later).
  **DoD:** Users can audit their path to AC; admins can inspect any submission.

---

## 9) Leaderboards & Profiles

**Goals:** Healthy competition.

- **Profile:** stats (solved by difficulty, streak, languages, first AC time), badges (seed a few), social links optional.
- **Global leaderboards:** weekly/monthly/all-time; also per-tag and per-difficulty.
- **Anti-cheat (minimal):** flag anomaly (sudden mass-AC), manual review queue.
  **DoD:** Leaderboards update automatically; profile loads fast and shows solved distribution.

---

## 10) Discussions & Editorials

**Goals:** Community help without spoiling.

- **Per-problem discussions:** threads, replies, vote up/down, report.
- **Editorials (staff):** published after grace period; link from problem.
- **Spam control:** basic rate limits; shadow-ban in RBAC.
  **DoD:** Users can ask/answer; moderators can remove; editorials render math/code.

---

## 11) Contests

**Goals:** Timed sets with fair scoring.

- **Contest types:** rated/unrated; individual only (teams later).
- **Features:** registration, start timer, problems locked to window, freeze board option, anti-leak measures.
- **Scoring:** ICPC or CF-style; tie-breakers consistent.
- **Results:** standings, per-problem stats, upsolving mode.
  **DoD:** You can host a 1–2 hour contest end-to-end; standings are trustworthy.

---

## 12) Admin Panel

**Goals:** One place to run the site.

- **Areas:** Users (ban/unban, roles), Problems (states, versions), Submissions (inspect, rejudge), Discussions (moderate), Contests (create/manage), System (judge nodes health).
- **Observability:** metrics (queue depth, success/failure rates), logs (structured), config flags (maintenance mode).
  **DoD:** Oncall can diagnose spikes and rejudge safely.

---

## 13) Quality & Security

**Goals:** Ship confidently.

- **Testing:** unit (schema & utils), integration (API), E2E (critical paths: auth, problem read, submit, judge verdict).
- **Validation:** server-side schema validation on inputs; sanitize markdown.
- **Secrets:** centralized management; no secrets in logs.
- **Backups:** daily Postgres backups; restore drill.
- **Compliance:** delete account removes PII; clear privacy policy.
  **DoD:** CI blocks on failing tests; restore drill documented.

---

---

## 14) User Interaction Analytics

**Goals:** Understand real user behavior to improve problem quality and UX.

- **Signals:** page visit, time-on-question, active coding time, “Solve/Run/Submit” clicks, hint/editorial usage, abandon rates.
- **Method:** lightweight, fire-and-forget **beacon requests** sent on interactions and pagehide; no UX impact.
- **Processing:** backend logs events to analytics table; aggregate for problem difficulty, funnel metrics, and UX insights.
- **Privacy:** no code content collected; only minimal event metadata.  
    **DoD:** events reliably captured across navigation/unload; dashboards show per-problem engagement metrics.

---

## 15) Educational Contest Anti-Cheat

**Goals:** Reduce cheating, encourage fair play.

- **Environment tracking:** device type, browser family, viewport, coarse IP hash; detect multi-device or concurrent sessions.
    
- **Focus monitoring:** count tab changes, focus/blur events, out-of-focus duration; configurable warn/flag/DQ thresholds.
    
- **Editor safeguards:** track large paste events, rapid AC patterns, suspicious timing, and language switching spikes.
    
- **Similarity checks:** detect near-identical submissions across contestants; cluster analysis for mass cheating.
    
- **Contest controls:** optional Exam Mode (disable right-click/text-selection), single-device lock, restricted feedback, activity logging.
    
- **Admin tools:** per-user anti-cheat timeline, alerts, flags, cluster review, manual/auto DQ options.  
  **DoD:** Cheating becomes detectable and risky; admins can confidently validate contest integrity.

---

## 16) Performance & Caching

**Goals:** Snappy UX at scale.

- **React query strategy:** sensible cache TTLs; prefetch lists on nav; mutate after submit.
- **Server caching:** problem lists & details edge-cached (tagged revalidation on publish).
- **DB performance:** key indexes (problem slug, tags, difficulty, user/problem composite keys).
  **DoD:** P95 page interactive \<1.5s on mid-tier cloud; DB dashboards clean.

---

## 17) Docs & Developer Experience

**Goals:** Attract contributors.

- **Repo docs:** README (what/why), CONTRIBUTING (setup, scripts, code style), SECURITY, CODE OF CONDUCT, ISSUE/PR templates.
- **Runbook:** judge troubleshooting, rejudge process, incident checklist.
- **Content guidelines:** how to write a good problem; tagging rules; review checklist.
  **DoD:** New dev onboarded in \<30 minutes.

---

## 18) Deployment & Operations

**Goals:** Reproducible environments.

- **Envs:** dev, staging, prod; separate DB & Redis.
- **Containers:** web (Next.js), worker (judge), language runners.
- **CDN:** static assets, images; cache rules for problem pages.
- **CI/CD:** lint, typecheck, tests, build, deploy; migrations gated.
- **Monitoring:** uptime, error tracking, metrics; alerting thresholds set.
  **DoD:** Blue/green or canary deploys; rollbacks documented & tested.

---

## 19) Launch & Growth

**Goals:** Community momentum.

- **Initial content:** 150–300 curated problems (balanced by difficulty).
- **SEO:** sitemaps, meaningful slugs, structured data.
- **Community:** discussions open, starter issues, roadmap board, weekly changelog.
- **Governance:** core maintainers listed; decision process clear.
  **DoD:** Public launch post; first contributor PR merged; weekly release cadence.

---

## Parallelization Notes

- **Track A:** Auth, domain schema, API contracts.
- **Track B:** Problem reader UI + SWR hooks.
- **Track C:** Judge queue + sandbox runners.
- **Track D:** Admin panel + observability.
- **Track E:** Docs, governance, community.

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
