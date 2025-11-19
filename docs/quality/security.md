# Security Hardening — Phase 13

## Sensitive Data Handling

- Emails now store **hash + ciphertext** via `lib/security/email.ts`.
  - New Prisma columns: `emailHash`, `emailEncrypted` (seeded + enforced during auth flows).
  - Account deletion replaces the record with `buildDeletedUserProfile`, ensuring PII is destroyed while content stays attributed to a tombstone handle.
- `SENSITIVE_DATA_KEY` is required at startup; Vitest injects a deterministic value for local runs.
- Admins can mark users as `DELETED` in the panel or trigger a full purge.

## Sanitization

- `lib/security/markdown.ts` sanitizes all UGC (discussions, trails, proposals) and flags spoilers.
- `sanitizePlainInput` guards against HTML injection in plain text inputs.
- Contest builder enforces Zod constraints on slug, description, and schedule fields.

## Secrets & Logging

- `lib/logger.ts` already redacts `password`, `token`, `code`, `secret`. Phase 13 adds email encryption to avoid raw addresses in the DB.
- `.env.example` includes `METRICS_ACCESS_TOKEN` so Prometheus scraping can be gated.
- `vitest.setup.ts` ensures `SENSITIVE_DATA_KEY` exists before tests hydrate Prisma.

## Observability Controls

- `/api/internal/metrics` surfaces Prometheus data (`opensolve_trpc_duration_seconds`, queue depth, submission counters).
- Judge worker + submission router emit counters via `lib/observability/metrics.ts`.
- CI can gate merges on these signals to ensure regressions are visible.
