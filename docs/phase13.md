# **13) Quality & Security (Expanded Version)**

> **Mindset:** _Ship confidently, defend aggressively, recover effortlessly._

OpenSolve must operate under **high reliability**, **strong privacy guarantees**, and **rigorous operational discipline**, all while supporting God-mode Admin powers and high-scale judging.

---

# **13.1 Testing Strategy (Full, Multi-Layered)**

### **Unit Tests**

- Zod schemas (strict input validation)
- Business logic (scoring, pagination, difficulty weighting)
- Role middleware (`authRequired`, `roleRequired`)
- Trails insight normalization/merging
- Markdown sanitization / spoiler detection
- Anti-cheat heuristics

### **Integration Tests (tRPC-level)**

- Auth flows (signup/login/2FA/reset/delete)
- Submission lifecycle → judge queue → verdict → result fetch
- Contest scoring calculations
- Editorial release logic
- Proposal submission & review
- Discussions/trails posting + reporting
- Admin impersonation
- Feature flag toggling

### **E2E Tests (Full App)**

- Sign in → solve → submit → see AC
- Contest → freeze → finish → unfreeze → standings
- Moderation flows (hide/unhide, shadow-ban, report resolution)
- Problem authoring → review → publish → editorial release
- Approach Trails → add insight → see graph update
- Admin rejudge → UI updates

### **Load & Scale Tests**

- 10k concurrent read load on problem pages
- 1k+ submissions/hour per judge node
- Freeze/unfreeze scoreboard under load
- RabbitMQ message flood simulations
- Leaderboard rebuild for 100k+ users

### **DoD**

- CI rejects merges on failing tests
- Minimum coverage target met
- Tests documented in dev guide

---

# **13.2 Validation & Sanitization**

### **Server-Side Validation**

- Every tRPC procedure uses strict zod schemas
- Reject unknown fields (no silent merges)
- Enforce max lengths, allowed patterns, valid enums
- Rate-limit high-risk routes (auth, discussions, submissions)

### **Markdown & HTML Sanitization**

- Remove scripts, event handlers, iframes, embeds
- KaTeX safe-rendering mode
- Rich code blocks allowed—but sanitized
- Spoiler scanning (keyword & heuristic)

### **Uploads & Storage**

- Test files validated size + type
- Optional antivirus pipeline for uploads
- Hidden tests encrypted at rest (recommended)

### **DoD**

- Zero unvalidated input enters DB
- All UGC rendered sanitized
- Security regression tests pass

---

# **13.3 Secrets & Sensitive Data Handling**

### **Secret Storage & Rotation**

- Use environment variables + secret manager
- Mandatory periodic rotation
- No secrets logged, ever
- Encryption keys stored separately with rotation schedule

### **Sensitive Data Protection**

- Passwords → bcrypt/argon2
- 2FA secrets → encrypted
- Emails → encrypted + hashed for search
- IP/device fingerprints → hashed

### **DoD**

- Secrets never appear in logs
- Environment validation at startup
- Key rotation guides documented

---

# **13.4 Backup, Restore & Disaster Recovery**

### **Backups**

- Nightly full Postgres backups
- Hourly WAL archiving
- Replicated object storage for blobs
- Snapshot backup for configs+flags+contests

### **Restore**

- Quarterly restore drills
- Automated verification (hash checks)
- Restore time target: **< 30 minutes**

### **Disaster Simulation**

- DB corruption
- Judge nodes crashing
- RabbitMQ partitioning
- Massive submission surge
- Contest scoring anomaly

### **DoD**

- Last successful restore logged
- Disaster runbook updated after every drill

---

# **13.5 Hybrid Account Deletion (Final Model)**

### ✔ **Hard delete all PII**

When a user deletes their account:

- Email
- Password & credentials
- 2FA data
- Sessions
- Device fingerprints / IP hashes
- OAuth connections
- Recovery codes
- Private profile fields

→ **all permanently destroyed**

### ✔ **Soft-delete + anonymize the user row**

- `status = DELETED`
- Replace handle with `deleted_user_<hash>`
- Remove avatar, bio, social links
- Replace country/timezone with null
- Strip all PII fields

### ✔ **Keep their content, anonymized**

- Submissions → kept as system artifacts
- Contest results → kept for standings
- Discussions → “Deleted User” or anonymized handle
- Trails insights → anonymized
- Reports → preserved for audit
- Anti-cheat logs → preserved

### ✔ **Admin-only ability to truly hard delete user row**

Only `ADMIN` can fully purge a user record (rare: legal request, test cleanup).

### **DoD**

- Delete-account flow fully removes PII
- No broken references
- User’s past contributions preserved but de-identified

---

# **13.6 Security Hardening**

### **Judge Sandbox**

- Docker isolated
- No network
- cgroups CPU/memory caps
- Timeouts kill container
- Ephemeral FS
- No host mounts
- Read-only root FS
- Auto-restart worker on errors

### **API & Transport**

- HTTPS mandatory
- Cookies: HttpOnly + Secure + SameSite
- CORS strict
- Rate-limits by IP, session, and user

### **Anti-Abuse**

- Submission throttling (IP & user)
- Spam detection for discussions
- Repeated downvote abuse detection
- Shadow-ban path & queue
- Code similarity analysis

### **Admin Oversight**

- Admin can inspect EVERYTHING
- All privileged actions logged

### **DoD**

