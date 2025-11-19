# Step 07 – Contests & Anti-Cheat Audit

_Date:_ <!-- keep updated -->  
_Scope:_ End-to-end review of contest flows (creation, registration, scoreboard, clarifications, anti-cheat telemetry) across user, staff, and admin surfaces.

## 1. Method
- Examined participant UX (`components/contests/*`, `app/(platform)/contests/*`, `trpc.contests.*`).
- Audited staff/admin tooling (contest builder, staff dashboards, admin anti-cheat panel).
- Inspected anti-cheat client hook (`useContestAntiCheat`) and related API endpoints.
- Reviewed schema/config objects (`lib/contests/schema.ts`, builder wizard) to ensure spec coverage.

## 2. Findings

### 2.1 Anti-cheat events never reach the backend
- **Files:** `hooks/use-contest-anti-cheat.ts`, `lib/contests/anti-cheat/*`, `app/api/contests/[id]/anti-cheat`
- The client-side hook posts batches to `/api/contests/${contestId}/anti-cheat`, but there is no corresponding API route or server handler in the repo. The hook silently catches fetch failures, meaning all focus/paste/device telemetry is dropped. Admin anti-cheat dashboards therefore rely on nonexistent data.
- **Fix:** Implement the API endpoint that authenticates the participant, accepts `ContestAntiCheatClientEvent[]`, persists them (and updates flag status), and returns warnings/status. Without it, anti-cheat UI is decorative.

### 2.2 Admin anti-cheat pages are hidden from navigation
- **Files:** `app/admin/contests/[slug]/anti-cheat/page.tsx`, `app/admin/layout.tsx:8-18`
- Although a dashboard exists, the admin sidebar lacks any link to “Anti-Cheat” or contest-specific tooling. Admins must manually type `/admin/contests/<slug>/anti-cheat`. This violates the “no hidden pages” rule and makes the entire system undiscoverable.
- **Fix:** Add navigation entries (under Admin → Contests) for Anti-Cheat dashboards and expose quick links from the staff console.

### 2.3 No participant-facing anti-cheat messaging
- **Files:** `components/contests/contest-detail.tsx`, `components/problems/problem-reader.tsx`
- Contest detail and registration flows never mention anti-cheat policies, exam mode, or what telemetry is captured. Only the editor page shows a small banner once the guard is active. There’s no per-contest policy summary or consent step, potentially breaching expectations and leading to user confusion when the guard blocks features (e.g., context menu).
- **Fix:** Surface anti-cheat settings on contest detail/registration cards (“This contest uses exam mode; tab switches are monitored,” etc.) and provide a link to policy docs before registration.

### 2.4 Staff contest tools restricted to admins but not surfaced in Admin Panel
- **Files:** `lib/trpc/router/staff/contests.ts` (uses `adminProcedure`), `components/staff/contests/staff-contest-dashboard.tsx`
- The staff console exposes contest monitoring/clarifications to any staff role, but tRPC actually requires `ADMIN`. Non-admin staff see 403s after hydration. Meanwhile, the Admin panel doesn’t replicate these dashboards. Admins must go to `/staff/contests` to access their own tools.
- **Fix:** Either (a) move the admin-only contest tooling into the Admin area with matching navigation, or (b) retune the router to `staffProcedure` and conditionally hide features based on role.

### 2.5 No freeze/scoreboard-state indicator in participant UI
- **Files:** `components/contests/contest-scoreboard.tsx`
- The scoreboard doesn’t reflect freeze/suppress states beyond a generic “Scoreboard is hidden” message. During freezes, participants can’t tell whether entries are stale or frozen; there’s no countdown or “last unfrozen update at…” indicator.
- **Fix:** Display freeze status, last unfrozen timestamp, and upcoming unfreeze time derived from contest settings.

### 2.6 Contest creation wizard lacks validation on problem labels/points
- **Files:** `components/contests/contest-creation-wizard.tsx`
- The wizard allows duplicate problem labels, zero points, or missing per-problem settings without warnings. Back-end schema expects unique labels and order, but the form doesn’t prevent duplicates, leading to build errors only after submission.
- **Fix:** Add client-side validation (unique labels/ordering, required points, etc.) and show inline errors before hitting the mutation.

### 2.7 No user access to anti-cheat incident logs
- **Files:** None (missing feature)
- Participants flagged or disqualified have no way to review telemetry or appeal within the UI. Admin dashboards can change status, but there’s no participant portal showing flagged events. Without transparency, anti-cheat actions appear arbitrary.
- **Fix:** Provide a limited participant view (e.g., under contest detail) listing their own warnings and appeal instructions.

## 3. Next Steps
- Implement the missing anti-cheat ingestion API and persist client events.
- Update Admin/Staff navigation to expose all contest management and anti-cheat dashboards.
- Improve participant messaging on anti-cheat policies and scoreboard freeze states.
- Harden the contest creation wizard with validation and preview for anti-cheat settings.
- Plan a participant-facing telemetry/appeal page so flagged users understand actions taken against them.

_Reporter:_ Codex QA agent.
