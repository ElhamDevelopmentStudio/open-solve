# 2) Core Data Model (Domain) — Detailed Plan

## 2.0 Design principles (apply to every table)

- **IDs:** ULID/UUID (non-guessable, sortable if ULID). Never expose numeric autoincrements.
- **Common columns:** `id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt` (soft-delete). PII tables also include a `hardDeletedAt` path.
- **Slugs &amp; names:** Lowercase, hyphenated slugs; unique per scope (e.g., `problem.slug` unique).
- **States:** Use explicit enums for lifecycle (e.g., `draft|review|published|archived`).
- **Ownership &amp; audit:** `createdBy/updatedBy` always set; sensitive changes logged (in your AuditLog from Auth).
- **Privacy:** Separate PII from public/analytic data where feasible; **hard delete** PII on account deletion.
- **Indexes:** Plan them where noted; add composite indexes for frequent filters; avoid unbounded text search without search infra.
- **Versioning:** Immutable versions (`ProblemVersion`) plus a pointer from `Problem` to “current” version.

---

## 2.1 Users (domain-layer profile; auth is separate)

> Auth tables (Credential/Session/RecoveryCode) exist in the Auth section. This is the **public/user-facing profile** side.

- **Purpose:** Public handle & stats; safe to expose in profiles/leaderboards.
- **Key fields:**
  - `handle` (unique, canonical, 3–32 chars)
  - `displayName`, `avatarUrl` (optional), `country`, `timezone`
  - `role` (`user|problem_curator|moderator|admin`)
  - `status` (`active|banned|shadow_banned`)
  - `bio` (short markdown, sanitized)

- **Relations:** `UserStats` 1:1, `Submission` 1:N, `Discussion` 1:N, `Vote` 1:N, `BadgeAward` 1:N.
- **Indexes:** `handle` unique; (`status`,`role`) for admin screens.
- **Invariants:** `handle` immutable after claim (admins can force-rename with audit). Shadow-banned users see their own posts but others don’t (enforced in queries).

**UserStats (materialized/derived):**

- `totalSolved`, `solvedEasy/Medium/Hard`, `streakCount`, `firstAcAt`, `lastAcAt`, `languagesUsed[]`.
- Recompute incrementally on submission verdict transitions; store small aggregates for speed.

**PII split (if you want stricter privacy):** Optional `UserPII` table (userId, email, name) with strict access and **hard delete** on account deletion.

---

## 2.2 Problems & Versions

**Problem (identity + publication state):**

- `slug` (unique), `state` (`draft|review|published|archived`), `visibility` (`public|unlisted|internal`), `currentVersionId` (nullable until published), `difficultyId`, `authorId`.
- **Relations:** M:N with `Tag`; optional M:N with `Company`.
- **Invariants:**
  - Published problems **must** have `currentVersionId`.
  - `slug` stable post-publish (changes require redirect mapping).
  - Difficulty cannot be null at publish time.

**ProblemVersion (immutable content snapshots):**

- `problemId`, `versionNumber` (1..n), `title`, `statement` (markdown + KaTeX), `constraints`, `hints` (optional), `editorial` (staff-only), `samples[]` (structured), `dataHash` (for cache busting).
- **Relations:** `TestCase` (1:N; each test case belongs to a specific version).
- **Invariants:**
  - No edits after creation; create a new version instead.
  - Only **one** ProblemVersion is pointed to by `Problem.currentVersionId`.

**Tag (taxonomy):**

- `name` (unique), `slug`, `category` (e.g., `algorithm|data_structure|pattern`), `isFeatured` (bool).
- **Relations:** M:N `ProblemTag` join.
- **Invariants:** Tag names normalized; category optional but recommended for UX filters.

**Difficulty (reference):**

- Enum rows: `Easy|Medium|Hard` (you can extend to `Intro|Expert` later).
- Keep a `weight` column (e.g., 800/1400/2000) for scoring and sorting.

**Company (optional):**

