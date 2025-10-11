# State Machine Notes

## Problem Lifecycle

```
Draft → Review → Published → Archived
            ↘─────────────↗
```

- **Draft** — Authoring in progress. Only owners/curators can read. Versions can be created freely; `currentVersionId` may be null.
- **Review** — Editorial QA. Requires at least one `ProblemVersion`, complete taxonomy, and both sample + hidden `TestCase`s.
- **Published** — Public/approved content. Invariants: `currentVersionId` set, `difficultyId` present, `state=published` implies at least one enabled `Language` globally.
- **Archived** — Soft-deleted/retired. Submissions remain for audit; listings exclude archived rows unless explicitly requested.
- **Rollback** — Published → Review allowed for emergency fixes (requires curator role). Archived problems can be re-drafted by cloning a new slug/version.

## Contest Lifecycle

```
Upcoming → Running → Finished → Archived
```

- **Upcoming** — Visible schedule, permits registration edits. Problems + versions are locked to prevent accidental mutations.
- **Running** — Contest clock active. `freezeAt` controls visibility of live leaderboard columns. Registrations become read-only.
- **Finished** — Clock over; standings computed; editorial release can be triggered. Rejudges allowed but must emit invalidations for frozen results.
- **Archived** — Historical storage. Registrations/submissions kept for compliance, but contest hidden from default listings.

## Submission Execution Pipeline

```
Pending → Running → Completed
                ↘
                Failed
```

- **Pending** — In queue awaiting a judge slot. Only `queuedAt` is set.
- **Running** — Judge picked up the work. `startedAt` populated; telemetry begins.
- **Completed** — Terminal verdict recorded (`verdictCode` in `Verdict` table). Triggers stat increments, streak updates, badge checks.
- **Failed** — Infrastructure issue (MLE/TLE/RE/CE already terminal but still counted as completed). `status=FAILED` represents judge/node faults so the submission may be retried automatically.

State transitions are monotonic; any retry issues result in a brand new submission ID.
