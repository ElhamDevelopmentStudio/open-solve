# Backup & Disaster Recovery — Phase 13

## Backup Schedule

- **Postgres**
  - Nightly full dump via `pg_dump` stored in object storage (`s3://opensolve-backups/<env>/YYYY-MM-DD.sql.gz`).
  - Hourly WAL archiving through `archive_command` to the same bucket for point-in-time recovery.
- **Blob storage**
  - MinIO/S3 bucket replication to a warm region once every 6 hours.
- **Configs & Flags**
  - `SystemSetting` + `FeatureFlag` tables exported nightly as JSON in the same bucket.
- **Judge assets**
  - Docker images are rebuilt weekly and pinned by digest; the digest list lives in Git.

## Restore Procedure

1. Spin up a clean Postgres instance.
2. Restore the latest full dump: `psql < db.sql`.
3. Apply WAL files up to the desired timestamp via `pg_wal` replay.
4. Restore S3/MinIO objects by pointing the new application to the replicated bucket (or re-sync via `mc mirror`).
5. Replay feature flags + system settings from the JSON exports.
6. Rehydrate RabbitMQ queues (optional) by re-running `lib/judge/queue.setupInfrastructure` through the worker bootstrap.
7. Smoke-test using `npm run test` (uses disposable schema) and Playwright smoke to confirm end-user flows.

Target RTO: **< 30 minutes** when backups are healthy. Document the restore in the Admin Incident log.
