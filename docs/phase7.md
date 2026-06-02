# 7) Judge System (Backend Worker + Sandbox) — **Expanded (RabbitMQ)**

## 7.1 Goals

Provide a **deterministic, secure, horizontally scalable** judging platform with:

- **Autonomic** (automatic) evaluation for objective problems, and
- **Manual** human judgments for subjective/edge tasks,  
  while preserving **reproducibility, isolation, and auditability**.

---

## 7.2 Core Architecture (RabbitMQ-first)

- **Exchanges** (direct unless noted):
  - `judge.submissions` — normal submits (optionally route by `lang.*`).
  - `judge.rejudge` — rejudge requests (by submission/problem/version).
  - `judge.manual` — manual-review handoff.
  - `judge.DLX` (**topic**) — dead-letter exchange for retries/backoff.

- **Queues** (durable **quorum queues**):
  - `judge.submissions.q` (DLX=`judge.DLX`)
  - `judge.rejudge.q` (DLX=`judge.DLX`)
  - `judge.manual.q` (no DLX; reviewed by humans)
  - Retry tiers (TTL+DLX): `judge.retry.1m.q`, `judge.retry.5m.q`, `judge.retry.30m.q` → route back to `judge.submissions`.

- **Consumers / Workers:** stateless node(s) running language runners in **Docker**; `prefetch` = 1–4.
- **Storage pattern:** Messages are **small** (`submissionId`, `problemVersionId`, `languageCode`); code/tests live in blob/object storage.

---

## 7.3 tRPC Surface (conceptual)

- **Client → Judge**
  - `submissions.create` → publish to `judge.submissions`.
  - `submissions.get(id)` → poll/result fetch.

- **Staff**
  - `judge.manualSetVerdict` → finalize manual decisions.
  - `rejudge.enqueue` → publish to `judge.rejudge`.

- **State store:** DB keeps canonical status (`QUEUED/RUNNING/SUCCEEDED/FAILED/RETRYING/MANUAL_PENDING`), verdict, and per-test results.

---

## 7.4 Autonomic (Automatic) Judge

**Flow**

1.  Publish to `judge.submissions` (messageId = `submissionId`).
2.  Worker consumes → sets status `RUNNING`.
3.  Pull code blob + tests for **ProblemVersion**.
4.  Spawn Docker (language profile) → compile → run per test (stdin).
5.  Compare stdout with expected (byte-compare or **checker script**).
6.  Persist per-test results + aggregate verdict → `ack` message.

**Security**

- **No network**, no write outside container; tmpfs ephemeral FS; non-root user; cgroups CPU/MEM caps; hard timeouts kill container.

**Verdicts**  
`AC`, `WA`, `TLE`, `MLE`, `RE`, `CE` (+ timing/memory per test; stderr refs).

---

## 7.5 Manual Judge

**When used**

- Subjective tasks, custom scoring, or special review policy.

**Flow**

1.  Mark submission `requiresManualReview = true`.
2.  Publish small message to `judge.manual`.
3.  Staff dashboard lists **Manual Pending** (reads from DB, not RMQ).
4.  Reviewer (role: **PROBLEM_CURATOR** or **ADMIN**) inspects code/output and sets verdict via `judge.manualSetVerdict`.
5.  Verdicts: **MANUAL_ACCEPTED / MANUAL_REJECTED / MANUAL_PARTIAL (score)**; audit notes stored.

**Policy**

- Optional **double-blind** (hide user handle/code until first verdict).
- SLA timers (e.g., 48h) with reminders/escalation.

---

## 7.6 Hybrid Mode (Auto + Manual)

- Phase 1: automatic sanity checks (format, minimal correctness).
- Phase 2: manual scoring for style/quality.
- Submission flagged `partially_judged = true` until manual verdict arrives.

---

## 7.7 Retries, Backoff, Idempotency (RabbitMQ)

