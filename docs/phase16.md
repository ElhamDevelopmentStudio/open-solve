## 14) Performance & Caching

**Goals:** Snappy UX at scale, with predictable navigation behavior.

- Fast page loads (esp. problems & submissions).
- Smooth navigation (no weird back-button loops).
- Efficient server & DB usage.
- Clear cache + invalidation rules for devs.

---

### 14.1 React Query Strategy

**Objectives:**

- Avoid over-fetching.
- Make navigation feel instant.
- Keep state consistent across filters, pages, and back/forward.

**Key points:**

- **Query key convention:**
  - `['trpc', 'problems.list', { difficulty, tags, page }]`
  - `['trpc', 'problems.get', { problemId }]`
  - `['trpc', 'submissions.listMine', { filters }]`

- **Sensible `staleTime`:**
  - Public & semi-static data (problems list/details, tags): `staleTime = 60–300s`.
  - User/session data (profile, my submissions): `staleTime = 0–10s`.
  - Judge status polling queries: `staleTime = 0`, with `refetchInterval` until terminal.

- **`cacheTime`:**
  - Long enough (e.g., 5–10 min) so back/forward and tab switching can reuse cached data without refetching.

- **Prefetch on navigation:**
  - When hovering a problem in `/problems`, prefetch `problems.get`.
  - When opening a contest, prefetch its problem list.

- **Mutations:**
  - After `submissions.create` → invalidate `submissions.listMine` and start polling `submissions.get`.
  - After problem publish → invalidate `problems.list`, `problems.get`, `tags.list`.
  - After profile changes → invalidate `profile.getByHandle`, `account.getProfile`.

**DoD (React Query):**

- No duplicate refetches on simple navigation.
- Back/forward reuses cached data instantly where possible.
- All query keys are predictable and documented.

---

### 14.2 Navigation, Search Params & Back Button Behavior

**Your current issue:**  
You’re forcing a redirect from `/problems` → `/problems?difficulty=easy`. So:

1.  Browser history: `/problems` → `/problems?difficulty=easy`
2.  User hits back:
    - Goes to `/problems` → you redirect again → `/problems?difficulty=easy`

3.  Back button gets stuck in a loop.

This is _super_ common in SPAs that try to enforce defaults via redirects.

#### 14.2.1 Design Rules for Filters & Search Params

1.  **No redirect loops to “default” filter states.**
    - Treat `/problems` as logically equivalent to `/problems?difficulty=easy` (or your chosen default) on the **server + client**, **but do not redirect**.
    - If there is no query param, **infer default in code** instead of forcing one into the URL with a redirect.

2.  **Only push to history when the user actually changes filters.**
    - On initial load, do **not** `router.push` or redirect just to add params.
    - When the user selects `difficulty=medium`, then we:
      - Update local filter state.
      - `router.push` or `router.replace` with `?difficulty=medium`.

3.  **Back/forward should reconstruct filters from URL, not from global state.**
    - URL search params are the **source of truth** for filters and pagination.
    - On route change, read `searchParams` and hydrate the React Query query + UI filters from them.

4.  **Use `router.replace` for applying default filters on first render (if absolutely needed).**
    - If you must normalize URLs, do it **client-side** using `replace`, not a redirect from `/problems` to `?difficulty=easy`.
    - This way, you don’t add an extra history entry, so back button works.

#### 14.2.2 Implementation guidelines (behavioral, not code)

- **For list pages with filters (e.g., `/problems`, `/submissions`, `/leaderboards`):**
  - Do _not_ redirect on missing params.
  - Interpret “no param” as “default filter”.
  - Only update URL when the user interacts:
    - Filter dropdown changes.
    - Sort changes.
    - Page changes.

- **For tabbed pages (e.g., `?tab=discuss`):**
  - Same rules: default tab inferred, don’t auto-redirect to `?tab=description`.
  - User changes tab → update query string, so back/forward works like a real browser tab stack.

