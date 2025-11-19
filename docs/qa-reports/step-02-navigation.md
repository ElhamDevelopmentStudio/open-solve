# Step 02 – Global Shell & Navigation Audit

_Date:_ <!-- keep updated -->  
_Scope:_ Validate that OpenSolve’s global shells (workspace, admin, staff, reader) expose every implemented feature, maintain consistent UX patterns, and avoid dead-end routes.

## 1. Method
- Reviewed primary navigation configs and shells:
  - Workspace shell + `dashboardNav` (`app/(platform)/layout.tsx`, `config/navigation.ts`).
  - Reader shell (`app/(reader)/layout.tsx`) for public experiences.
  - Admin shell (`app/admin/layout.tsx`) and staff shell (`components/staff/shell/staff-app-shell.tsx`).
  - Shared Sidebar primitives (`components/layout/sidebar-shell.tsx` & `components/layout/nav-icons.tsx`).
- Cross-referenced available routes under `app/(platform)`, `app/(reader)`, `app/admin`, and `app/staff` to ensure the nav actually points to implemented screens.
- Checked for mobile/desktop parity (collapse states, menu triggers) and breadcrumbs/action areas in the topbar.

## 2. Findings & Required Fixes

### 2.1 Workspace nav points to public routes
- `dashboardNav` exposes `/problems` and `/leaderboards` (`config/navigation.ts:8-15`), but only reader routes exist at those paths (`app/(reader)/problems/page.tsx`, `app/(reader)/leaderboards`).  
- Result: Clicking “Problems” or “Leaderboards” from the authed workspace ejects users from the workspace shell into the public reader layout, breaking context, breadcrumb continuity, and RBAC cues.  
- **Fix:** Implement workspace-native problem + leaderboard surfaces (e.g., `app/(platform)/problems` list with TanStack filters, `/leaderboards` ported inside platform) or update nav targets to dedicated “library” routes that live under `(platform)`. Avoid hijacking reader layout for logged-in flows.

### 2.2 Hidden reader pages
- The reader layout only links to Problems/Leaderboards + external docs/GitHub (`app/(reader)/layout.tsx:10-74`).  
- Existing first-class reader routes (`app/(reader)/discuss`, `app/(reader)/tags`, `app/(reader)/difficulty/[level]`, per-problem Editorial/Trails tabs) cannot be discovered without manual URL entry.  
- **Fix:** Expand reader nav (and footer) with Discussions, Tags, Companies, Editorial policy, etc., and ensure per-problem tabs expose Approach Trails + Editorial from the statement page. Add a “Trail Insights” or “Discuss” CTA at the top-level nav so SEO visitors can reach communities.

### 2.3 Reader mobile menu is non-functional
- The mobile “Menu” button in `app/(reader)/layout.tsx:76-92` renders an icon but no disclosure logic, meaning nav links are inaccessible below `md`.  
- **Fix:** Implement an actual mobile menu (drawer/dialog) or convert to a collapsible nav that lists the same links with focus traps and close controls. Without this, the site fails accessibility requirements on small screens.

### 2.4 Workspace lacks Discussions/Trails/Editorial entry points
- Beyond the misrouted `/problems`, there is **no** sidebar path for:
  - Global Discussions (`app/(reader)/discuss`)
  - Approach Trails library (`app/(reader)/problems/[slug]/trails` + any admin tooling)
  - Editorial archive or insights builder  
- Requirement §2.2 insists every implemented surface must be reachable through UI. We need dedicated nav items (or nested sections) for Discuss, Trails, Editorials, plus “Insights” for future features. Also consider quick actions in the topbar (e.g., “New Problem”, “Start Discussion”).

### 2.5 Admin navigation incomplete vs. SRS
- Current admin nav covers Overview, Analytics, Users, Problems, Submissions, Discussions/Trails, Contests, System & Flags, Audit (`app/admin/layout.tsx:8-18`).  
- Missing mandated surfaces: Anti-Cheat Dashboard, Feature Flags detail (distinct from general settings), Editorial management, Approach Trails moderation, Impersonation, Backups/Migrations, Deployment info, Incident/Operations summary. Some may exist under `app/admin/system` but are not discoverable individually.  
- **Fix:** Expand `adminNav` to include each subsystem explicitly (even if route placeholders exist) and ensure UI-only gating is removed—admins should not need manual URLs.

### 2.6 Staff console scope too narrow
- Staff nav exposes Contests, Manual Judge, Problem Bank, Proposals (`components/staff/shell/staff-app-shell.tsx:20-52`).  
- Missing operations such as Anti-Cheat review, contest clarifications, editorial approvals, and queue health.  
- **Fix:** Add nav groups for Monitoring (judge queue, anti-cheat signals) and Engagement (discussions moderation, editorial approvals) so staff tools aren’t hidden.

### 2.7 Topbar lacks page-level actions/context
- `SidebarShell` topbar shows breadcrumbs + theme toggle (`components/layout/sidebar-shell.tsx:107-174`) but no per-page title/action slot, so primary actions get buried inside content panes.  
- Requirement §2 mandates page title + subtitle + actions in the topbar.  
- **Fix:** Extend `SidebarShell` API to accept a `pageHeader` descriptor or allow child layouts to inject a sticky header region for actions (e.g., `Problem Library` + filter toggles, `Contests` + “New Contest”). This keeps actions visible alongside breadcrumbs.

## 3. Remediation Plan for Step 02
1. **Define workspace-native Problem Library + Leaderboards** routes and update `dashboardNav` to point to them, preserving workspace layout + breadcrumbs.  
2. **Rebuild reader navigation** with a comprehensive link map (Problems, Tags, Discussions, Leaderboards, Editorials, Trails, Docs, GitHub) and wire up the mobile menu.  
3. **Add sidebar entries** for Discussions, Trails, Editorials, Anti-Cheat (workspace/admin/staff), ensuring implemented routes (or new placeholders) live under the correct layout group.  
4. **Enhance `SidebarShell`** to support contextual action slots and consistent topbar titles, plus ensure responsive collapse states degrade gracefully.  
5. **Document new nav structure** in `docs/` (navigation playbook) so future routes automatically plug into the shell without manual rediscovery.

_Next Action:_ Implement the navigation/layout corrections before moving to Step 03 (Auth & RBAC), ensuring the redesigned shell matches the OpenSolve IA guidelines.  
_Reporter:_ Codex QA agent.
