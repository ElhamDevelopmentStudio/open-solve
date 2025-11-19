# Core Entity Catalog

Each record inherits the common audit columns (`createdAt`, `updatedAt`, `createdById`, `updatedById`, `deletedAt`). IDs are ULIDs via `cuid()`.

## User & Profile Tables

- **User** — Auth + public profile surface.
  - Key fields: `email`, `handle` (unique), `role` (`user|problem_curator|moderator|admin`), `status` (`active|banned|shadow_banned`), `bio`, `country`, `timezone`.
  - Relations: `submissions`, `createdProblems` (author), `discussions`, `votes`, `badgeAwards`, `contestRegistrations`, `leaderboardEntries`, `stats`.
  - Indexes: `handle`, composite `(status, role)`.
  - Notes: `deletedAt` supports GDPR-style retention; `shadow_banned` status gates content in queries.
- **UserStats** — Materialized aggregates for profiles/leaderboards.
  - Fields: `totalSolved`, `solvedEasy/Medium/Hard`, `streakCount`, `firstAcAt`, `lastAcAt`, `languagesUsed[]`.
  - 1:1 with `User` (`userId` PK).

## Reference Data

- **Difficulty** — Configurable weights (`code`, `weight`, `description`). Linked via `Problem.difficultyId`.
- **Language** — Judge capabilities per runtime (`code`, `compileCmd`, `runCmd`, `timeMultiplier`, `memoryCeilingMb`, `isEnabled`, `sandboxProfile`). Referenced by `Submission.languageCode`.
- **Verdict** — Final states (`AC|WA|TLE|MLE|RE|CE`) with ordering metadata. Referenced by `Submission` and `SubmissionCaseResult`.
- **Tag / TagStats** — Taxonomy + aggregates (`problemCount`, `solvedByCount`).
- **Company / CompanyStats** — Branding filters + optional counts.
- **Badge** — Award definitions (`slug`, `criteria` JSON, `isHidden`).

## Problem Authoring

- **Problem** — Identity + publish lifecycle.
  - Fields: `slug`, `state` (`draft|review|published|archived`), `visibility` (`public|unlisted|internal`), `authorId`, `difficultyId`, `currentVersionId`.
  - Judge fields: `judgeMode` (`AUTO|MANUAL|HYBRID`) controls how submissions are routed.
  - Relations: `versions`, `tags` (via `ProblemTag`), `companies` (via `ProblemCompany`), `stats`, `submissions`, `discussions`, `contestProblems`.
  - Indexes: `(state, visibility, difficultyId, createdAt)` for library queries.
  - Invariants: published rows require `currentVersionId` + difficulty.
- **ProblemVersion** — Immutable content snapshots per iteration.
  - Fields: `versionNumber`, `title`, `statement`, `constraints`, `hints`, `editorial`, `samples` JSON, `dataHash`.
  - Relations: `testCases`, `submissions`, `contestUsages`.
  - Indexes: unique `(problemId, versionNumber)` + `dataHash` for cache busting.
- **TestCase** — Version-scoped IO metadata.
  - Fields: `kind` (`sample|hidden`), `ordinal`, `inputBlobRef`, `outputBlobRef`, optional inlined `inputData`/`outputData`, `checksum`, `timeLimitMs`, `memoryLimitMb`, `strength` (partial scoring weight; samples are always `0`).
  - Index: `(problemVersionId, kind, ordinal)` preserves stable ordering.
- **ProblemTag / ProblemCompany** — M:N bridges with soft delete for audit (composite PKs `(problemId, tagId)` / `(problemId, companyId)`).
- **ProblemStats** — Denormalized counters (`acceptedCount`, `submissionCount`, `favoriteCount`, `acceptanceRate`).

## Judge & Submissions

- **Submission** — Attempts tracked from queueing to completion.
  - Fields: `status` (`queued|running|succeeded|failed|retrying|manual_pending`), `verdictCode`, `languageCode`, `sourceCodeRef`, `codeHash`, lifecycle timestamps, resource usage, `contestId?`.
  - Manual review: `requiresManualReview`, `manualReviewerId`, `manualReviewedAt`, `manualNotes`, `manualScore`, `manualDueAt`.
  - Indexes: `(userId, problemId, createdAt)`, `(problemId, verdictCode, createdAt)`, `codeHash` for duplicate detection.
  - Relations: `caseResults`, `contest`, `problemVersion`, `language`, `verdict`.
- **SubmissionCaseResult** — Per-test diagnostics (composite unique `(submissionId, testOrdinal)`).

## Discussions & Social

- **Discussion** — Thread + reply tree per problem.
  - Fields: `parentId` (self FK), `state` (`visible|hidden|removed`), `score`, `isPinned`, `editedAt`.
  - Indexes: `(problemId, parentId)` for threading, `(problemId, score, createdAt)` for ranking.
- **Vote** — Unique `(discussionId, userId)` with `value` `+1|-1`.
- **BadgeAward** — Unique `(badgeId, userId)` with `source` (`system|admin|contest`).

## Contests & Leaderboards

- **Contest** — Timed events.
  - Fields: `slug`, `name`, `state` (`upcoming|running|finished|archived`), `visibility`, `startsAt/endsAt`, `freezeAt`, `rules` (`ICPC|CF`), `isRated`, `editorialReleaseAt`.
  - Relations: `problems` (`ContestProblem`), `registrations`, `submissions`.
  - Index: `(state, startsAt)` for scheduling views.
- **ContestProblem** — Ordered mapping of frozen versions (unique `(contestId, order)` and `(contestId, problemId)`).
- **ContestRegistration** — Unique `(contestId, userId)` with `isVirtual` flag.
- **LeaderboardSnapshot** — Precomputed windows (`window`, `periodStart`, `periodEnd`). Unique `(window, periodStart)`.
- **LeaderboardEntry** — Child rows with `rank`, `score`, `solved`, optional `timePenalty`; unique `(snapshotId, rank)` + `(snapshotId, userId)`.
