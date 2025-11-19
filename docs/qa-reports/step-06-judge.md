# Step 06 – Judge Pipeline & Reliability Audit

_Date:_ <!-- keep updated -->  
_Scope:_ Verify submission enqueue → judge → realtime → manual-review flows, including degraded-mode handling (RabbitMQ outages, sandbox failures), UI polling, and ops observability.

## 1. Method
- Reviewed submission router (`lib/trpc/router/submissions.ts`), judge dispatch (`lib/judge/dispatcher.ts`), queue helpers (`lib/judge/queue.ts`), worker (`lib/judge/worker.ts`), sandbox execution (`lib/judge/sandbox.ts`), and inline fallback (`lib/judge/inline-runner.ts`).
- Inspected client polling hooks (`useSubmissionRealtime`, `notifySubmissionUpdate`, workspace + submission detail components) to see how verdict updates reach the UI.
- Cross-checked staff moderation tools (`lib/trpc/router/staff/judge.ts`, `components/staff/judge/*`) for manual queues, rejudge, and degraded states.
- Reviewed health checks (`lib/health.ts`) and observability (`lib/observability/metrics.ts`) for queue visibility.

## 2. Findings

### 2.1 Inline judge never notifies subscribers
- **Files:** `lib/judge/inline-runner.ts:1-94`, `lib/realtime/notifications.ts`
- When the RabbitMQ publish fails (queue down or not configured), the dispatcher invokes `runInlineJudge`. That code updates `submissions` rows and case results, and even enqueues manual review jobs, but it never calls `notifySubmissionUpdate`. The realtime websocket hub (`useSubmissionRealtime`) therefore never receives a signal, so the IDE keeps showing “Queued” until a manual refresh. In contrast, the RabbitMQ worker calls `notifySubmissionUpdate` after each status change.
- **Fix:** Add a `notifySubmissionUpdate(submission.id)` call after inline judge updates (successful or manual-only) so client polling behaves consistently during degraded mode.

### 2.2 RabbitMQ outage leaves submissions stuck without user feedback
- **Files:** `lib/judge/dispatcher.ts`, `components/problems/problem-workspace.tsx:360-420`
- When neither RabbitMQ nor inline judge is available (e.g., broker down and Docker sandbox missing), `publishSubmissionMessage` returns false, but the subsequent `runInlineJudge` may throw and the error is merely logged. The client still transitions to “submission queued…” with no indication that the job failed. There is no retry/rollback to revert the submission status back to `FAILED/RETRYING`, nor do we surface a toast advising the user to retry. Similarly, if RabbitMQ is disabled (no `JUDGE_RABBIT_URL`), `dispatcher` quietly invokes inline judge without warning operators that a critical component is missing.
- **Fix ideas:** 
  - Wrap inline fallback in try/catch and update the submission row (`status = RETRYING` + error note) plus toast/notification so the user knows the job failed.
  - Add a UI banner (or toast in `ProblemWorkspace`) when `dispatchSubmissionToJudge` rejects, prompting the user to retry later.
  - Emit ops metrics/alerts when `publishSubmissionMessage` fails (beyond a log) so SREs know the queue is down.

### 2.3 No watchdog for stuck `RUNNING`/`RETRYING` submissions
- **Files:** `lib/judge/worker.ts`, `lib/judge/dispatcher.ts`, `lib/trpc/router/submissions.ts`
- The worker marks submissions `RUNNING` before executing tests, but there is no periodic watchdog to reset submissions stuck in `RUNNING` (worker crash) or `RETRYING` (nack’d message) states. Users may see “pending” forever because no process enqueues them again. There’s also no queue depth/latency indicator in the user UI to explain delays.
- **Fix:** Introduce a cron/worker that scans for `RUNNING` submissions older than N minutes and requeues them (or marks them `FAILED`). Also expose queue depth in the workspace (e.g., show “Judge queue backed up” banner) to set expectations.

### 2.4 Manual review UX does not handle offline curators
- **Files:** `components/staff/judge/manual-queue.tsx`, `lib/trpc/router/staff/judge.ts`
- Manual queue UI lacks error banners/states; if `manualQueue` query fails (e.g., judge DB unreachable), curators see a blank screen. Mutations (`manualSetVerdict`, `manualQueue`) have no retry hints. Given manual review is the fallback when automation fails, we need better degraded messaging.
- **Fix:** Add explicit loading/error states in `manual-queue.tsx`, show queue depth, and inject a health indicator (from `inspectJudgeQueues`) so staff know when manual action is required.

### 2.5 No enforcement that manual-only problems require manual reviewers
- **Files:** `lib/judge/dispatcher.ts:38-50`, `lib/trpc/router/staff/judge.ts`
- Manual-only problems immediately publish manual messages, but there is no guard that ensures manual reviewers exist or that the queue is monitored. Users who submit to manual-only problems could wait indefinitely if staff never check `/staff/judge/manual`. A basic SLA indicator or auto-escalation is missing.
- **Fix:** Consider sending proactive notifications or alerts when manual queue grows, and show user-facing messaging (“Manual review typically takes N hours. Contact support if longer.”).

### 2.6 RabbitMQ health check doesn’t validate DLX/retry queues
- **Files:** `lib/health.ts:32-70`, `lib/judge/queue.ts:82-162`
- The health check only runs `channel.checkQueue(JUDGE_QUEUES.submissions)`. If retry queues or exchanges fail to assert (e.g., permission changes), the app still reports “healthy”, but submissions silently drop. We should validate DLX bindings and the manual queue as well.

## 3. Positive Observations
- `publishSubmissionMessage` falls back to inline judge rather than discarding work; `runInlineJudge` persists case data for manual review.
- Websocket bridge exists (`/api/ws/submissions` + SSE fallback via `notifySubmissionUpdate` HTTP call) so even when the hub isn’t in-process, updates can be dispatched via REST.
- `useSubmissionRealtime` handles reconnects/backoff cleanly.
- Manual queue mutation ensures only `MANUAL_PENDING` submissions are updated and records reviewer info.

## 4. Next Steps
- Patch inline judge to emit realtime updates and update submission status on failure.
- Add user-facing toasts/banners when judge dispatch fails (RabbitMQ down, sandbox missing).
- Implement a watchdog (cron or scheduled worker) to requeue stale `RUNNING/RETRYING` submissions.
- Enhance manual queue UI + health indicators (including queue depth from `inspectJudgeQueues`).
- Expand RabbitMQ health checks to cover manual/retry queues and alert Ops when infrastructure is partially configured.

_Reporter:_ Codex QA agent.
