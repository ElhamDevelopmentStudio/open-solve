
# 12) Admin Panel (God Mode)

## 12.0 Purpose

Provide a **single, unified, all-powerful control surface** where an `ADMIN` can:

-   See and manipulate **every entity** (users, roles, problems, submissions, discussions, contests, system state).
    
-   Control **every feature flag**, **every environment setting**, and **every moderation decision**.
    
-   Impersonate **any role** and **any user** to debug or act on their behalf.
    
-   Observe and intervene in **any process**: judge jobs, queues, caches, deployments, backups, reindexes, migrations.
    

**ADMIN is the final authority.**  
Nothing is hidden, nothing is immutable, nothing is out of reach.

----------

## 12.1 Role Semantics (God Mode)

-   `ADMIN` is **root**. Not “high privilege” — **absolute control**.
    
-   Can:
    
    -   Read and modify any data (including all “private” data).
        
    -   Assume any identity (impersonate any user/role).
        
    -   Override any protection (read-only states, locks, bans, quotas).
        
    -   Enable/disable any feature, flag, or subsystem.
        
    -   Approve or cancel any background process, rejudge, or migration.
        
-   No other role (USER, MODERATOR, PROBLEM_CURATOR) can see the Admin Panel or its routes.
    

> In code terms:  
> **If access check == ADMIN → everything is allowed.**

We still **log everything**, but there are no structural limits.

----------

## 12.2 Navigation & Structure

Admin Panel lives at something like `/admin`, only visible to `ADMIN`.

Main sections:

1.  **Overview (Home / Dashboard)**
    
2.  **Users & Roles**
    
3.  **Problems & Content**
    
4.  **Submissions & Judge**
    
5.  **Discussions & Editorials & Trails**
    
6.  **Contests**
    
7.  **System & Infra**
    
8.  **Feature Flags & Config**
    
9.  **Audit Logs & Incidents**
    
10.  **Impersonation & Sessions**
    
11.  **Backups, Migrations & Maintenance**
    

Each section is drillable, with search + filters + quick actions.

----------

## 12.3 Users & Roles (Souls in Your Hands)

**ADMIN can:**

-   Search users by id, handle, email, IP hash, device fingerprint.
    
-   View **full profile**:
    
    -   Public stats
        
    -   Private fields (email, sessions, IP/device, anti-cheat flags, reports, ban history).
        
-   Change roles instantly (`USER ↔ MODERATOR ↔ PROBLEM_CURATOR ↔ ADMIN`).
    
-   Ban/unban:
    
    -   Temporary or permanent.
        
    -   Add reasons and notes.
        
-   Shadow-ban/unshadow:
    
    -   See effect across discussions, trails, leaderboards.
        
-   Hard delete user:
    
    -   Trigger PII removal and anonymization of submissions/discussions (if desired).
        
-   Force password reset, revoke all sessions.
    
-   View and manage:
    
    -   Sessions (per device), including IP hash, UA.
        
    -   2FA status (enabled/disabled).
        
-   Rate-limit overrides:
    
    -   Increase/decrease per-user caps for submissions, posts, proposals, etc.
        

**Extra power:**

-   **Impersonate as user** (see 12.10).
    
-   **Export user data** (for legal/compliance).
    

----------

## 12.4 Problems & Content

**Problems**

-   Browse/advanced search: by slug, tags, difficulty, state, author, usage in contests.
    
-   Change state: draft/review/published/archived.
    
-   Change visibility: public/unlisted/internal.
    
-   Set/remove tags, difficulty, company tags.
    
-   Manage versions:
    
    -   See all `ProblemVersion`s.
        
    -   Promote/demote versions.
        
    -   Roll back to older version (spawn new version).
        
-   Clone/copy problems between contests or sets.
    
-   Mark problems as “contest-only” or “global”.
    

**Test cases & constraints**

-   View all test cases (sample + hidden).
    
-   Download/upload tests (bulk).
    
-   Modify test sets and limits.
    
-   Run validation/regeneration tasks.
    

**Editorials**

-   View all editorials, including unreleased ones.
    
-   Edit, override `editorialReleaseAt`, publish now.
    
-   Link/unlink editorials from ProblemVersions.
    

**Approach Trails & Discussions**

