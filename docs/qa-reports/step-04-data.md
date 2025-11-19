# Step 04 – tRPC & React Query Data Audit

_Date:_ <!-- keep updated -->  
_Scope:_ Validate that data fetching (tRPC + React Query) adheres to caching, hydration, invalidation, and error-state expectations. Focus areas: query key hygiene, SSR hydration, filter/search param syncing, and resilience in loading/error flows.

## 1. Method

- Reviewed shared data utilities (`lib/react-query/*`, `lib/trpc/*`, hooks under `hooks/`).
- Traced all `prefetchTrpcQuery` usages in server components to confirm query keys align with client hooks.
- Audited representative client components (problem library, submissions, discussions, staff dashboards) for:
  - Consistent use of TanStack options (`enabled`, `initialData`, `refetchInterval`, etc.).
  - Proper error and loading states.
  - URL sync via `nuqs`.
- Inspected key mutations (problem editor, submissions, contests) to ensure cache invalidation and optimistic flows.

## 2. Findings & Fixes Needed

### 2.1 Hydration miss: staff dashboards prefetch without matching inputs

- **Where:** `app/staff/problems/page.tsx:7-11`, `app/staff/proposals/page.tsx:7-11`
- **Issue:** Both pages call `prefetchTrpcQuery("staff.problems.list", () => caller.staff.problems.list({}))` (similarly for proposals) without supplying the `input` metadata. On the client, `trpc.staff.problems.list.useQuery({ state: undefined })` (`components/staff/problems/problems-dashboard.tsx:22-25`) and `trpc.proposals.staffList.useQuery({ status: … })` (`components/staff/proposals/proposals-dashboard.tsx:39-45`) include an input object in the query key. Because the server-side hydration key lacks that meta payload, React Query can’t hydrate the prefetched data and immediately issues a second network request, causing flicker and defeating SSR caching.
- **Fix:** When prefetching, pass the _exact_ input object (or `undefined` when filters are empty) via the `options.input` parameter:
  ```ts
  prefetchTrpcQuery("staff.problems.list", () => caller.staff.problems.list({ state: undefined }), {
    input: { state: undefined },
  });
  ```
  On the client, normalize hook calls so that “no filter” truly passes `undefined` instead of `{ state: undefined }`. Apply the same pattern to `proposals.staffList` (and any other server-prefetched procedure) so keys align 1:1 between server and client.

### 2.2 Query key drift when filters are “ALL”

- **Where:** `components/staff/proposals/proposals-dashboard.tsx:37-50`, `components/staff/problems/problems-dashboard.tsx:20-28`
- **Issue:** Even when the UI filter is “ALL”, the hooks call `useQuery({ status: undefined })` / `useQuery({ state: undefined })`. React Query still treats `{ status: undefined }` as unique input, so toggling filters repeatedly spawns fresh cache entries (`status: "SUBMITTED"`, `status: undefined`, etc.) that never get reused, and they don’t match the server-prefetch key (see 2.1). This bloats cache size and forces redundant network calls whenever the user returns to “ALL”.
- **Fix:** Only pass an input object when an actual value is selected:
  ```ts
  const filters = statusFilter === "ALL" ? undefined : { status: statusFilter };
  trpc.proposals.staffList.useQuery(filters, …);
  ```
  This keeps the base key stable (`[['proposals','staffList']]`) for the default case, enabling SSR hydration and query reuse.

### 2.3 Problem library & global discussions treat API failures as “empty”

- **Where:** `components/problems/problem-library.tsx:100-210`, `components/discussions/global-discussions-client.tsx:70-150`
- **Issue:** Both components ignore `query.isError`. When the tRPC call fails, `listData`/`threads` stay `undefined`, `isPending` flips to `false`, and the UI renders the “No problems found” or “No discussions yet” empty state. Users get misleading content plus no retry affordance.
- **Fix:** Add explicit error branches with an alert/banner and retry button, e.g.:
  ```tsx
  if (listQuery.isError) {
    return (
      <Alert variant="destructive">
        Failed to load problems<button onClick={() => listQuery.refetch()}>Retry</button>
      </Alert>
    );
  }
  ```
  Do the same for discussions and any other high-traffic data set so failures are surfaced instead of masquerading as empty lists.

### 2.4 Staff problem mutations don’t invalidate shared caches

- **Where:** `components/staff/problems/problem-editor-shell.tsx:112-171`
- **Issue:** Every mutation (`saveContent`, `submitForReview`, `publish`, `updateLanguages`, etc.) only calls `utils.staff.problems.get.invalidate({ id })`. The staff dashboard list (`staff.problems.list`) and public problem caches (`problems.list`, filter metadata) never refresh, so drafts stay stale until a manual reload, and publishing a problem doesn’t bust the public library caches.
- **Fix:** Centralize invalidation via the helper in `lib/react-query/invalidation.ts` or at least manually invalidate the relevant lists:
  ```ts
  const invalidateProblemCaches = () => {
    utils.staff.problems.get.invalidate({ id: problemId });
    utils.staff.problems.list.invalidate();
    invalidateTags(queryClient, ["problems", "tags", "staffProblems"]);
  };
  ```
  Call this from each mutation `onSuccess` so curator actions propagate instantly to dashboards and the reader experience.

## 3. Next Steps

- Patch the hydration/query-key mismatches, then re-run a full SSR smoke test (load `/staff/problems` and `/staff/proposals` to confirm no duplicate requests in DevTools).
- Introduce shared error panels for list-heavy components to standardize failure handling.
- Update staff/editor mutations to invalidate list caches + public problem data per the React Query tag plan (`docs/api/react-query-keys.md`).
- After fixes, rerun Step 04 checks (SSR hydration, query invalidation, loading/error states) before proceeding to the Problem Experience deep dive.

_Reporter:_ Codex QA agent.
