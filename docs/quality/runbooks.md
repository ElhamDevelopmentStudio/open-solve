# On-Call Runbooks — Phase 13

## Judge Stuck
1. Check Prometheus via `/api/internal/metrics` (look at `opensolve_judge_queue_messages`).
2. If `submissions` queue depth > 0 and no workers are consuming, run `npm run judge:worker` locally or restart the worker container.
3. Inspect RabbitMQ dashboard (or `docker compose logs rabbitmq`) for channel errors.
4. Trigger a manual drain by posting to `/app/api/internal/submission-events` with the worker token to fan-out stale submission updates.
5. If messages continue failing, promote `submission.status` to `RETRYING` via the Admin Panel and notify #ops.

## Database Slow
1. Watch `opensolve_contests_running_total` to confirm load.
2. Tail Postgres slow-query log or run `SELECT * FROM pg_stat_activity WHERE state='active' ORDER BY query_start;`.
3. Kill obvious runaway queries and block background leaderboard rebuilds.
4. If the primary is saturated, fail over to the hot standby and rerun migrations via `npm run db:migrate:deploy`.
5. Document the incident in the Admin Panel → Incidents.

## Outage / Maintenance Mode
1. Use the Admin Panel toggle for maintenance (Section 12). This returns HTTP 503 with a friendly banner.
2. Broadcast via Discussions or email (Resend webhook already wired) telling users about the outage.
3. Freeze all active contests (`ContestState` → `ARCHIVED` is forbidden; use the freeze action).
4. Pause submissions by disabling the judge worker and locking the submissions page via Feature Flag `submissions.readonly`.
5. After remediation, unfreeze contests, re-enable judge, and attach a root cause + fix in the incident timeline.

## Account Deletion Requests (Legal/BYOC)
1. Use Admin Panel → Users → "Purge" (new Phase 13 action) to hard-delete a `DELETED` tombstone when legal requests demand it.
2. Verify `User.status = DELETED` for the target account before purging.
3. Confirm `AuthAuditLog` rows no longer reference that user (`userId` becomes `NULL`).

## Metrics Cheatsheet
- Endpoint: `GET /api/internal/metrics` with `Authorization: Bearer $METRICS_ACCESS_TOKEN` (if configured).
- Key metrics:
  - `opensolve_trpc_duration_seconds` histogram (P50/P95/P99 per procedure).
  - `opensolve_judge_queue_messages` gauge (queue depth).
  - `opensolve_submission_events_total` counter (enqueued / processed / failed).
  - `opensolve_contests_running_total` gauge (live contests) and `opensolve_contests_frozen_total` (freeze).
  - `opensolve_judge_worker_failures_total` counter.