- **For all existing pages already doing `/route` → `/route?default=foo` redirects:**
  - Refactor to **stop** redirecting.
  - Keep the default behavior purely in React:
    - “If `difficulty` query is missing, show ‘Easy’ filter as selected in UI, but don’t rewrite URL.”

**DoD (Navigation & history):**

- Back button always moves to the previous _visual_ state (different filters/tabs/pages).
- No more infinite back/redirect loops.
- All filter URLs are deep-linkable and shareable.

---

### 14.3 Server Caching (Edge & ISR)

**Objectives:**

- Offload hot read paths (problem lists, problem details, tags).
- Keep problem data fresh enough when curated/published/edited.

**Strategy:**

- **Public pages**:
  - `/problems`
  - `/problems/[slug]`
  - `/tags/[slug]`
  - `/leaderboards` (global)

- Use **Edge caching + ISR** (Incremental Static Regeneration) or Next.js Route Handlers with caching hints:
  - `revalidate` interval (e.g., 60s or 300s).
  - Tag-based revalidation when:
    - A problem is published.
    - A problem is archived.
    - Tags updated.

**Cache tagging example (conceptual):**

- Tag pages for:
  - `problem:<id>`
  - `tag:<slug>`
  - `difficulty:<level>`

- When a curator publishes or updates a problem:
  - Invalidate `problem:<id>`, related tag + difficulty tags.
  - This ensures lists & details are fresh but still mostly served from cache.

**DoD (Server caching):**

- Hot problem list/detail pages served from edge cache most of the time.
- Publishing a problem propagates within a reasonable window (<= 60–120s or via explicit revalidate).
- No stale contests or problem titles long after updates.

---

### 14.4 Database Performance & Query Design

**Objectives:**

- Keep P95/99 DB latency consistently low.
- Ensure queries scale with thousands of users, problems, submissions, and contests.

**Key indexes (minimum set):**

- `Problem`:
  - `slug` (unique)
  - `(state, visibility, difficulty, createdAt DESC)`
  - join tables for tags: `ProblemTag(tagId, problemId)`

- `Submission`:
  - `(userId, problemId, createdAt DESC)`
  - `(problemId, verdict, createdAt DESC)`
  - `codeHash` index (for duplicate detection)

- `User`:
  - `handle` (unique)
  - `(status, role)`

- `Contest`:
  - `slug` (unique)
  - `(state, startsAt)`

- `ContestSubmission` / `ContestParticipant`:
  - `(contestId, userId)`
  - `(contestId, problemId, userId)` for scoring

- `DiscussionPost`:
  - `(problemId, parentId, score DESC, createdAt DESC)`

**Query hygiene:**

- No unbounded `SELECT *` without pagination.
- Use cursor-based pagination for long lists (`problems.list`, `submissions.list`, `discussions.list`).
- Avoid N+1 query patterns in server-side rendering; prefer explicit joins or batched queries.

**Monitoring:**

- DB profiler enabled in non-prod to catch slow queries.
- Periodic review of:
  - top slow query patterns
  - missing or unused indexes.

**DoD (DB performance):**

- P95 DB query time stays low (< 100ms) for main queries under expected load.
- No recurring slow-query alerts in normal conditions.
- Index hit rate is high, minimal full scans on large tables.

---

### 14.5 Performance Targets & UX

**Targets:**

- **P95 “page interactive” < 1.5s** on mid-tier cloud + mid-tier device for:
  - `/problems`
  - `/problems/[slug]`
  - `/submissions`
  - `/u/[handle]` (profile)

- **Judge-related pages:**
  - Submissions history and detail pages fetch quickly; heavy logic is pushed to worker/judge, not API route.

**Perceived performance tweaks:**

- Use skeletons and minimal shimmer (no crazy animations).
- Prefetch next-likely pages (hovered items, contest problems, related problems).
- Lazy-load expensive components (editor, heavy charts).

**DoD (overall performance):**

- P95 interactive < 1.5s for core routes in real-world (non-synthetic) use.
- Back button and history behave correctly:
  - No redirect loops.
  - Filters/tabs are restored as expected.

- DB + cache dashboards show healthy metrics and no constant red flags.