- `name`, `slug`, `isHidden` (for internal tagging), optional logo URL.
- Use only if you want “Asked at X” style filters.

**Indexes:**

- Problem: unique `slug`; (`state`,`visibility`,`difficultyId`,`createdAt`) cover library views.
- ProblemTag: (`tagId`,`problemId`) unique composite.
- ProblemVersion: (`problemId`,`versionNumber`) unique; `dataHash` index for cache invalidation.

---

## 2.3 Test Cases (per version)

- **Fields:** `problemVersionId`, `kind` (`sample|hidden`), `ordinal` (stable order), `inputBlobRef`, `outputBlobRef`, `timeLimitMs`, `memoryLimitMb`, `strength` (hidden-case weight used for partial scoring; samples are always `0`).
- **Invariants:**
  - At least **one** `sample` test exists before publish.
  - `hidden` cases exist for judging; sealed from normal users.
  - Limits are per-language defaults but can be overridden per test if needed.

- **Storage:** Large inputs/outputs live in object storage; DB keeps opaque `BlobRef` + checksum for integrity.
- **Indexes:** (`problemVersionId`,`kind`,`ordinal`).

---

## 2.4 Languages (judge capabilities)

- **Fields:** `code` (`cpp17`, `python3`, `java17`, `node20`), `displayName`, `compileCmd`, `runCmd`, `timeMultiplier` (to normalize limits across languages), `memoryCeilingMb`, `fileExtension`, `isEnabled` (bool), `sandboxProfile` (name).
- **Invariants:**
  - At least 1 language enabled to publish problems.
  - `timeMultiplier` used to adjust raw limits (e.g., Python slower than C++).

- **Indexes:** `code` unique; `isEnabled` filter.

---

## 2.5 Submissions & Verdicts

**Submission (attempts)**

- **Fields:** `id`, `userId`, `problemId`, `languageCode`, `sourceCodeRef` (blob), `codeHash`, `queuedAt`, `startedAt`, `finishedAt`, `verdictId`, `score` (for contests/partial), `timeUsedMs`, `memoryUsedKb`, `judgeNodeId` (optional), `metadata` (JSON for diagnostics).
- **Relations:** 1:N `SubmissionCaseResult`.
- **Invariants:**
  - Immutable input: once enqueued, `languageCode`/`sourceCodeRef`/`problemId` don’t change.
  - Verdict transitions are monotonic: `PENDING→RUNNING→{AC|WA|TLE|MLE|RE|CE}`.

**SubmissionCaseResult**

- `submissionId`, `testOrdinal`, `status` (same verdict enum), `timeMs`, `memoryKb`, `stderrRef` (optional).
- Optional store **first failing case only** for performance (configurable per problem).

**Verdict (reference):**

- Enum rows: `AC`, `WA`, `TLE`, `MLE`, `RE`, `CE`.
- Keep a `rank` for ordering and a `isTerminal` flag.

**Indexes:**

- Submission: (`userId`,`problemId`,`createdAt`), (`problemId`,`verdictId`,`createdAt`), `codeHash` (for trivial duplicate detection).
- SubmissionCaseResult: (`submissionId`,`testOrdinal`) unique.

---

## 2.6 Discussions & Votes (per problem)

**Discussion (thread + replies)**

- **Fields:** `id`, `problemId`, `authorId`, `parentId` (null for top-level), `content` (markdown), `score` (denormalized), `state` (`visible|hidden|removed`), `isPinned` (bool), `editedAt`.
- **Invariants:**
  - `content` sanitized on write; scripts/iframes stripped.
  - Shadow-banned authors’ posts visible only to them + staff (query filter).

**Vote**

- `discussionId`, `userId`, `value` (`+1|-1`), `createdAt`.
- **Invariants:** Unique (`discussionId`,`userId`); changing vote updates `score`.

**Indexes:**

- Discussion: (`problemId`,`parentId`,`score DESC`,`createdAt DESC`).
- Vote: unique (`discussionId`,`userId`).

