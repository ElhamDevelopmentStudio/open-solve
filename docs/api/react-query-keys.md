# React Query Key Registry

> All cache keys are normalized to the `['trpc', '<namespace.procedure>', stableHash(input?)]` shape.
> Internally tRPC still stores keys as `[ ['namespace','procedure'], { input }]`; we always build the
> canonical representation through the helpers in `lib/react-query/keys.ts` before interacting with
> the cache. This keeps our invalidation logic declarative while remaining compatible with tRPC’s
> storage format.

| Procedure (tRPC)            | Query Key Example                                                      | Lifetime (`staleTime/gcTime`) | Invalidated By                                                                      | Infinite     |
| --------------------------- | ---------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- | ------------ |
| `auth.getSession`           | `['trpc','auth.getSession']`                                           | `10s / 5m`                    | `invalidateAuthSession()` → any auth mutation (sign-in/out, profile/email/password) | No           |
| `auth.getSessions`          | `['trpc','auth.getSessions']`                                          | `5s / 60s`                    | `invalidateAuthSession()` + explicit session revocations                            | No           |
| `problems.list`             | `['trpc','problems.list', stableHash(filters)]`                        | `5m / 30m`                    | `invalidateTags(['problems'])` → publish/unpublish, filter edits                    | Yes (future) |
| `problems.detail`           | `['trpc','problems.detail', slug]`                                     | `5m / 30m`                    | `invalidateTags(['problems','problemDetail'])` after curator publish or slug change | No           |
| `problems.filterMetadata`   | `['trpc','problems.filterMetadata']`                                   | `5m / 30m`                    | `invalidateTags(['tags'])` or any curator publish that changes taxonomy             | No           |
| `staff.problems.list`       | `['trpc','staff.problems.list']`                                       | `30s / 5m`                    | `invalidateTags(['staffProblems'])` whenever drafts change                          | No           |
| `staff.problems.get`        | `['trpc','staff.problems.get', problemId]`                             | `30s / 5m`                    | `invalidateTags(['staffProblems'])` on any save/transition                          | No           |
| `proposals.listMine`        | `['trpc','proposals.listMine']`                                        | `30s / 5m`                    | `invalidateTags(['proposals'])` on submit/update                                    | No           |
| `proposals.staffList`       | `['trpc','proposals.staffList', status?]`                              | `30s / 5m`                    | `invalidateTags(['proposals'])` whenever staff updates statuses or comments         | No           |
| `submissions.get`           | `['trpc','submissions.get', submissionId]`                             | `0s / 1m`                     | `invalidateTags(['submissions'])` after new submission or status change             | No           |
| `submissions.listMine`      | `['trpc','submissions.listMine', filters,'infinite']`                  | `15s / 2m`                    | `invalidateTags(['submissions'])` on create/resubmit/share changes                  | Yes          |
| `submissions.listByProblem` | `['trpc','submissions.listByProblem', slug,'infinite']`                | `15s / 2m`                    | `invalidateTags(['submissions'])` on create/resubmit/share changes                  | Yes          |
| `submissions.getShare`      | `['trpc','submissions.getShare', publicId]`                            | `0s / 5m`                     | Automatic via share enable/disable                                                  | No           |
| `submissions.filters`       | `['trpc','submissions.filters']`                                       | `5m / 30m`                    | `invalidateTags(['submissions'])` when attempts change                              | No           |
| `submissions.getDrafts`     | `['trpc','submissions.getDrafts', key]`                                | `0s / 10m`                    | `invalidateTags(['submissionDrafts'])` on save/delete                               | No           |
| `profile.detail`            | `['trpc','profile.detail', handle]`                                    | `5m / 30m`                    | `invalidateTags(['profile'])` after profile edits                                   | No           |
| `leaderboard.overview`      | `['trpc','leaderboard.overview']`                                      | `60s / 5m (30s refetch)`      | `invalidateTags(['leaderboard'])` when stats recompute                              | No           |
| `leaderboard.global`        | `['trpc','leaderboard.global', stableHash(params),'infinite']`         | `60s / 5m (30s refetch)`      | `invalidateTags(['leaderboard'])` or contest rating updates                         | Yes          |
| `leaderboard.difficulty`    | `['trpc','leaderboard.difficulty', stableHash(params),'infinite']`     | `60s / 5m (30s refetch)`      | `invalidateTags(['leaderboard'])`                                                   | Yes          |
| `leaderboard.tag`           | `['trpc','leaderboard.tag', stableHash(params),'infinite']`            | `60s / 5m (30s refetch)`      | `invalidateTags(['leaderboard'])`                                                   | Yes          |
| `discussions.listByProblem` | `['trpc','discussions.listByProblem', stableHash(filters),'infinite']` | `30s / 10m`                   | `invalidateTags(['discussions'])` on new thread/vote/report                         | Yes          |
| `discussions.listGlobal`    | `['trpc','discussions.listGlobal', stableHash(filters),'infinite']`    | `30s / 10m`                   | `invalidateTags(['discussions'])`                                                   | Yes          |
| `discussions.thread`        | `['trpc','discussions.thread', threadId]`                              | `30s / 10m`                   | `invalidateTags(['discussions'])` or targeted invalidation                          | No           |
| `discussions.replies`       | `['trpc','discussions.replies', threadId,'infinite']`                  | `30s / 10m`                   | `invalidateTags(['discussions'])`                                                   | Yes          |
| `editorials.getByProblem`   | `['trpc','editorials.getByProblem', slug]`                             | `5m / 30m`                    | `invalidateTags(['editorials'])` after release schedule updates                     | No           |
| `trails.getForProblem`      | `['trpc','trails.getForProblem', problemId]`                           | `30s / 10m`                   | `invalidateTags(['trails'])` after new insight submissions                          | No           |
| `contests.overview`         | `['trpc','contests.overview']`                                         | `60s / 10m`                   | `invalidateTags(['contests'])` on registration or schedule change                   | No           |
| `contests.detail`           | `['trpc','contests.detail', slug]`                                     | `15s / 5m`                    | `invalidateTags(['contests'])` on registration, settings, staff edits               | No           |
| `contests.standings`        | `['trpc','contests.standings', stableHash(params),'infinite']`         | `0s / 5m (15s refetch)`       | `invalidateTags(['contests'])` or judge events                                      | Yes          |
| `contests.clarifications`   | `['trpc','contests.clarifications', contestId]`                        | `30s / 5m`                    | `invalidateTags(['contests'])` after clarification answer/submit                    | No           |
| `admin.dashboard.overview`  | `['trpc','admin.dashboard.overview']`                                  | `30s / 5m`                    | Manual admin refresh or system events                                               | No           |
| `admin.users.list`          | `['trpc','admin.users.list', stableHash(filters)]`                     | `30s / 5m`                    | Admin mutations touching users                                                      | No           |
| `admin.users.detail`        | `['trpc','admin.users.detail', userId]`                                | `30s / 5m`                    | Admin user edit/delete                                                              | No           |
| `admin.problems.list`       | `['trpc','admin.problems.list', stableHash(filters)]`                  | `30s / 5m`                    | Admin problem edits                                                                 | No           |
| `admin.submissions.list`    | `['trpc','admin.submissions.list', stableHash(filters)]`               | `30s / 5m`                    | Admin actions / judge events                                                        | No           |
| `admin.system.overview`     | `['trpc','admin.system.overview']`                                     | `30s / 5m`                    | System health updates                                                               | No           |
| `admin.flags.list`          | `['trpc','admin.flags.list']`                                          | `30s / 5m`                    | Moderation actions                                                                  | No           |
| `admin.audit.logs`          | `['trpc','admin.audit.logs', stableHash(filters)]`                     | `30s / 5m`                    | New audit log entries                                                               | No           |
| `admin.audit.incidents`     | `['trpc','admin.audit.incidents']`                                     | `30s / 5m`                    | Incident status changes                                                             | No           |