-   Full access to:
    
    -   All insights, edges, hidden/misleading markers.
        
    -   All discussion posts, hidden or not.
        
-   Admin can:
    
    -   Hard delete content.
        
    -   Merge or split insights.
        
    -   Overrule moderator decisions.
        

----------

## 12.5 Submissions & Judge Control

**Submission control**

-   Global search: by user, problem, verdict, language, contest, IP hash.
    
-   View submission detail:
    
    -   Full code, tests, per-test results, stderr, judge node info.
        
-   Force rejudge:
    
    -   Single submission.
        
    -   All submissions by user X.
        
    -   All submissions on problem P.
        
    -   All submissions in contest C.
        
    -   All submissions in language L (e.g., after upgrading compiler).
        
-   Change visibility:
    
    -   Mark submissions as hidden from profiles or leaderboards.
        
    -   Override user preferences if needed.
        

**Judge & Queue management**

-   Inspect RabbitMQ queues:
    
    -   Depth, rates, dead letters.
        
-   Pause/resume judge workers.
    
-   Drain queues gracefully (let current jobs finish, stop new ones).
    
-   Kill/terminate a problematic worker.
    
-   Change concurrency limits.
    
-   Toggle auto-retries and backoff parameters.
    
-   Trigger synthetic jobs for test.
    

----------

## 12.6 Discussions, Editorials & Approach Trails (Moderation from Above)

-   View **all discussions**, including hidden/shadow-banned posts.
    
-   Take any moderation action:
    
    -   Hide, unhide, lock, unlock threads.
        
    -   Shadow-ban/unshadow any user.
        
    -   Erase or redact content.
        
-   Clear or adjust **spoiler** flags.
    
-   Mass actions:
    
    -   Clean entire threads for spam waves.
        
    -   Remove all content from a user.
        
-   Editorial overrides:
    
    -   Immediately release editorial for a problem or contest set.
        
    -   Pull editorial back (unrelease) if needed.
        
-   Trails:
    
    -   Global view of all insights across problems.
        
    -   Bulk hide/merge/cleanup.
        

----------

## 12.7 Contests (All Power, Already Specced)

Connects to the big contest system in Section 11.

Admin can, from Admin Panel:

-   Create, edit, duplicate, delete contests.
    
-   Override all settings:
    
    -   Time, freeze, scoring, feedback, anti-cheat.
        
-   Force start/end/freeze/unfreeze.
    
-   DQ users, ban from contest, or ban from platform.
    
-   Trigger full/partial rejudges.
    
-   Publish or hide standings.
    
-   Toggle virtual participation.
    
-   Export full contest data (standings, submissions, clarifications).
    

The Admin Panel is the **primary home** for contest creation and management.

----------

## 12.8 System & Infra (Ops Console)

**Judge Nodes**

-   List judge nodes, with:
    
    -   Host, region, revision, uptime.
        
    -   Current load, job queue stats.
        
    -   Recent errors.
        
-   Actions:
    
    -   Mark node as draining.
        
    -   Restart node (via orchestration hook).
        
    -   Take node out of rotation.
        

**Services health**

-   Status for:
    
    -   DB, cache, RabbitMQ, web, workers.
        
-   Latency charts:
    
    -   tRPC latencies (p50/p95 per router).
        
    -   DB query performance.
        
-   Error rate panels:
    
    -   By feature area (auth, judge, submissions, contests, etc.).
        

**Maintenance**

-   Toggle maintenance mode:
    
    -   Read-only mode (optional).
        
    -   User-facing banner with custom message.
        
-   Trigger:
    
    -   Cache invalidation.
        
    -   Search index rebuilds.
        
    -   Background migrations.
        
    -   Backups.
        

----------

## 12.9 Feature Flags, Experiments & Config

ADMIN can:

-   Create/edit/delete feature flags.
    
    -   Per-user, per-role, percentage rollout, per-region.
        
-   Toggle beta features:
    
    -   New editor version, new judge runners, new UI.
        
-   Configure environment/global settings:
    
    -   Max submissions per minute.
        
    -   Max contest participants.
        
    -   Timeouts for judge.
        
    -   Limits for proposals, discussions, trails.
        
-   Launch A/B tests:
    
    -   Define experiments, assign variants, view metrics.
        