---

## 2.7 Badges & Awards

**Badge**

- `slug` (unique), `name`, `description`, `icon`, `criteria` (JSON; e.g., “solve 50 Medium”), `isHidden` (for secret/seasonal).

**BadgeAward**

- `badgeId`, `userId`, `awardedAt`, `source` (`system|admin|contest`), optional `metadata`.

**Invariants:** Same badge not awarded twice to same user. Index (`userId`,`badgeId`) unique.

---

## 2.8 Leaderboards & Snapshots

**LeaderboardSnapshot** (precomputed rankings to avoid heavy queries)

- **Fields:** `window` (`weekly|monthly|all_time|contest:<id>`), `periodStart`, `periodEnd` (null for all_time), `generatedAt`.
- **Child rows:** `LeaderboardEntry` → `snapshotId`, `rank`, `userId`, `score`, `solved`, `timePenalty` (ICPC style).
- **Invariants:** One snapshot per window/period; immutable after generation.

**Indexes:**

- Snapshot: (`window`,`periodStart`) unique.
- Entry: (`snapshotId`,`rank`) unique, (`snapshotId`,`userId`) unique.

---

## 2.9 Contests (Phase 2, but model now to avoid future migrations)

**Contest**

- `slug`, `name`, `state` (`upcoming|running|finished|archived`), `visibility` (`public|private`), `startsAt`, `endsAt`, `freezeAt` (optional), `rules` (`ICPC|CF`), `isRated` (bool), `editorialReleaseAt` (optional).
- **Invariants:** `startsAt < endsAt`; publishing locks problem pool.

**ContestProblem** (ordered mapping)

- `contestId`, `problemId`, `label` (e.g., A, B, C), `order`, `points` (for CF style), `versionId` (frozen version pointer).

**ContestRegistration**

- `contestId`, `userId`, `registeredAt`, `isVirtual` (optional).

**ContestSubmission** (optional view or table)

- Either reuse `Submission` with `contestId` fk (preferred), or maintain a strict table pointing to the canonical submission.

**Indexes:**

- Contest: `slug` unique; (`state`,`startsAt`).
- ContestProblem: (`contestId`,`order`) unique.
- Registration: unique (`contestId`,`userId`).

---

## 2.10 Analytics & Counters (denormalized helpers)

To keep pages snappy without expensive joins:

- **ProblemStats:** `problemId`, `acceptedCount`, `submissionCount`, `acceptanceRate` (derived), `favoriteCount` (if you add favorites). Update via lightweight workers.
- **TagStats:** `tagId`, `problemCount`, `solvedByUserCount` (optional).
- **CompanyStats:** optional.

All stats are **eventually consistent**; never block user flows on them.

---

## 2.11 Soft delete vs hard delete (what to delete where)

- **Soft delete (set** **`deletedAt`** **)** : Problems, Versions, Discussions, Submissions (retain for audit/anti-cheat), Tags (rare).
- **Hard delete (actually remove rows)** : PII (UserPII), Credentials, Sessions, Recovery Codes, any email tokens (auth domain).
- **Cascade strategy:**
  - Deleting `Problem` → keep versions & submissions (historical), but hide from public (treat as archived).
  - Deleting `User` → scrub PII, keep `Submission` and `Discussion` as “Deleted User” (or anonymize with a tombstone id), unless legal requires full purge.

---

## 2.12 Data Integrity & Business Rules (must enforce)

- A `Problem` can be **published** only if:
  - has a `currentVersionId` with non-empty `title` and `statement`,
  - at least 1 `sample` and 1 `hidden` test,
  - `difficultyId` set,
  - at least 1 language enabled globally (or per problem override is valid).

- A `Submission` can be **judged** only if:
  - the target `Problem.state = published`,
  - `Language.isEnabled = true`,
  - code size under per-language limit (enforced in worker).

