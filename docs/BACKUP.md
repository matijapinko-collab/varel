# Backup & restore

## What to back up
1. **PostgreSQL database** — all content, settings, users, analytics.
2. **R2 media bucket** — uploaded images.
3. **Git repository** — the code (already on GitHub).

## Database backup (manual)

```bash
# Neon/production (needs pg_dump installed; Neon also has built-in branching/PITR)
pg_dump "$DATABASE_URL" --format=custom --file="varel-$(date +%F).dump"
```

Store dumps **off the server** (e.g. a private R2/S3 `varel-backups` bucket or
local encrypted disk). After each backup, click "Record backup" in
Admin → Version Manager so the status is visible in the dashboard.

## Automatic backups
- **Neon**: point-in-time recovery is built in (check plan retention) — this is
  the primary daily-backup mechanism.
- Optionally add a scheduled GitHub Action running the `pg_dump` above to R2.

## Restore

```bash
pg_restore --clean --if-exists --dbname "$DATABASE_URL" varel-YYYY-MM-DD.dump
```

## Media backup
R2 → use Cloudflare's S3-compatible `rclone`/`aws s3 sync` to mirror the bucket:

```bash
rclone sync r2:varel-media ./backup/media
```
