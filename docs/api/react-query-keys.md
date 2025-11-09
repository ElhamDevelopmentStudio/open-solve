# React Query Key Registry

> All cache keys are normalized to the `['trpc', '<namespace.procedure>', stableHash(input?)]` shape.
> Internally tRPC still stores keys as `[ ['namespace','procedure'], { input }]`; we always build the
> canonical representation through the helpers in `lib/react-query/keys.ts` before interacting with
> the cache. This keeps our invalidation logic declarative while remaining compatible with tRPC’s
> storage format.

| Procedure (tRPC)          | Query Key Example                               | Lifetime (`staleTime/gcTime`) | Invalidated By                                                                      | Infinite     |
| ------------------------- | ----------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- | ------------ |
| `auth.getSession`         | `['trpc','auth.getSession']`                    | `10s / 5m`                    | `invalidateAuthSession()` → any auth mutation (sign-in/out, profile/email/password) | No           |
| `auth.getSessions`        | `['trpc','auth.getSessions']`                   | `5s / 60s`                    | `invalidateAuthSession()` + explicit session revocations                            | No           |
| `problems.list`           | `['trpc','problems.list', stableHash(filters)]` | `5m / 30m`                    | `invalidateTags(['problems'])` → publish/unpublish, filter edits                    | Yes (future) |
| `problems.detail`         | `['trpc','problems.detail', slug]`              | `5m / 30m`                    | `invalidateTags(['problems','problemDetail'])` after curator publish or slug change | No           |
| `problems.filterMetadata` | `['trpc','problems.filterMetadata']`            | `5m / 30m`                    | `invalidateTags(['tags'])` or any curator publish that changes taxonomy             | No           |
| `staff.problems.list`     | `['trpc','staff.problems.list']`                | `30s / 5m`                    | `invalidateTags(['staffProblems'])` whenever drafts change                          | No           |
| `staff.problems.get`      | `['trpc','staff.problems.get', problemId]`      | `30s / 5m`                    | `invalidateTags(['staffProblems'])` on any save/transition                          | No           |
| `proposals.listMine`      | `['trpc','proposals.listMine']`                 | `30s / 5m`                    | `invalidateTags(['proposals'])` on submit/update                                    | No           |
| `proposals.staffList`     | `['trpc','proposals.staffList', status?]`       | `30s / 5m`                    | `invalidateTags(['proposals'])` whenever staff updates statuses or comments         | No           |

## Mutation → Invalidation Matrix

| Mutation                                                                            | Invalidation Helper / Target Keys                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `auth.updateProfile`, `auth.changeEmail`, `auth.changePassword`, 2FA enable/disable | `invalidateAuthSession()` (flush `auth.getSession` + `auth.getSessions`)       |
| `auth.signIn`, `auth.verifyTwoFactor`, `auth.signUp`                                | `invalidateAuthSession()` (ensures UI picks up the fresh session)              |
| `auth.signOutAllDevices`, `auth.revokeSession`                                      | `invalidateAuthSession()` (refetch session + device roster)                    |
| Future curator publish (`problems.publish`)                                         | `invalidateTags(['problems','tags','staffProblems'])` (list + metadata caches) |
| `staff.problems.saveContent`, `saveMetadata`, `updateTests`                         | `invalidateTags(['staffProblems'])`                                            |
| `staff.problems.submitForReview`, `approve`, `publish`, `archive`                   | `invalidateTags(['staffProblems','problems'])`                                 |
| `proposals.submit`, `proposals.comment`                                             | `invalidateTags(['proposals'])`                                                |
| `proposals.staffUpdateStatus`, `proposals.convertToDraft`                           | `invalidateTags(['proposals','staffProblems'])`                                |

## Notes

- The helper `buildTrpcQueryKey(procedure, { input, type })` mirrors the exact array shape that
  tRPC uses under the hood. Server-side prefetch + hydration always rely on this helper to avoid
  double-fetching during SSR/ISR.
- `queryTagMap` in `lib/react-query/keys.ts` centralizes high-level invalidation groups
  (`'problems'`, `'tags'`, `'session'`, etc.). Use `invalidateTags(queryClient, ['session'])` when a
  mutation naturally affects a whole group of procedures.
- Infinite queries tack on `'infinite'` as the final segment (e.g.,
  `['trpc','problems.list', stableHash(filters), 'infinite']`). The helper already handles this shape.