- A `Discussion` with `parentId` must reference a top-level thread or a chain under the same `problemId` (no cross-problem links).
- `BadgeAward` issued only when criteria satisfied; retally jobs idempotent.

---

## 2.13 Indexing plan (quick reference)

- **Hot reads:**
  - Problems listing: index by (`state`,`visibility`,`difficultyId`,`createdAt DESC`).
  - Problem by slug: unique `slug`.
  - Submissions by user/problem: (`userId`,`problemId`,`createdAt DESC`).
  - Submissions verdict filter: (`problemId`,`verdictId`,`createdAt DESC`).
  - Discussions per problem: (`problemId`,`parentId`,`score DESC`,`createdAt DESC`).
  - Tags: unique `slug`; join index on `ProblemTag(tagId, problemId)`.

- **Background jobs:**
  - Leaderboards by period: (`window`,`periodStart`).
  - Badges: (`userId`) for quick user badge lookups.

---

## 2.14 Seeding & Fixtures (what to populate first)

- **Users:** 1 admin, 2 curators, 3 normal users (varied handles).
- **Difficulties:** Easy/Medium/Hard with weights.
- **Languages:** `cpp17`, `python3`, `java17`, `node20` (enabled).
- **Tags:** \~25 core tags (arrays, strings, hashing, dp, graphs, trees, greedy, math, geometry, bitmask, etc.).
- **Problems:** 15–30 mixed difficulty with full sample + hidden cases; at least one with larger IO to validate blob storage.
- **Badges:** “First AC”, “10 Solves”, “Streak 7”.
- **Contest (dummy):** One 90-minute unrated with 3 problems for pipeline testing.
- **Company (optional):** 10 popular names; default hidden.

---

## 2.15 Documentation deliverables (hand to devs)

- **Entity Catalog** (one page): For each entity → purpose, fields (1-line each), relations, states, invariants, primary indexes.
- **ER Overview** (diagram or text map):

  ```
  Problem 1—N ProblemVersion 1—N TestCase
  Problem M—N Tag
  Problem 1—N Submission N—1 User
  Submission 1—N SubmissionCaseResult
  Problem 1—N Discussion (self N—1 via parentId)
  Discussion 1—N Vote N—1 User
  User 1—N BadgeAward N—1 Badge
  Contest 1—N ContestProblem N—1 Problem
  Contest 1—N ContestRegistration N—1 User
  LeaderboardSnapshot 1—N LeaderboardEntry N—1 User
  ```

- **State Machine Notes:** Problem (draft→review→published→archived), Contest (upcoming→running→finished→archived), Submission (pending→running→terminal).

---

## 2.16 “Unique twists” (optional but nice)

- **Immutable Public Versioning:** Public problem pages display a **content hash** (short) so users can cite exactly which version they solved.
- **Reproducibility Token:** Store a `runnerImageDigest` and `languageVersion` with each Submission so rejudging is provably consistent.
- **Partial Scoring Ready:** Include `strength` on TestCase and `score` on Submission now; even if you don’t expose it yet, future contests/IOI-style problems become easy.
- **Slug Redirects:** Maintain a small `Redirect` table for renamed slugs to preserve SEO and shared links.
- **Anonymized Analytics:** A tiny `ProblemView` table keyed by **daily bucket** + problemId with a salted anon cookie, so you get traffic insights without PII.

---

## 2.17 DoD (Definition of Done) for “Core Data Model”

- [ ] Entity Catalog approved; naming + enums frozen.
- [ ] All tables include common columns and **soft-delete** where specified; PII tables flagged for **hard delete**.
- [ ] Index plan implemented; `EXPLAIN` on hot queries clean.
- [ ] Publication, Submission, and Discussion invariants enforced at DB or service layer.
- [ ] Seed data loaded; fixture users/problems pass through the whole flow (read → submit → judge → verdict).
- [ ] Migration scripts reviewed and **reversible**.
- [ ] Documentation stored in `/docs/domain/` with a one-pager ER overview.
