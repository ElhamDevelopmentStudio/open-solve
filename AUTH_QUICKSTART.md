# Authentication System - Quickstart

## Overview

Complete in-house authentication system built with tRPC, Prisma, and Next.js 16. Includes email/password, 2FA/TOTP, magic links, OAuth foundation, sessions, rate limiting, and email system.

## Environment Setup

Add to your `.env`:

```env
# Core Auth
SESSION_SECRET="your-32-character-secret-here"
APP_URL="http://localhost:3000"

# Email (Resend - optional for development)
RESEND_API_KEY="re_xxxxx"
RESEND_FROM_EMAIL="auth@yourdomain.com"

# OAuth (optional)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Generate SESSION_SECRET: `openssl rand -base64 32`

## Database Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## Architecture

### Core Components

**Auth Utilities** (`lib/auth/`):

- `password.ts` - bcrypt hashing & validation
- `session.ts` - HttpOnly cookie sessions (8h default, 30d with remember-me)
- `tokens.ts` - Secure token generation & verification
- `totp.ts` - 2FA TOTP & recovery codes
- `rate-limit.ts` - In-memory rate limiting per route
- `audit.ts` - Authentication event logging

**Email System** (`lib/email/`):

- `resend.ts` - Resend API client (gracefully degrades without API key)
- `templates.ts` - HTML email templates (verify, reset, magic link, 2FA, etc.)
- `index.ts` - Send functions with EmailMessage logging

**tRPC Router** (`lib/trpc/router/auth.ts`):

- All auth procedures (sign-up, sign-in, 2FA, password management, etc.)
- Rate limiting per action
- Audit logging for security events

**Middleware** (`lib/trpc/trpc.ts`):

- `publicProcedure` - No auth required
- `protectedProcedure` - Requires valid session
- `adminProcedure` - Requires ADMIN role
- `curatorProcedure` - Requires PROBLEM_CURATOR role

**Context** (`lib/trpc/context.ts`):

- Automatically loads session from cookies
- Available in all tRPC procedures as `ctx.user` and `ctx.session`

### UI Pages

**Auth Routes** (`app/(auth)/`):

- `/sign-in` - Email/password + 2FA challenge
- `/sign-up` - Registration with email verification
- `/auth/forgot-password` - Request password reset
- `/auth/reset-password` - Reset with token
- `/auth/verify-email` - Email verification handler

**Settings Routes** (`app/(platform)/settings/`):

- `/settings/account` - Profile, sessions, account deletion
- `/settings/security` - Password, email, 2FA management

## Key Features

### Sessions

- HttpOnly cookies (secure, SameSite=Lax)
- Dual token: session (8h) + refresh (30d)
- Device tracking (IP, user agent)
- Per-device revocation
- Automatic rotation on privilege change

### Two-Factor Auth

- TOTP via authenticator apps (Google Auth, Authy, etc.)
- QR code + manual secret display
- 10 single-use recovery codes (hashed)
- Recovery code regeneration on 2FA disable

### Rate Limiting

- Per-IP + per-action limits
- Configured in `lib/auth/rate-limit.ts`:
  - Signup: 3/hour
  - Login: 5/15min
  - Password reset: 3/hour
  - Email verify: 3/hour
  - Magic link: 3/hour
  - 2FA attempts: 5/5min

### Audit Logging

- All auth events logged to `AuthAuditLog`
- IP address, user agent, timestamps
- Queryable per user
- Visible in admin/user dashboards

### Email System

- Templates: verify, reset, magic link, 2FA enabled, email changed
- Sends via Resend (dev mode: console.log only)
- `EmailMessage` table tracks delivery status
- Link tracking disabled for security
- 15-minute TTL for all tokens

### Security

- Passwords: bcrypt (12 rounds), strength validation
- Sessions: HttpOnly + Secure + SameSite
- Tokens: single-use, short-lived, HMAC-signed
- No email enumeration (consistent error messages)
- CSRF protection via SameSite cookies
- Rate limiting prevents brute force

## Usage Examples

### Client-side (React Server Component)

```tsx
import { trpc } from "@/lib/trpc/client";

const { data: session } = trpc.auth.getSession.useQuery();
if (!session) return <SignInForm />;
return <div>Welcome {session.user.email}</div>;
```

### Server-side (tRPC Procedure)

```ts
import { protectedProcedure } from "@/lib/trpc/trpc";

export const myRouter = router({
  myProtectedRoute: protectedProcedure.query(({ ctx }) => {
    // ctx.user is guaranteed to exist
    return { message: `Hello ${ctx.user.email}` };
  }),
});
```

### Middleware (Route Protection)

Session is auto-loaded in tRPC context. Use appropriate procedure type:

- `publicProcedure` - anyone
- `protectedProcedure` - authenticated users
- `adminProcedure` - admin only
- `curatorProcedure` - curator or admin

## Schema Overview

**User**: id, email, handle, hashedPassword, role, twoFactorEnabled, emailVerified, timestamps
**Session**: id, userId, sessionToken, refreshToken, expires, ipAddress, userAgent, twoFactorVerified
**TwoFactorSecret**: userId, secret
**TwoFactorRecoveryCode**: userId, codeHash, consumedAt
**AuthAuditLog**: userId, action, ipAddress, userAgent, metadata, createdAt
**EmailMessage**: userId, type, templateVersion, resendMessageId, status, providerReason, timestamps
**VerificationToken**: identifier (email), token, type, expires

## Extending

### Add OAuth Provider

1. Update `lib/validators/auth.ts` with OAuth schemas
2. Add provider routes in `lib/trpc/router/auth.ts`
3. Use `Account` model to link external accounts
4. Handle token exchange & account linking

### Custom RBAC

- Add roles to `UserRole` enum in `schema.prisma`
- Create custom middleware in `lib/trpc/trpc.ts`
- Example: `moderatorProcedure`, `premiumProcedure`

### Email Webhooks

- Implement `/api/webhooks/resend` route handler
- Update `EmailMessage` status on delivery/bounce/complaint
- Handle suppression list for bounced emails

## Troubleshooting

**Build fails with env validation**: Set `SKIP_ENV_VALIDATION=true npm run build`
**Emails not sending**: Check `RESEND_API_KEY` or check console logs (dev mode)
**Database errors**: Run `npx prisma migrate dev`
**Session not persisting**: Check cookie settings (Secure flag requires HTTPS in production)

## Security Checklist

- [x] Passwords hashed with bcrypt
- [x] Sessions in HttpOnly cookies
- [x] CSRF protection via SameSite
- [x] Rate limiting per action
- [x] Email verification required
- [x] 2FA available for all users
- [x] Recovery codes for 2FA
- [x] Audit log for sensitive actions
- [x] No email enumeration
- [x] Single-use tokens
- [x] Account deletion (GDPR)
- [x] Per-device session management

## Production Checklist

- [ ] Set `SESSION_SECRET` to strong random value
- [ ] Configure `APP_URL` to production domain
- [ ] Set up Resend account & verify domain
- [ ] Configure DKIM/SPF/DMARC for email domain
- [ ] Enable HTTPS (Secure cookie flag)
- [ ] Set up database backups
- [ ] Monitor rate limit hits
- [ ] Review audit logs regularly
- [ ] Test 2FA enrollment & recovery flows
- [ ] Test email deliverability across providers


