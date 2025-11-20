# 🧩 OpenSolve — The Open-Source LeetCode Alternative

**OpenSolve** is a next-generation, open-source platform for algorithmic practice, coding challenges, and technical interviews — built for the community, by the community.
It’s a **self-hostable**, **extensible**, and **beautifully designed** clone of LeetCode with full-stack flexibility and zero paywalls.

---

## 🚀 Why OpenSolve?

LeetCode is great — but closed.
OpenSolve brings the same experience to the open world:

- 💻 **Open Source** — 100% free to use, self-host, and modify.
- ⚙️ **Modern Stack** — Built with **Next.js**, **PostgreSQL**, and **TypeScript**.
- 🔐 **Self-Hostable** — Deploy locally or on your own cloud (Docker support included).
- 🧠 **Smart Judge** — Supports multi-language execution (Python, C++, Java, JS) with sandboxed Docker containers.
- 🏗️ **Problem Builder** — Create, import, and manage your own problems with test cases and constraints.
- 🧑‍💻 **User Profiles &amp; Leaderboards** — Compete, compare, and climb the ranks.
- 🎨 **Sleek UI** — Clean, minimal, and dark-mode ready.

---

## 🧱 Tech Stack

| Layer                      | Technology                                                                     |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Frontend**               | Next.js, TailwindCSS, React Query                                              |
| **Backend**                | Next.js, PostgreSQL, Prisma ORM                                                |
| **Judging System**         | Docker-isolated code runner (supports multiple languages)                      |
| **Auth**                   | JWT + OAuth2 (GitHub, Google)                                                  |
| **Deployment**             | Docker Compose / Fly.io / Railway / Supabase backend                           |
| **AI Features (optional)** | OpenAI / Ollama local inference for hints, explanations, and code optimization |

---

## 🧠 Roadmap

- [ ] Problem CRUD & submissions
- [ ] Code execution engine
- [ ] Contests & rating system
- [ ] Teams & collaborative problem solving
- [ ] Offline mode for universities & bootcamps

---

## 🤝 Contributing

We love PRs!
Clone, fork, or self-host — and help make OpenSolve the ultimate open coding playground.

```bash
git clone https://github.com/opensolve/opensolve.git
cd opensolve
docker-compose up
```

---

## ⚡ License

**MIT License** — Free for personal, educational, and commercial use.
No restrictions. Just code.

---

## 🌍 Vision

> _“Code is meant to be shared, not locked behind paywalls.”_
> OpenSolve aims to democratize algorithmic practice and make technical learning accessible to everyone — from students in Kabul to developers in Silicon Valley.

---

## 🪣 Object Storage (MinIO / S3)

Uploads (avatars, attachments, future problem assets) use the S3 API via `lib/storage/minio.ts`. For local/self-hosted deployments we bundle a MinIO stack that behaves exactly like AWS S3.

1. **Set the environment variables** (see `.env.example` for defaults):

   ```env
   MINIO_ENDPOINT=localhost:9000
   MINIO_BUCKET=opensolve-assets
   MINIO_ACCESS_KEY=opensolve
   MINIO_SECRET_KEY=opensolve-secret
   MINIO_REGION=us-east-1
   MINIO_USE_SSL=false
   MINIO_PUBLIC_URL=http://localhost:9000
   MINIO_ROOT_USER=opensolve          # only used by docker compose
   MINIO_ROOT_PASSWORD=opensolve-secret
   ```

2. **Start MinIO** (runs alongside the Next.js app):

   ```bash
   docker compose up minio -d
   ```

   - API: `http://localhost:9000`
   - Console UI: `http://localhost:9001`

3. **Provision the bucket (one-time).** Use the bundled MinIO Client profile:

   ```bash
   docker compose --profile storage up minio-mc
   ```

   The helper exits after calling `mc mb --ignore-existing local/$MINIO_BUCKET`, so it’s safe to rerun.