- **Retries:** Implement with **TTL queues + DLX**:
  - On worker failure → `nack(requeue=false)` to DLX → routed to `judge.retry.1m.q` → TTL expires → DLX back to `judge.submissions`.
  - Escalate 1m → 5m → 30m; after final, mark **FAILED** with reason.

- **Idempotency:** Use `submissionId` as **messageId/correlation id**; worker **reads DB state** and skips if already terminal.
- **Heartbeat:** Workers update `RUNNING` timestamp; controller can mark **stalled** if no heartbeat.

---

## 7.8 Rejudge & Determinism

- **Rejudge triggers:** content fix, checker change, language/runtime update.
- Re-run using **stored runner image digest + language version** for reproducibility.
- Results overwrite per-test metrics; original verdict & metadata kept as history entry.

---

## 7.9 Telemetry & Monitoring

- **RabbitMQ:** queue depth, publish/consume rates, DLX volume, consumer lag.
- **Judge:** container spawn time, run time, failure rates, node health.
- **Tracing:** correlation by `submissionId`; structured logs per stage.
- **Alerts:** stuck queues, node offline, DLX surge, error-rate spikes.

---

## 7.10 Performance Targets

- ≥ **1K submissions/hour per node** (messages light; code/tests external).
- Cold container start < **300 ms**; average per-test latency < **100 ms**.
- No cross-tenant leakage; containers purged; verdicts reproducible.

---

## 7.11 Verdict Schema (combined)

`enum  Verdict {
  AC, WA, TLE, MLE, RE, CE,
  MANUAL_PENDING, MANUAL_ACCEPTED, MANUAL_REJECTED, MANUAL_PARTIAL
}`

- Store: aggregate verdict, per-test results, resource usage, stderr refs, reviewer notes (manual), score (optional).

---

## 7.12 Definition of Done

- RabbitMQ exchanges/queues (quorum, DLX) configured; idempotent producers/consumers.
- Autonomic judge deterministic & isolated (no network; capped resources).
- Manual judge dashboard live; curator/admin can assign verdicts with audit logs.
- Hybrid problems supported; SLA timers for manual pending.
- Retry/backoff via TTL+DLX; rejudge path reuses stored runner digests.
- Telemetry dashboards + alerts wired; correlation by `submissionId`.
- Throughput & reproducibility targets met; no cross-tenant leaks.

## 7.13 Implementation Notes (OpenSolve)

- **RabbitMQ wiring:** submissions publish to `judge.submissions` (quorum queue, DLX-backed). If RabbitMQ is missing the API falls back to the inline simulator so local dev still works.
- **Worker runtime:** `npm run judge:worker` (or `docker compose up worker`) launches the consumer that executes sandboxes via Docker. Profiles map to stock images (`gcc`, `python`, `temurin`, `node`) with `--network none`, CPU/memory caps, and `pids-limit`.
- **Drivers:** `JUDGE_SANDBOX_DRIVER=mock` reuses the simulator; otherwise Docker is required. `JUDGE_SANDBOX_WORKDIR` controls ephemeral workspace roots under `/tmp`.
- **Manual + hybrid mode:** `Problem.judgeMode` governs routing. HYBRID problems run auto checks and then flip to `MANUAL_PENDING`; MANUAL problems skip the worker entirely. The staff console (`/staff/judge/manual`) lets curators post `MANUAL_ACCEPTED|REJECTED|PARTIAL` verdicts with notes/score.
- **Statuses/verdicts:** Prisma enums now include `QUEUED|SUCCEEDED|RETRYING|MANUAL_PENDING` plus the manual verdict codes. Client polling slows to 30s while a submission is waiting on manual review.
- **Env additions:** `JUDGE_RABBIT_URL`, `JUDGE_RABBIT_PREFETCH`, `JUDGE_SANDBOX_DRIVER`, `JUDGE_SANDBOX_WORKDIR`. They live in `.env` / `.env.example` and are documented in the README.
