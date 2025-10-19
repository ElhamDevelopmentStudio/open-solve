# 1) Authentication & Accounts — Detailed Build Plan (tRPC-first)

## 1.0 Architecture at a glance (mental model)

- **Sessions**: Cookie-based, HttpOnly, secure, short-lived access with silent refresh.
- **Core**: Next.js App Router + **tRPC** server procedures; sessions available via tRPC context.
- **User storage**: Postgres via Prisma (or your ORM). No secrets in user table.
- **Auth methods**:
  - **Email + Password** (primary, always on).
  - **Passwordless Magic Link** (optional, feature-flagged).
  - **Social OAuth** (GitHub/Google) supported but **provider setup is out of scope** here.

- **RBAC**: `user`, `problem_curator`, `moderator` (optional), `admin`.
- **2FA**: TOTP with recovery codes (phase 1.5).

---

# Important Constraint (applies to Section 1: Authentication & Accounts)

**Do not use NextAuth (or any third-party auth framework).**  
Build auth **in-house** end-to-end:

- Session management (HttpOnly cookies, rotation, remember-me, revocation)
- Credential storage & policies (password hashing, 2FA/TOTP secrets, recovery codes)
- Email flows (verify, magic link, reset, device alerts)
- RBAC enforcement via **tRPC middleware** (no client-side role checks)
- OAuth flows (if enabled later) implemented manually—**provider setup remains out of scope**, but token exchange, account linking, and safety checks are yours

---

# Using Resend for Auth Emails — What to Change/Add

## A) Architecture & Ownership (fits into **1.0/1.8**)

- **Transport**: Use Resend as the **only** outbound email transport for auth flows (verify, magic link, reset, device alert, 2FA on/off, email changed, deletion confirmation).
- **Templates**: Centralize all transactional templates (React/Markdown) in a `templates/transactional` directory with **versioning** (`verify-email@v1`, `password-reset@v2`, …). The app chooses the version explicitly.
- **No third-party auth**: This does **not** change your “no NextAuth” rule. Resend is only your mail pipe + events.

**DoD**: Every auth email is emitted via a single “MailService” abstraction that calls Resend under the hood; templates are versioned; swapping providers later is possible.

---

## B) Domains, Deliverability, Compliance (dev-owned tasks only)

- **Dedicated subdomain** for auth emails (e.g., `auth.mail.opensolve.dev`) to protect root domain reputation.
- **SPF/DKIM/DMARC**: Devs provide DNS records to ops; confirm alignment passes (domain=From=DKIM).
- **Transactional classification**: Mark auth emails as transactional (not marketing); **no unsubscribe link** required for auth but include a **safety line** (“If you didn’t request this… ignore.”).

**DoD**: Seed run to a few providers (Gmail/Outlook/iCloud) shows “Signed by” your domain; no warnings; DMARC aligned.

---

## C) Security & Links (critical changes)

- **Disable link/open tracking for auth links** (magic links, reset, verify). Tracking can break single-use URLs and introduces privacy issues.
- **Absolute URLs** only; **no query param echoing** of user PII.
- **Single-use, short-TTL tokens** (already in your plan) + **one-click invalidation** when redeemed.
- **Allow-listed redirect origins** only (never reflect a `redirect`/`next` param verbatim).
- **Token binding**: Token is bound to (email, action, optional deviceId) server-side; link alone can’t escalate scopes.

**DoD**: Expired/used/foreign-origin links return a friendly “expired” view with a one-click resend.

---

## D) Event Webhooks (fits into **1.10 Observability & audit**)

Wire Resend **webhooks** to your backend to ingest a minimal set of events:

- **Delivered** → mark `EmailMessage.status=delivered`, increment deliverability metrics.
- **Bounced/Blocked** → add to a **suppression list** table; soft-lock sending to that address and show an in-app banner guiding the user to fix email.
- **Complained** (spam) → immediately **freeze** further auth sends to that address; log to **AuditLog**.
- **Deferred** (temporary issue) → schedule **retry with backoff** (e.g., 5m, 30m, 2h) via your job queue.
- **Rejected** (policy) → surface to admin dashboard with provider reason.

**DoD**: For a given user you can see the last 10 auth emails with status, provider reason (redacted), and exact timestamps.

---

## E) Idempotency, Retries, and Queueing (plugs into your worker/queue)

- **Idempotency key** per logical email (e.g., `verify:<userId>:<templateVersion>:<day>`). Prevents bursts on repeated clicks.
- **Background queue** for sends; Resend failures retried with exponential backoff; final failure recorded and visible in admin.
- **Send-dedupe**: If a user requests multiple resets within TTL, reuse the **existing** active token; send a single latest email.

**DoD**: Load tests with rapid “resend” clicks produce one email and one valid token.

---

