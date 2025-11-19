# Step 09 – Admin Panel Coverage Audit

_Date:_ <!-- keep updated -->  
_Scope:_ Verify that every SRS-mandated admin surface (users, problems, submissions, contests, anti-cheat, discussions, trails, editorials, feature flags, infra health, impersonation, backups, deployment info, etc.) is both implemented and reachable via the Admin navigation.

## 1. Findings

### 1.1 Anti-cheat dashboards implemented but hidden
- **Files:** `app/admin/contests/[slug]/anti-cheat/page.tsx`, `components/admin/contests/contest-anti-cheat-dashboard.tsx`, `app/admin/layout.tsx:8-18`
- There is no navigation entry or CTA that links to `/admin/contests/[slug]/anti-cheat`. Admins must manually type the URL to see contest telemetry. This violates the requirement that the Anti-Cheat Dashboard be “visible & clickable from Admin Panel navigation.”
- **Fix:** Add an “Anti-Cheat” child link under Admin → Contests (and from each contest row) so admins can reach the dashboard without guesswork.

### 1.2 “Discussions & Trails” nav leads to discussions only
- **Files:** `app/admin/discussions/page.tsx`, `components/admin/discussions/admin-discussions-client.tsx`
- Despite the nav label, there is no Trails management surface under Admin. Moderators cannot review trail reports or merges from the Admin area. Staff routers (`lib/trpc/router/staff/trails.ts`) exist but have no UI, leaving Approach Trails management out of compliance.
- **Fix:** Implement an admin/staff Trails moderation page (list insights, resolve reports, merge) and wire it to the existing router, or rename the nav item until the feature ships.

### 1.3 Editorial management missing entirely
- **Files:** (none) – no `app/admin/editorials/*`
- The SRS calls for “Editorials Management,” but editorials can only be edited via the staff problem editor. There’s no global list of editorials, release status, or tooling to approve/schedule them. Admins can’t audit editorial backlog, release offsets, or publish delays.
- **Fix:** Add an Editorials admin module (list drafts, edit release schedule, toggle visibility) and expose it in the Admin nav.

### 1.4 No backups / migration / deployment info surfaces
- **Files:** (none) in `/app/admin`, `/components/admin`
- Admin requirements include “Backups & Migrations” and “Deployment Info.” The panel lacks any page that links to ops docs, backup status, migration history, or current build SHA. Operators must inspect `ops/` manually, undermining the promise of a “God mode” console.
- **Fix:** Add a “Deployments & Backups” section summarizing latest migration status, backup timestamps, artifact versions, and linking to runbooks.

### 1.5 Impersonation is buried
- **Files:** `components/admin/users/admin-users-client.tsx:210-300`
- Impersonation exists only as a button inside the user detail sheet; there’s no dedicated “Impersonation System” entry in Admin navigation (nor audit log filters). While not strictly broken, this fails the explicit SRS requirement that impersonation tooling be discoverable as its own subsystem.
- **Fix:** Add a nav entry pointing to a small “Impersonation” panel (active sessions, audit history, quick exit) so admins understand the feature exists.

### 1.6 Admin nav lacks quick access to Ops health & queue depth
- **Files:** `app/admin/system/page.tsx`, `components/admin/system/admin-system-client.tsx`
- Infra metrics live under “System & Flags,” but the nav doesn’t expose queue health or judge status separately. Given the SRS emphasis on “System/Infrastructure (Judge nodes, DB health, queue depth)”, consider breaking out a dedicated Ops/Health nav item or at least renaming the entry to “System, Flags & Health” so operators know where to look.

## 2. Next Steps
- Update the Admin sidebar to include explicit links for Anti-Cheat, Trails moderation, Editorial management, Impersonation, Deployments/Backups, and Ops health.
- Implement the missing editorial/trail/admin surfaces so the nav items aren’t dead ends.
- Provide an Ops/Deployment summary page (build SHA, migration status, backup timestamps, queue depth) to cover the remaining SRS requirements.

_Reporter:_ Codex QA agent.
