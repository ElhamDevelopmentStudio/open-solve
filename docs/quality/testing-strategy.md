# Testing Strategy — Phase 13

## Layers

- **Unit tests** (Vitest):
  - `tests/security/*.test.ts` harden hashing, encryption, markdown sanitizers, and deletion helpers.
  - `tests/leaderboard-realtime.test.ts` covers realtime reducers.
  - `tests/prisma-crud.test.ts` sanity-checks Prisma mappings against the latest schema.
- **Integration tests** (Vitest + Prisma):
  - `tests/prisma-crud.test.ts` exercises create/update/delete flows with the disposable schema that `vitest.setup.ts` wires up.
  - Router-level tests run via `npm run test` to ensure Zod validation + tRPC context rules stay intact.
- **E2E tests** (Playwright):
  - `tests/e2e/smoke.spec.ts` keeps marketing/auth flows alive.
  - New contest-wizard UX is covered indirectly by React Testing Library stories; Playwright will include the wizard once the staff routes are deployable in CI.
- **Load tests** (k6):
  - `tests/load/contest-surge.k6.ts` simulates the contest API at surge rates.
- **Observability smoke**:
  - `app/api/internal/metrics` now exposes Prometheus data that CI can scrape after deployments.

## Commands

| Layer         | Command                         | Notes |
|---------------|---------------------------------|-------|
| Lint          | `npm run lint`                  | Targets all wizard + API files touched in Phase 13. |
| Format        | `npm run format:check`          | Applies Prettier rules. |
| Type check    | `npm run typecheck`             | Uses `tsconfig.json` to catch schema drift. |
| Unit/integration | `npm run test`              | Spins up disposable Prisma schema; `SENSITIVE_DATA_KEY` is injected via `vitest.setup.ts`. |
| E2E           | `RUN_E2E=true npx playwright test` | Runs smoke spec against the local dev server. |
| Load          | `k6 run tests/load/contest-surge.k6.ts` | Assumes Rabbit + DB running in the same network. |

## Coverage Expectations

- `npm run test -- --coverage` must remain above 75% lines for security-sensitive helpers (`lib/security/*`).
- CI rejects any regression in the wizard files (`components/contests/**/*`) because `npm run lint` is scoped there.
- All new files are TypeScript strict-mode clean—`tsconfig` forbids `any` in the new code paths.

## Automation Hooks

- GitHub Actions (or any CI) should run:
  1. `npm ci`
  2. `npm run lint`
  3. `npm run typecheck`
  4. `npm run test`
  5. `npm run build`
- Production deploys scrape `/api/internal/metrics` after health checks to verify the new histograms emit data.