## F) Template Content & UX (fits into **1.7 UX** and **1.8 Email system**)

- **Consistent header/footer** across all auth emails; include app name, support link, and why the user received it.
- Show **TTL in plain text** (“This link is valid for 15 minutes.”).
- Use **big primary button** + fallback raw URL for copy/paste.
- **Localization-ready**: all strings pulled from your i18n layer with a locale parameter.
- **Brand safety**: include the **approximate device + location** (“Chrome on Windows, near Sofia, BG”) for new-device alerts.

**DoD**: Dark mode compatible emails; screen reader-friendly; test images off.

---

## G) Storage & Audit (extends **1.1/1.10**)

- Create an `EmailMessage` table: id, userId?, type (`verify_email`, `reset_password`, …), templateVersion, resendMessageId, to, status, providerReason (redacted), createdAt, sentAt, deliveredAt, failureAt.
- Log **who triggered** the email (self, admin, automated) in `AuditLog.metadata`.
- **Do not store** email bodies; store only metadata and template name/version.

**DoD**: Admin can answer “which emails did we send to this user last week and why?” without seeing content.

---

## H) Rate Limits & Abuse Controls (extends **1.6**)

- Per-route caps (e.g., verify resend: 3/hour, reset: 3/24h).
- **Global daily cap** per user/email across all auth sends (e.g., 10/day) to avoid deliverability penalties.
- **Greylist** risky IPs/ASNs for CAPTCHA after patterns of abuse (but still keep CAPTCHA off for normal users).

**DoD**: Metrics show rate-limit hits vs. successful sends; caps are configurable per environment.

---

## I) Monitoring & Alerts (ties into **1.10**)

- **SLOs**:
  - 99% of transactional sends accepted by Resend < 1s.
  - 99% of “verify” emails reach **Delivered** within 5 minutes (track via webhook).

- **Alerts**:
  - Bounce rate > 2% over 1 hour.
  - Complaint rate > 0.1% over 1 day.
  - Webhook delivery failures (non-2xx) > N/min.

- **Dashboards**: deliverability over time, top failure reasons, by-provider variance.

**DoD**: Oncall receives a single actionable alert with runbook link.

---

## J) Environments & Safety (extends **1.16 Deployment**)

- **Separate Resend API keys** per env (dev/staging/prod) with tight IAM.
- **Sandbox mode** in non-prod: whitelist recipient domains (e.g., `@opensolve.dev`) to avoid accidental real sends.
- **Test seeds**: route all non-prod emails to a sink mailbox (e.g., `dev-inbox@…`) when running e2e tests.

**DoD**: No dev/staging email reaches real end-users.

---

## K) Fallback Strategy (optional but recommended)

- Define a **provider-agnostic interface** (`MailService`), so if Resend is degraded you can:
  - Queue emails locally and retry later, **or**
  - Fail over to a backup provider for **critical flows only** (password reset, verify). Non-critical (device alert) can wait.

**DoD**: A manual toggle (feature flag) can switch to “queue only” mode without code changes.

---

## L) Privacy & Legal (quick checks)

- **No PII** in URLs, headers, or webhooks beyond what’s necessary (email address).
- **Data retention**: auto-purge `EmailMessage` rows older than N days (e.g., 180) unless tied to an audit event.
- Update **Privacy Policy** to state you use a third-party email processor (Resend) and list purposes (transactional auth).

**DoD**: Privacy review passes; retention job is scheduled.

---

### One-liner to add to the spec

> **Email Transport**: “All authentication emails are sent via **Resend**. Tracking is **disabled** for auth links. Events (delivered, bounced, complained, deferred, rejected) are consumed via webhooks for deliverability, suppression, retries, and audit. No email bodies are stored—only metadata and template version.”

---

## 1.1 Data contracts & invariants (no code, just definitions)

**Entities to exist (columns/fields are indicative):**

- **User**: id, handle (unique), email (unique, normalized), emailVerifiedAt, status (`active` | `banned` | `locked`), role, avatarUrl, country, timezone.
- **Credential**: userId, type (`password` | `totp` | `oauth` | `magiclink`), hash/secret material (stored appropriately), createdAt, lastUsedAt, revokedAt.
- **Session**: id, userId, deviceId, createdAt, lastUsedAt, expiresAt, ipHash, uaHash, isRevoked.
- **AuditLog**: id, userId?, action (`login_success`, `login_fail`, `2fa_enable`, `password_change`, etc.), ipHash, uaHash, createdAt, metadata (JSON).
- **RecoveryCode**: userId, codeHash, usedAt.
- **RateLimitLedger**: key, windowStart, count (abstracted behind your rate-limit util).

**Invariants (must always hold):**

