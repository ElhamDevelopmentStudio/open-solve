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
