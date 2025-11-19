# Step 03 – Auth & RBAC Audit

_Date:_ <!-- keep updated -->  
_Scope:_ Validate authentication flows, RBAC boundaries (user → curator → moderator → admin), and impersonation safeguards across UI shells and tRPC procedures.

## 1. Method

- Reviewed authentication/session helpers (`lib/auth/session.ts`, `lib/auth/permissions.ts`) plus middleware coverage.
- Inspected layout-level guards: workspace (`app/(platform)/layout.tsx`), staff (`app/staff/layout.tsx` + `components/staff/shell/...`), admin (`app/admin/layout.tsx`), reader shell.
- Traced tRPC middleware (`lib/trpc/trpc.ts`) to understand `protectedProcedure`, `staffProcedure`, `adminProcedure`, and `hasRole` logic.
- Sampled critical routers (`lib/trpc/router/staff/*`, `.../admin/*`, `proposals`, etc.) to confirm they use the correct middleware for their domain.

## 2. Findings

### 2.1 Impersonation bypass in `adminProcedure`

- Source: `lib/trpc/trpc.ts:33-78`. `hasRole("ADMIN")` grants access if `session.impersonatorId` is set, regardless of the impersonated user’s role (`const impersonatingAdmin = role === "ADMIN" && Boolean(ctx.session.impersonatorId)`).
- Impact: When an admin impersonates a regular user, that impersonated session can still call **all admin procedures** (and any UI hitting them) even though the visible identity is non-admin. This undermines “impersonate for debugging only” expectations and violates least privilege.
- Fix direction: Track the impersonator separately—impersonated sessions should inherit the impersonated user’s permissions (no adminProcedure access). If admins need to keep acting as themselves during impersonation, expose dual-context actions explicitly.

### 2.2 Contest management UI accessible to non-admin staff

- `app/staff/layout.tsx:12-18` + `components/staff/shell/staff-app-shell.tsx:20-43` grant all staff roles (PROBLEM_CURATOR, MODERATOR, ADMIN) access to “Contests” tooling.
- However, the backing router (`lib/trpc/router/staff/contests.ts:1-78`) uses `adminProcedure`, so PROBLEM_CURATOR/MODERATOR see 403 errors after hydration instead of being blocked earlier.
- Requirement: “ONLY ADMIN can create/manage contests.” Staff shell must hide/guard contest management entirely for curators/moderators. Either split shells per role or add route-level redirects before rendering.

### 2.3 Authoring editor exposed to Moderators

- `isStaffRole` (`lib/auth/permissions.ts:4-8`) lumps MODERATOR with PROBLEM_CURATOR, granting both access to Staff layout and all problem-authoring pages.
- Staff problem router (`lib/trpc/router/staff/problems.ts:1-170`) sits behind `staffProcedure`, so moderators can create/edit problems, violating “ONLY PROBLEM_CURATOR can use authoring editor.” Admin should retain override, but moderators should not.
- Fix: Introduce a `curatorProcedure` (already exported) and migrate authoring endpoints + pages to it. Update Staff nav to only show authoring links when `role === "PROBLEM_CURATOR"` or admin.

### 2.4 Moderation tools shared with curators

- Discussion moderation router (`lib/trpc/router/staff/discussions.ts:1-36`) also uses `staffProcedure`, so curators can shadow-ban, hide, or lock discussions. Spec requires “ONLY MODERATOR can moderate” (admins implicitly allowed).
- Solution: create `moderatorProcedure` middleware (or reuse `hasRole("MODERATOR")` with admin override) and wire moderation endpoints + UI tabs to it.

### 2.5 Staff shell lacks role-aware navigation

- `components/staff/shell/staff-app-shell.tsx:20-52` renders the same nav for every staff role, causing both UX confusion (links that trigger 403s) and potential security misconfigurations if routers later loosen.
- Need per-role groupings: e.g., Curator (Problem Bank, Proposals), Moderator (Discussions, Anti-Cheat review), Admin Ops (Contests, Queue health). Layout should hide/disable forbidden sections and optionally show a locked notice instead of a broken page.

### 2.6 Lack of explicit guard on `/leaderboards`, `/problems` workspace routes

- Workspace layout (`app/(platform)/layout.tsx:12-45`) protects everything under `(platform)`, but as noted in Step 02 the nav points to reader routes. This means RBAC-protected filters/tabs (e.g., private Trails, internal problem states) aren’t available because the workspace never renders those pages. Fix will come with the navigation overhaul but is noted here as it prevents applying RBAC in-app.

## 3. Positive Checks

- `app/admin/layout.tsx:20-58` blocks admin routes for non-admins and also rejects impersonated sessions (`session.session.impersonatorId`) to prevent privileged actions while impersonating. (The TRPC layer bug still needs fixing.)
- `protectedProcedure` correctly gates authenticated APIs; `staffProcedure` restricts to STAFF_ROLES; `curatorProcedure` exists for targeted use, just underused.
- Session helpers enforce HttpOnly cookies, refresh tokens, and impersonation metadata (`lib/auth/session.ts:1-210`).

## 4. Remediation Plan

1. **Fix admin impersonation logic**: remove `impersonatingAdmin` bypass from `hasRole`. Introduce explicit “act as admin” APIs if necessary but keep impersonated sessions restricted to the impersonated user’s scope.
2. **Split staff access by role**:
   - Add `moderatorProcedure` middleware (role MODERATOR, admin override). Rewire discussion moderation + anti-cheat routers to it.
   - Replace `staffProcedure` with `curatorProcedure` for authoring/editorial endpoints; update UI gating to hide creation links for moderators.
3. **Guard staff routes before render**: Update `app/staff/*` pages (and Staff shell) to redirect unauthorized roles instead of letting them hydrate and fail.
4. **Expose contest management solely in Admin**: Move contest builder/list screens under `/admin/contests` or gate `StaffContestDashboard` behind admin checks; adjust sidebar accordingly.
5. **Document RBAC expectations** in `docs/quality/runbooks.md` or a dedicated RBAC reference so future features plug into the right middleware automatically.

_Next Action:_ Once RBAC fixes are in progress, continue to **Step 04 – tRPC + React Query data auditing**.  
_Reporter:_ Codex QA agent.
