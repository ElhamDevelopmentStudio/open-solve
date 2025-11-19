# Step 08 – Discussions, Editorials & Trails Audit

_Date:_ <!-- keep updated -->  
_Scope:_ Ensure community surfaces (global + per-problem discussions, editorials, trails) are reachable, moderated, and role-gated correctly for both users and staff.

## 1. Findings

### 1.1 Discussions/Trails unreachable from navigation
- **Files:** `config/navigation.ts:8-15`, `app/(reader)/layout.tsx:10-74`
- Neither the authenticated sidebar nor the public reader navbar exposes links to Discussions or Trails. Global discussion boards (`app/(reader)/discuss`) and Trail insights (`app/(reader)/problems/[slug]/trails`) exist but require manual URL entry, violating the “no hidden pages” rule. Users cannot discover community features from the primary navigation.
- **Fix:** Add top-level nav items (“Discussions”, “Trails”, “Editorials”) to both the workspace sidebar and the reader header so these surfaces are always one click away.

### 1.2 Staff moderation UIs missing
- **Files:** `components/staff/shell/staff-app-shell.tsx:20-52`, `app/staff/*`
- Staff shell only exposes Contests, Manual Judge, Problem Bank, and Proposals. There are **no** `/staff/discussions` or `/staff/trails` pages despite existing tRPC routers (`lib/trpc/router/staff/discussions.ts`, `lib/trpc/router/staff/trails.ts`). Moderators cannot reach their tools without admin access, leaving reports/unmoderated content unmanaged.
- **Fix:** Build staff-facing discussion/trail moderation pages and add them to the staff nav (visible for `MODERATOR`/`ADMIN` roles). Alternatively, move moderation entirely under Admin if staff isn’t supposed to use it.

### 1.3 Anonymous composers produce opaque errors
- **Files:** `components/discussions/discussion-composer.tsx:10-90`, `components/trails/trails-board.tsx:26-90`
- Both the discussion composer and trail insight form render even when the viewer isn’t signed in. Submitting runs protected mutations (`trpc.discussions.createThread`, `trpc.trails.addInsight`) that immediately return UNAUTHORIZED, which surfaces as “Unable to create thread” / “Unable to add insight” with no guidance.
- **Fix:** Gate these composers behind a session check (e.g., `if (!session) { show Sign In card }`). Provide inline prompts to log in instead of allowing anonymous submissions that always fail.

### 1.4 Editorial & trail admin management missing
- **Files:** (absent) – no `app/admin/editorials/*`, no `app/admin/trails/*`
- The Admin navigation lists “Discussions & Trails”, but the codebase lacks dedicated admin editorial/trail management pages. Editorials rely on the problem editor only; there’s no global pipeline to schedule releases, approve drafts, or audit published content as required by the SRS (“Editorials Management”, “Approach Trails Management”).
- **Fix:** Implement admin modules for editorial scheduling/release and trail moderation summaries, or remove the nav item until the feature exists to avoid dead links.

### 1.5 Global Discussions page hidden to authenticated users
- **Files:** `app/(platform)/layout.tsx:18-45`, `app/(reader)/discuss/page.tsx`
- Logged-in users accessing `/discuss` transition to the public layout, losing workspace context and breadcrumbs. There is no workspace-equivalent discussions page (`(platform)/discuss`). This fragmentation breaks the unified shell requirement and makes it difficult to access moderation tools or return to other workspace sections.
- **Fix:** Create workspace-scoped routes (e.g., `/discuss` under `(platform)`) that reuse the reader components but keep the shell, and update nav links accordingly.

## 2. Next Steps
- Extend navigation to surface Discussions, Editorials, and Trails in both app shells.
- Build staff/admin moderation dashboards for discussions and trails, wiring them to the existing tRPC routers.
- Gate composer components behind authentication prompts to eliminate confusing 401 errors.
- Implement the missing editorial/trail admin tooling or update navigation to reflect actual capabilities.

_Reporter:_ Codex QA agent.