- Emails are lower-cased and trimmed before persistence.
- Password hashes never leave the server. **Never** store plain text.
- Session cookies are **HttpOnly + Secure + SameSite=Lax** (or Strict for sensitive flows).
- You can revoke any session without logging the user out everywhere unless requested.
- Deleting an account fully deletes/revokes all credentials and sessions (keep a hashed deletion token only if legally required).

---

## 1.2 Session model & cookie strategy

**What to implement:**

- **Short-lived session cookie** (e.g., 8–12 hours) + **silent extension** on activity.
- **“Remember me”** extends the expiry (e.g., 14–30 days) but still rotates regularly.
- **Rotation on privilege change** (e.g., role upgrade/downgrade).
- **Device inventory**: sessions are device-bound via a **deviceId** and stored in DB.

**What not to do:**

- ❌ No JWT tokens in `localStorage`.
- ❌ No multi-month non-rotating cookies.
- ❌ No opaque “forever” sessions.

**Definition of Done (DoD):**

- Session survives tab close and browser restart (if “remember me”).
- Manual revoke works per session (not global unless requested).
- CSRF protection is present on sensitive mutations.

---

## 1.3 tRPC integration (how the pieces talk)

**Goals:** Every protected procedure knows the user/session. Public vs authed vs role-gated is centralized.

**What to implement:**

- **tRPC context** attaches the “current session” and “current user” from the cookie.
- **Middleware**:
  - `authRequired()` → blocks anonymous calls.
  - `roleRequired(role)` → enforces RBAC.
  - `freshSession()` → blocks expired/revoked sessions.

- **Dedicated procedures**:
  - `auth.getSession()` → returns minimal, non-sensitive session state for the client.
  - `auth.signInEmailPassword()` / `auth.signOut()` / `auth.enableTOTP()` / etc.
  - `account.updateProfile()` / `account.changePassword()` / `account.deleteAccount()`.

**DoD:**

- All app pages call **one** session hook (under the hood it hits `auth.getSession`), no ad-hoc calls.
- Protected pages use a single guard (layout-level) rather than duplicating logic.

---

## 1.4 Flows (the narrative your team should implement)

### A) Sign up (email + password)

1.  User submits email & password (+ optional handle).
2.  Rate-limit gate (per IP + per email).
3.  Email normalization; verify uniqueness; create `User` (status=`active`) and `Credential(type=password)`.
4.  **Optional**: Send **verify-email** link; limit new accounts until verified.
5.  Create session; set cookie; redirect to **Onboarding**.

**DoD**:

- Smart error messages without **enumeration** (“Invalid email or password” for all login failures).
- If email verification is enabled, unverified users have restricted capabilities until verified.

### B) Sign in (email + password)

1.  Rate-limit gate.
2.  Check user exists & status != `banned`.
3.  If password matches and **2FA enabled** → prompt TOTP (see Flow F).
4.  Create/rotate session; log `login_success` in AuditLog.
5.  Show **Device Recognition** banner if new device.

**DoD**:

- Lock account temporarily on too many failures (configurable backoff).
- No leakage whether an email exists.

### C) Passwordless (Magic Link) — optional

1.  User provides email → rate-limit → send signed, one-time link with short TTL.
2.  Clicking creates or continues session; **invalidated after first use**.

**DoD**:

- Links cannot be reused; clicking an expired link gives a friendly retry path.

### D) Sign out

1.  Invalidate current session in DB; clear cookie.
2.  Optionally “sign out of all devices”.

**DoD**:

- Server-side invalidation guarantees logout even if cookie is stolen later and presented.

### E) Email verification

1.  Send signed verification link on signup or email change.
2.  Verification sets `emailVerifiedAt`.
3.  Rate-limit resends; display next eligible resend time.

**DoD**:

- Verification link cannot be used to sign in by itself.

### F) 2FA (TOTP) enable/disable

1.  Show QR + secret; require **current password** + **one TOTP** to enable.
2.  Generate **10 recovery codes**; force user to “acknowledge I saved them”.
3.  Store only **hashed** recovery codes.
4.  To disable 2FA: require password + one TOTP **or** one recovery code.

**DoD**:

- TOTP required on sensitive actions (delete account, password change) after re-auth.

### G) Password reset

1.  Request form → rate-limit → send one-time short-TTL reset link.
2.  Link opens reset page; require **new password** meeting policy.
3.  Invalidate all sessions for the user on success.

**DoD**:

- Reset flow does not disclose whether email exists.

### H) Change email

1.  Require re-auth (password or recent TOTP).
2.  New email → send verify link.
3.  Switch only after link clicked.
4.  Log `email_change_initiated` and `email_change_verified`.

**DoD**:

- No gap where both emails are considered verified.

### I) Delete account

1.  Require re-auth + TOTP if enabled.
2.  De-provision: delete PII, revoke sessions, scrub credentials; retain minimal statistical aggregates if needed (non-identifiable).
3.  Confirm via email receipt (optional).