## Mutation → Invalidation Matrix

| Mutation                                                                             | Invalidation Helper / Target Keys                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `auth.updateProfile`, `auth.changeEmail`, `auth.changePassword`, 2FA enable/disable  | `invalidateAuthSession()` (flush `auth.getSession` + `auth.getSessions`)       |
| `auth.signIn`, `auth.verifyTwoFactor`, `auth.signUp`                                 | `invalidateAuthSession()` (ensures UI picks up the fresh session)              |
| `auth.signOutAllDevices`, `auth.revokeSession`                                       | `invalidateAuthSession()` (refetch session + device roster)                    |
| Future curator publish (`problems.publish`)                                          | `invalidateTags(['problems','tags','staffProblems'])` (list + metadata caches) |
| `staff.problems.saveContent`, `saveMetadata`, `updateTests`                          | `invalidateTags(['staffProblems'])`                                            |
| `staff.problems.submitForReview`, `approve`, `publish`, `archive`                    | `invalidateTags(['staffProblems','problems'])`                                 |
| `proposals.submit`, `proposals.comment`                                              | `invalidateTags(['proposals'])`                                                |
| `proposals.staffUpdateStatus`, `proposals.convertToDraft`                            | `invalidateTags(['proposals','staffProblems'])`                                |
| `submissions.create`, `submissions.resubmit`, judge events                           | `invalidateTags(['submissions'])`                                              |
| `submissions.shareEnable`, `submissions.shareDisable`, `submissions.hideFromProfile` | `invalidateTags(['submissions'])`                                              |
| `submissions.saveDraft`, `submissions.getDrafts`                                     | `invalidateTags(['submissionDrafts'])`                                         |
| `discussions.create`, `discussions.reply`, `discussions.vote`                        | `invalidateTags(['discussions'])`                                              |
| `contests.register`, `contests.unregister`                                           | `invalidateTags(['contests'])`                                                 |
| `contests.submitClarification`, staff responses                                      | `invalidateTags(['contests'])`                                                 |
| `trails.createInsight`, `trails.vote`                                                | `invalidateTags(['trails'])`                                                   |
| Rating sync / judge score updates                                                    | `invalidateTags(['leaderboard'])`                                              |

## Notes

- The helper `buildTrpcQueryKey(procedure, { input, type })` mirrors the exact array shape that
  tRPC uses under the hood. Server-side prefetch + hydration always rely on this helper to avoid
  double-fetching during SSR/ISR.
- `queryTagMap` in `lib/react-query/keys.ts` centralizes high-level invalidation groups
  (`'problems'`, `'tags'`, `'session'`, etc.). Use `invalidateTags(queryClient, ['session'])` when a
  mutation naturally affects a whole group of procedures.
- Infinite queries tack on `'infinite'` as the final segment (e.g.,
  `['trpc','problems.list', stableHash(filters), 'infinite']`). The helper already handles this shape.
- Public problem list/detail/filter metadata are also cached at the Next.js layer via `unstable_cache`
  with cache tags such as `problem:list`, `problem:<slug>`, `tag:<slug>`, and `difficulty:<code>`.
  Staff publish/archive flows call `revalidateTag` to keep those server caches in sync with the TRPC
  cache.
