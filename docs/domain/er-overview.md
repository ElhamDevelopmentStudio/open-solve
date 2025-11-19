# ER Overview

```
User 1─1 UserStats
User 1─N Submission 1─N SubmissionCaseResult
Submission N─1 Problem • Submission N─1 Language • Submission N─1 Verdict
Problem 1─N ProblemVersion 1─N TestCase
Problem M─N Tag (via ProblemTag)
Problem M─N Company (via ProblemCompany)
Problem 1─N Discussion (self-referencing via parentId)
Discussion 1─N Vote N─1 User
Problem 1─N ContestProblem N─1 Contest
Contest 1─N ContestRegistration N─1 User
LeaderboardSnapshot 1─N LeaderboardEntry N─1 User
Badge 1─N BadgeAward N─1 User
```

## Narrative Walkthrough

1. **Users & Profiles** — `User` owns login/role state while `UserStats` stores precomputed aggregates. Users produce `Submissions`, author `Problems`, start `Discussions`, cast `Votes`, register for `Contests`, receive `BadgeAwards`, and appear inside `LeaderboardEntry` snapshots.
2. **Problem Authoring** — `Problem` captures lifecycle/publishing details. Every edit creates a new immutable `ProblemVersion`, which in turn owns ordered `TestCase` rows. Taxonomy and branding layers attach through `ProblemTag` and `ProblemCompany`. Aggregated usage data lives inside `ProblemStats`, `TagStats`, and `CompanyStats`.
3. **Judge Pipeline** — `Submission` ties a user + problem + language (+ optional contest) with status timestamps and verdict metadata. Each test evaluation is stored in `SubmissionCaseResult` for debugging. Verdict vocabulary is normalized in the `Verdict` table, and languages are managed in `Language`.
4. **Community Layer** — `Discussion` supports threaded conversations per problem, with moderation state and denormalized scores. `Vote` enforces a unique user vote per discussion node. Badging relies on the `Badge` ↔ `BadgeAward` pairing for public recognition.
5. **Competitive Play & Reporting** — `Contest` orchestrates scheduled events; `ContestProblem` freezes versions per slot, and `ContestRegistration` tracks participants/virtual runs. Precomputed standings are stored via `LeaderboardSnapshot` and `LeaderboardEntry`, letting the UI query windowed rankings without expensive joins.