**DoD**:

- Irreversible; export data path (optional) offered prior to deletion.

---

## 1.5 RBAC & permissions

**Roles**: `user`, `problem_curator`, `moderator` (optional), `admin`.

**What to implement:**

- Role stored on `User`.
- Central **permission map** listing what each role can do (not scattered).
- **tRPC middleware** enforces role per procedure.
- “Shadow-ban” state (user sees their own posts, others don’t) for discussions (optional but powerful).

**What not to do:**

- ❌ Don’t check roles inline in pages/components—keep it server-side in procedures.
- ❌ Don’t allow role changes without session rotation.

**DoD:**

- Attempting unauthorized calls returns a **structured** error (with a generic message client-side).

---

## 1.6 Rate limiting, bot & abuse controls

**What to implement:**

- Rate-limit **per route** (signup, login, reset, verify-resend).
- Progressive lockouts (e.g., 5 tries → 5 min cooldown; then 30 min).
- **Honeypot** field on forms to catch bots; invisible to humans.
- **CAPTCHA** only after suspicious patterns (not always on).

**DoD:**

- Observability shows auth errors vs. rate-limit triggers separately.

---

## 1.7 UX that prevents user pain

**Must-haves:**

- **Consistent error copy**: never reveal whether email exists.
- **Password policy**: clear rules; live strength indicator; allow paste from manager.
- **Accessible forms**: labels, focus states, keyboard-first.
- **“Logged in as X?” mini-banner** with quick switch to Profile & Sign out.
- **Device sessions page**: shows each device (approximate), last used, revoke button.

**DoD:**

- Mobile flows are first-class: no modals that trap focus, no overflow issues.

---

## 1.8 Email system (dev responsibilities only)

**What to implement:**

- Templates: Verify email, Magic link, Password reset, New device alert, 2FA enabled/disabled, Email changed, Account deletion confirmation.
- **DKIM/SPF** domain setup (ops task), but devs provide from-address & template variables.
- Link TTLs displayed in email copy (“valid for 15 minutes”).
- All links are **single-use** tokens.

**DoD:**

- Sending is idempotent; duplicate clicks give friendly guidance.

---

## 1.9 Security footguns to explicitly avoid

- ❌ Storing password or 2FA secrets in logs.
- ❌ Returning raw credential errors (e.g., “User not found”).
- ❌ Accepting unverified emails for privileged actions.
- ❌ Using user-supplied redirect URLs without an allow-list.
- ❌ Allowing session cookies over HTTP in any environment except local dev.

---

## 1.10 Observability & audit

**What to implement:**

- **Metrics**: signup/login success rate, failure reasons (redacted categories), average session length, 2FA adoption, rate-limit hits.
- **AuditLog** entries for: login success/failure, password change, 2FA on/off, email change, account deletion, role changes, session revoke.
- **Admin panel**: searchable audit by user/action/date.

**DoD:**

- Oncall can answer: who changed this role, when, from where.

---

## 1.11 Migration & seed plan

**What to implement:**

- Minimal seed: 1 admin, 1 curator, 3 normal users; fake devices; a couple of locked/banned examples.
- Rehearse **backups & restore** of just the auth tables.
- Red team yourself: try enumeration, token reuse, expired links, CSRF on signout.

**DoD:**

- Restore drill completes within target RTO; tokens become invalid post-restore.

---

## 1.12 Unique twists (optional but delightful)

- **Contextual 2FA prompts**: Only require TOTP on new device, new country, or when accessing elevated panels—keeps daily UX smooth while staying safe.
- **Session “Trust Score”**: Increase session duration for devices with consistent behavior; decrease for risky patterns (rapid IP churn).
- **Recovery Code Nudges**: Gentle reminder banner if user enabled 2FA but hasn’t confirmed recovery codes are stored (one-time acknowledgment).
- **Account Freeze**: User can self-freeze account (revokes sessions, requires email link to unfreeze).
- **“Safe Preview” Mode for Curators**: A temporary elevated permission guarded by a time-boxed token—auto-revoked after N minutes.

---

## 1.13 Final acceptance checklist (ship gate)

- Sign up / Sign in / Sign out functionally complete with rate-limits.
- Email verification, password reset, 2FA (TOTP + recovery codes).
- Session rotation on privilege change; per-device session inventory.
- RBAC enforced centrally in tRPC middleware; tests cover denial paths.
- No enumeration leaks; cookies secure/HttpOnly/SameSite.
- Audit logs for all sensitive events; dashboards & alerts wired.
- Docs page: **“Auth Runbook”** (how to revoke, rejudge sessions, unban, rotate secrets).
- Manual QA across mobile/desktop, dark/light themes, slow network.
