# Step 05 – Core Problem Experience Audit

_Date:_ <!-- keep updated -->  
_Scope:_ Review problem discovery and solving flows end-to-end (library, detail page, editor, discussions, trails, submissions) to ensure they satisfy OpenSolve’s UX + data requirements.

## 1. Method

- Followed the full “browse → open problem → solve → view history” path across reader + workspace segments:
  - `app/(reader)/problems/page.tsx` (`ProblemLibraryShell`) and supporting hooks/components.
  - `app/(reader)/problems/[slug]/page.tsx` (`ProblemReader` + `ProblemWorkspace`).
  - Problem ancillary routes: `/editorial`, `/trails`, `/discuss`, `/submissions`.
- Inspected caching helpers (`lib/cache/problems.ts`) to understand how problem data is prefetched.
- Exercised discussion + trails forms (`components/discussions/*`, `components/trails/*`) to confirm auth UX.
- Verified workspace navigation (`config/navigation.ts`, `app/(platform)/layout.tsx`) to ensure the problem library exists inside the authenticated shell.

## 2. Findings

### 2.1 Per-user problem data is cached as anonymous

- **Files:** `app/(reader)/problems/[slug]/page.tsx`, `lib/cache/problems.ts:20-56`
- Problem pages call `getCachedProblemDetail`, which is backed by `createPublicTRPCCaller()` (no session). The cached payload therefore always has `status = "UNSEEN"` and `lastSubmissionAt = null`, regardless of the viewer. Since the page renders purely from this cached data (no client refetch), authenticated users never see their actual progress, recent attempt timestamp, or personalized badges in `ProblemReader`.
- **Fix:** Either (a) drop the cache for viewer-specific endpoints, or (b) scope cache keys by session/user id and revalidate after submissions. Without that, the “Solved/Attempted” indicators and “Last attempt …” copy are permanently wrong.

### 2.2 Problem library hydration also uses anonymous cache

- **Files:** `app/(reader)/problems/page.tsx:4-28`, `lib/cache/problems.ts:6-34`, `components/problems/problem-library.tsx`
- The SSR dehydration uses `getCachedProblemList(filters)` (again via the anonymous caller) while the client query sets `staleTime = publicContentQueryOptions.staleTime` (5 minutes). Because React Query sees the server data as fresh, it never re-fetches on mount with the actual authed session. Result: `ProblemStatusBadge` always shows `UNSEEN`, `lastSubmissionAt` stays empty, and the “Solved/Attempted” filter has no effect until the user changes filters (which forces a new request). First impressions are therefore misleading and progress tracking effectively broken.
- **Fix:** Skip caching for viewer-scoped lists or lower the `staleTime` so the client immediately re-fetches with cookies. Ideally, add a separate cached endpoint for anonymous visitors and a non-cached call for signed-in users.

### 2.3 No workspace-native problem library

- **Files:** `config/navigation.ts:8-15`, `app/(platform)/layout.tsx:18-45`, `app/(platform)/problems/*`
- The sidebar links `Problems` → `/problems`, but only a reader route exists; there is no `(platform)/problems/page.tsx`. Clicking “Problems” or the dashboard CTA drops users into the public shell (`app/(reader)/layout.tsx`), so they lose the workspace topbar, breadcrumbs, role badges, and staff/admin quick actions. This violates the unified IA requirement and makes it impossible to expose workspace-specific filters (e.g., favoriting, private/internal problems, curator tools) on the main problem list.
- **Fix:** Stand up an authenticated `/problems` route under `(platform)` that wraps the existing library (or a redesigned version) in `SidebarShell`, and update the reader layout to be reserved for public/SEO traffic.

### 2.4 Status filters silently fail for logged-out users

- **Files:** `components/problems/problem-filters-panel.tsx:30-118`, `lib/trpc/router/problems.ts:320-338`
- The filter sidebar exposes “Solved / Attempted / Unseen” toggles even when no session exists. On the server, `problems.list` explicitly returns an empty list when `ctx.user` is missing and `input.status.length > 0`. The UI interprets this as “No problems found”, offering no hint that authentication is required for progress filters.
- **Fix:** Hide or disable status filters until a user is logged in, or surface a sign-in callout when they’re triggered without a session.

### 2.5 Contribution forms ignore auth

- **Files:** `components/discussions/discussion-composer.tsx`, `components/trails/trails-board.tsx:24-85`
- Discussion composers and the Trails insight form render for everyone. When an anonymous user submits, the protected mutations (`discussions.createThread`, `trails.addInsight`) respond with 401, resulting in a generic toast (“Unable to create thread”) with no guidance. OpenSolve spec calls for clear permission/role gates.
- **Fix:** Check session state (via `trpc.auth.getSession` or `useSession`) before rendering the composer, and replace the form with a “Sign in to contribute” prompt for anonymous visitors.

## 3. Next Steps

- Restructure the `/problems` experience so authenticated flows live under `(platform)` with accurate per-user data, while public caching stays in the reader segment.
- Rework the caching strategy for `problem.detail`/`problem.list` so viewer-specific fields aren’t cached globally; rehydrate personalized data after submissions to keep badges accurate.
- Gate status filters and contribution editors behind clear auth affordances.
- Once fixes land, re-run this audit path (Problem Library → Problem Reader → Workspace → Submissions/Discussions/Trails) to confirm progress badges, filters, and forms behave correctly for both anonymous and authenticated users.

_Reporter:_ Codex QA agent.