- All external attack surfaces hardened
- Sandbox escapes tested quarterly
- No unencrypted-sensitive data flows

---

# **13.7 Observability & Monitoring**

### **Metrics**

- tRPC latency (p50/p95/p99)
- Judge queue depth + retry rates
- Worker crash count
- DB slow query metrics
- Submission throughput
- Contest load + freeze monitor
- Error spikes in any domain

### **Dashboards**

- Auth dashboard (errors, signups, resets)
- Problem dashboard (views, reads, failures)
- Judge dashboard (per language)
- Contest live scoreboard stability
- Discussions traffic
- Trails insights usage

### **Error Tracking**

- Automatic capture & grouping
- Alerts on:
  - Judge failures
  - Queue backlog
  - Cache invalidation storms
  - Repeated user-facing errors

### **DoD**

- Oncall can spot issue source in < 2 minutes

---

# **13.8 Deployment Safety & Change Control**

### **CI/CD gates**

- Type check
- Linter
- Unit tests
- Integration tests
- E2E tests
- Migration check
- Security scan (npm + Docker image)
- Secret exposure detector

### **Rollouts**

- Canary deploys
- Health checks before shifting traffic
- Auto-rollback on failure
- Feature flags controlling major changes

### **Zero-Downtime Migrations**

- Add columns → backfill → switch → drop
- No destructive migrations without backup

### **DoD**

- CI fails on ANY regressive change
- Safe rollback path documented

---

# **13.9 Incident Response & Oncall**

### **Incident Features**

- Declare incident (SEV1/2/3)
- Freeze judge
- Lock submissions
- Enable maintenance mode
- Disable discussions
- Disable new accounts
- Drain queues
- Impersonate user to debug

### **Recovery Tools**

- Rebuild LRU caches
- Trigger rejudges
- Restart selective workers
- Reconnect RabbitMQ
- Failover DB cluster

### **Documentation**

- On-call playbooks
- Incident timeline automatically captured
- Postmortems required for SEV1/SEV2

### **DoD**

- Time to identify root cause < 5 minutes
- Escalation plan clear

---

# **13.10 Security Checklist (Included)**

### Application-level

- All inputs validated with zod
- All Markdown sanitized
- All UGC rendered safely
- No secrets in logs
- tRPC RBAC enforced everywhere
- No PII returned where not needed

### Database-level

- PII encrypted + hashed
- Backups tested
- Anti-cheat tables secured
- User deletion logic preserves integrity

### Infrastructure-level

- Judge sandbox locked down
- Docker images hardened
- Worker resources capped
- RabbitMQ protected with TLS

### Deployment-level

- Canary deploys
- Feature flags ready
- Rollback tested
- Secrets rotated periodically

---

# **13.11 System Hardening Guide (Included)**

### Host System Hardening

- Disable SSH password auth
- Root login disabled
- Only two ports open (HTTPS + MQ if separate)
- OS auto-security updates enabled

### Docker Hardening

- No privileged containers
- No host mounts for judge
- Limit CPU, memory, PIDs
- Read-only root FS
- Drop all capabilities except minimal set

### Application Hardening

- HTTP headers:
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy`
  - `X-XSS-Protection`
  - `Referrer-Policy`

- Use UUID/ULID everywhere
- Rate-limit all mutation endpoints

### Database Hardening

- Least privilege DB users
- Parameterized queries only
- Connection pooling

---

# **13.12 Oncall Runbook (Included)**

### **If Judge is Stuck**

1.  Check RabbitMQ depth
2.  Check worker logs
3.  Restart failing worker
4.  Pause queue consumption
5.  Drain suspicious jobs
6.  Trigger rejudge or manual judge override

### **If DB is Slow**

1.  Inspect slow query logs
2.  Kill runaway queries
3.  Rebuild indexes (if outside contest hours)
4.  Failover to replica if needed
5.  Notify admin + open SEV2 incident

### **If Outage**

1.  Enable maintenance mode
2.  Broadcast message
3.  Freeze contests
4.  Pause submissions
5.  Check infra
6.  Restore service
7.  Create incident report

---

# **13.13 CI/CD Completeness Checklist (Included)**

### Pre-merge

- ESLint
- TypeScript
- Unit tests
- Integration tests
- E2E tests
- Security scan
- Dependency audit
- Migration check
- Secret leakage check

### Pre-deploy

- Canary deploy
- Smoke test
- tRPC health checks
- Worker health
- Queue latency OK

### Post-deploy

- Metrics normal
- Error rate nominal
- Contests operating normally
- Rollback ready if needed

---

# **13.14 Definition of Done (Final)**

- Hybrid user deletion fully implemented
- All inputs validated & sanitized
- All PII encrypted or removed appropriately
- All secrets kept out of logs
- Backups + restore tested
- CI/CD pipeline blocks all regressions
- Observability dashboards live
- Hardening procedures applied

- Oncall runbooks published

- Security checklist complete

---

## 13.A Implementation Artifacts

- Testing strategy → `docs/quality/testing-strategy.md`
- Runbooks (judge stuck, DB slow, outage) → `docs/quality/runbooks.md`
- Backup & disaster recovery plan → `docs/quality/backup-dr.md`
- Security notes (email encryption, deletion) → `docs/quality/security.md`
- Metrics endpoint → `GET /api/internal/metrics` (protect with `METRICS_ACCESS_TOKEN`).