4. **Run the app** (`docker compose up app`). Upload routes will now stream directly into your MinIO bucket. In production, point the same variables at any S3-compatible endpoint (e.g., AWS S3, DigitalOcean Spaces, Cloudflare R2) and update `MINIO_PUBLIC_URL` to whatever domain/CDN exposes the objects.

If the storage variables are omitted the upload endpoints throw a descriptive error, so you can disable attachments entirely if desired.

## 🧑‍⚖️ Judge Worker & RabbitMQ

Phase 7 introduces a standalone judge worker that consumes RabbitMQ queues and runs submissions inside Docker sandboxes.

1. **Configure env vars**

   ```env
   JUDGE_RABBIT_URL=amqp://opensolve:opensolve@localhost:5672
   JUDGE_RABBIT_PREFETCH=2
   JUDGE_SANDBOX_DRIVER=docker   # or mock for simulator mode
   JUDGE_SANDBOX_WORKDIR=/tmp/opensolve-judge
   ```

2. **Start RabbitMQ + worker**
   - Dev mode: `docker compose --profile judge up rabbitmq judge-worker`
   - Bare metal: run `npm run judge:worker` alongside `npm run dev`

3. **Manual review tools** — staff can review hybrid/manual submissions at `/staff/judge/manual`, posting `MANUAL_ACCEPTED`, `MANUAL_PARTIAL`, or `MANUAL_REJECTED` verdicts with notes/score.

When RabbitMQ is unavailable (or the worker is down) the app falls back to the inline simulator so basic flows keep working.

---

## ✅ Testing

Integration tests exercise Prisma CRUD flows against a disposable Postgres schema.

1. Ensure Postgres is running and migrations have been generated (`npx prisma migrate deploy`).
2. Provide the required environment variables (the tests read from `.env`; at minimum set `DATABASE_URL`, `SESSION_SECRET`, and `APP_URL`).
3. Run:

```bash
npm run test
```

Vitest will clone the schema into `test_<worker>` automatically, apply migrations, and run the CRUD suites without touching your development data. Use `npm run test:watch` during development for faster feedback.

---

## 📈 Metrics & Observability

- scrape `GET /api/internal/metrics` with `Authorization: Bearer $METRICS_ACCESS_TOKEN`.
- Exposes `opensolve_trpc_duration_seconds`, `opensolve_submission_events_total`, `opensolve_judge_queue_messages`, and contest gauges.
- Deployments should call this endpoint after rolling out to ensure judge queues and tRPC calls are healthy.

---

## 🛡️ Creating an admin account

Roles gate problem authoring, publishing, and moderation tools. To promote one of your users to `ADMIN`:

1. Seed or sign up the user as usual so they exist in the `User` table.
2. Run Prisma Studio (or any SQL client) and update the `role` column to `ADMIN`.

```bash
npx prisma studio
```

Open the **User** table, locate the account, and change the `role` dropdown to `ADMIN`. The change takes effect immediately—sign back in and you’ll see the staff console plus every curator tool. For scripted environments you can run:

```bash
npx prisma db execute --script "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'you@example.com';"
```

Remember: admins can publish/archive problems, edit roles, and bypass reviewer restrictions, so keep these accounts limited.

---

## 🛠 Deployment & Ops

- **Environment parity:** `ops/env/*.env` hold canonical dev/staging/prod configs. Pair them with the compose files under `ops/docker/`.
- **CI/CD pipeline:** `.github/workflows/ci-cd.yml` runs lint → tests → Playwright → Docker builds → image pushes → staged releases.
- **Deploy targets:** use the docker-compose stacks under `ops/docker/` for dev/staging/VM setups or the [`fly.toml`](fly.toml) spec for Fly.io. Secrets live in `ops/env/*.env`.
- **Runbooks:** outages, judge issues, DB slowdowns, and restore drills live under [`docs/quality`](docs/quality).