-   Emergency kill switches:
    
    -   Turn off:
        
        -   Submissions altogether.
            
        -   New registrations.
            
        -   Discussions.
            
        -   Approach Trails.
            
        -   Contests.
            

This is the “feature control room”.

----------

## 12.10 Impersonation & Session Control (Become Anyone)

ADMIN can **become any user or role** at will.

**Capabilities:**

-   Select a user from Users view and click “Impersonate”.
    
-   Get dropped into the site as that user:
    
    -   See exactly what they see.
        
    -   Perform actions on their behalf (for debugging or support).
        
-   Exit impersonation back to admin context.
    

**Session management:**

-   View all active sessions per user.
    
-   Force sign-out per session, per device, or globally.
    
-   Mark certain sessions as “trusted” or “suspicious”.
    
-   See IP + UA hashes, approximate geo info.
    

Impersonation is logged (who impersonated whom and when).

----------

## 12.11 Audit Logs & Incidents

Even gods need audit logs.

Admin panel includes:

**Audit Logs**

-   Every sensitive action:
    
    -   Role changes.
        
    -   Bans, unbans.
        
    -   Content deletions/edits.
        
    -   Contest configuration changes.
        
    -   Rejudges.
        
    -   Feature flag changes.
        
    -   System maintenance actions.
        
    -   Impersonation start/stop.
        
-   Search filters:
    
    -   by admin, by time, by resource, by action.
        
-   Export log snapshots.
    

**Incidents**

-   Incident creation:
    
    -   Tag as SEV-1/2/3, etc.
        
    -   Link related errors/logs.
        
-   Timeline:
    
    -   Who did what during an incident.
        
-   Resolution notes:
    
    -   Document root cause + fix.
        

----------

## 12.12 tRPC Surface (Conceptual, Admin Only)

Admin routes live under `admin.*` and `system.*` namespaces, e.g.:

-   `admin.users.*` — search, updateRole, ban, shadowBan, revokeSessions, impersonate.
    
-   `admin.problems.*` — state changes, version management, test control.
    
-   `admin.submissions.*` — inspect, rejudge*, hide, export.
    
-   `admin.discussions.*` — mass moderation, overrides.
    
-   `admin.contests.*` — all contest management from Section 11.
    
-   `admin.flags.*` — feature flags & experiments.
    
-   `admin.system.*` — maintenance mode, nodes, queues, migrations, backups.
    
-   `admin.audit.*` — retrieve audit entries, incidents.
    
-   `admin.impersonation.*` — start/stop impersonate.
    

All guarded with **`roleRequired(ADMIN)`** middleware.

----------

## 12.13 Observability & Oncall Tools

**Metrics**

-   Queue depth, success/failure rates per queue.
    
-   Judge latency per language.
    
-   Error rates per feature.
    
-   DB slow queries.
    
-   Request latency per tRPC router.
    

**Logs**

-   Structured logs accessible by filters:
    
    -   by user id
        
    -   by problem id
        
    -   by contest id
        
    -   by node id
        
-   Log drilldown from UI:
    
    -   Click a failing job → see log slice around it.
        

**Config flags**

-   Maintenance mode toggles.
    
-   Rate-limit multipliers.
    
-   Emergency “slow everything down gracefully” slider.
    

**Oncall experience**

-   Overview page with:
    
    -   Red/green panels.
        
    -   Top exceptions list.
        
    -   Recent deployments.
        
    -   Active incidents.
        

----------

## 12.14 Definition of Done (Admin Panel, God Mode)

-   Only `ADMIN` can access `/admin` and `admin.*` tRPC routes.
    
-   ADMIN can **view and modify everything**: users, roles, problems, submissions, discussions, contests, trails, system config.
    
-   Impersonation works smoothly and is fully audit-logged.
    
-   Oncall can:
    
    -   Diagnose spikes.
        
    -   Rejudge safely.
        
    -   Pause/restore judge system.
        
    -   Toggle maintenance mode.
        
-   Feature flags and configs are fully manageable via UI.
    
-   All dangerous actions are visible in audit logs with clear attribution.
    
-   The Admin Panel is performant, stable, and consistent with overall UI (calm, clear, minimal but powerful).