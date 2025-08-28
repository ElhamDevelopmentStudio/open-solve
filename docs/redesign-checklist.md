# OpenSolve UI Redesign Checklist

Status legend: `[x]` redesigned, `[ ]` pending. Grouped by how visitors navigate (public → logged-in → administrative). Landing is marked complete.

## [01] Public / Marketing

- [x] `/` – Landing (app/(marketing)/page.tsx)
- [x] `/share/s/[publicId]` – Shared snippet/session viewer (app/share/s/[publicId]/page.tsx)

## [02] Authentication

- [x] `/sign-in` (app/(auth)/sign-in/page.tsx)
- [x] `/sign-up` (app/(auth)/sign-up/page.tsx)
- [x] `/auth/forgot-password` (app/(auth)/auth/forgot-password/page.tsx)
- [x] `/auth/reset-password` (app/(auth)/auth/reset-password/page.tsx)
- [x] `/auth/verify-email` (app/(auth)/auth/verify-email/page.tsx)
- [x] `/auth/magic-link` (app/(auth)/auth/magic-link/page.tsx)

## [03] Reader Experience (public browsing)

- [x] `/discuss` (app/(reader)/discuss/page.tsx)
- [x] `/discuss/[threadId]` (app/(reader)/discuss/[threadId]/page.tsx)
- [x] `/leaderboards` (app/(reader)/leaderboards/page.tsx)
- [x] `/leaderboards/tag/[slug]` (app/(reader)/leaderboards/tag/[slug]/page.tsx)
- [x] `/leaderboards/difficulty/[level]` (app/(reader)/leaderboards/difficulty/[level]/page.tsx)
- [x] `/leaderboards/[window]` (app/(reader)/leaderboards/[window]/page.tsx)
- [x] `/tags/[slug]` (app/(reader)/tags/[slug]/page.tsx)
- [x] `/problems` (app/(reader)/problems/page.tsx)
- [x] `/problems/[slug]` (app/(reader)/problems/[slug]/page.tsx)
- [x] `/problems/[slug]/discuss` (app/(reader)/problems/[slug]/discuss/page.tsx)
- [x] `/problems/[slug]/discuss/[threadId]` (app/(reader)/problems/[slug]/discuss/[threadId]/page.tsx)
- [x] `/problems/[slug]/editorial` (app/(reader)/problems/[slug]/editorial/page.tsx)
- [x] `/problems/[slug]/trails` (app/(reader)/problems/[slug]/trails/page.tsx)
- [x] `/difficulty/[level]` (app/(reader)/difficulty/[level]/page.tsx)
- [x] `/u/[handle]` (app/(reader)/u/[handle]/page.tsx)
- [x] `Problem not-found fallback` (app/(reader)/problems/[slug]/not-found.tsx)

## [04] Participant / Logged-In (core app)

- [x] `/dashboard` (app/(platform)/dashboard/page.tsx)
- [x] `/submissions` (app/(platform)/submissions/page.tsx)
- [x] `/submissions/[submissionId]` (app/(platform)/submissions/[submissionId]/page.tsx)
- [x] `/problems/[slug]/submissions` (app/(platform)/problems/[slug]/submissions/page.tsx)
- [x] `/contests` (app/(platform)/contests/page.tsx)
- [x] `/contests/[slug]` (app/(platform)/contests/[slug]/page.tsx)
- [x] `/contests/[slug]/clarifications` (app/(platform)/contests/[slug]/clarifications/page.tsx)
- [x] `/contests/[slug]/scoreboard` (app/(platform)/contests/[slug]/scoreboard/page.tsx)
- [x] `/contests/[slug]/problems/[label]` (app/(platform)/contests/[slug]/problems/[label]/page.tsx)
- [x] `/teams` (app/(platform)/teams/page.tsx)
- [x] `/proposals` (app/(platform)/proposals/page.tsx)
- [x] `/proposals/new` (app/(platform)/proposals/new/page.tsx)

## [05] Creator Workspace

- [x] `/workspace/problems` (app/(platform)/workspace/problems/page.tsx)
- [x] `/workspace/problems/[slug]` (app/(platform)/workspace/problems/[slug]/page.tsx)
- [x] `/workspace/editorials` (app/(platform)/workspace/editorials/page.tsx)
- [x] `/workspace/discuss` (app/(platform)/workspace/discuss/page.tsx)
- [x] `/workspace/leaderboards` (app/(platform)/workspace/leaderboards/page.tsx)
- [x] `/workspace/trails` (app/(platform)/workspace/trails/page.tsx)

## [06] Account & Settings

- [x] `/settings/account` (app/(platform)/settings/account/page.tsx)
- [x] `/settings/profile` (app/(platform)/settings/profile/page.tsx)
- [x] `/settings/security` (app/(platform)/settings/security/page.tsx)

## [07] Admin Console

- [x] `/admin` (app/admin/page.tsx)
- [x] `/admin/analytics` (app/admin/analytics/page.tsx)
- [x] `/admin/contests` (app/admin/contests/page.tsx)
- [x] `/admin/contests/[slug]/anti-cheat` (app/admin/contests/[slug]/anti-cheat/page.tsx)
- [x] `/admin/problems` (app/admin/problems/page.tsx)
- [x] `/admin/users` (app/admin/users/page.tsx)
- [x] `/admin/discussions` (app/admin/discussions/page.tsx)
- [x] `/admin/submissions` (app/admin/submissions/page.tsx)
- [x] `/admin/audit` (app/admin/audit/page.tsx)
- [x] `/admin/system` (app/admin/system/page.tsx)

## [08] Staff Tools

- [x] `/staff/problems` (app/staff/problems/page.tsx)
- [x] `/staff/problems/[id]` (app/staff/problems/[id]/page.tsx)
- [x] `/staff/proposals` (app/staff/proposals/page.tsx)
- [x] `/staff/proposals/[id]` (app/staff/proposals/[id]/page.tsx)
- [ ] `/staff/contests` (app/staff/contests/page.tsx)
- [ ] `/staff/contests/new` (app/staff/contests/new/page.tsx)
- [ ] `/staff/judge/manual` (app/staff/judge/manual/page.tsx)
