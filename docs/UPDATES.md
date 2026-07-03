# Safe update workflow (Version Manager)

Future improvements will be generated with Claude. Pasted code is **never
executed automatically** — updates flow through Git + Vercel with a paper
trail in the admin.

## Standard update flow

1. **Backup** — run the export in docs/BACKUP.md, then click
   "Record backup" in Admin → Version Manager.
2. **Record the update** — in Version Manager, create a new version:
   number (e.g. `0.2.0`), title, changelog, and paste the code /
   migration / config changes Claude produced (for review and history).
3. **Apply locally** — let Claude Code apply the changes in the repo:
   ```bash
   git checkout -b update-0.2.0
   # …apply changes…
   npm run build          # must pass
   npx prisma migrate dev --name <change>   # if the schema changed
   ```
4. **Test locally** — `npm run dev`, check the affected pages + admin.
5. **Deploy** — merge to `main`, push; Vercel builds and deploys.
   If there are migrations: `npx prisma migrate deploy` against production
   DATABASE_URL (or run it as a Vercel build step).
6. **Mark applied** — set the version to "Applied" in the Version Manager.

## Rollback

- **Code**: `vercel rollback` (or revert the merge commit and push).
- **Database**: restore the pre-update backup (docs/BACKUP.md).
- Mark the version "Rolled back" in the Version Manager so history stays accurate.

## Rules

- Never skip the backup before schema migrations.
- Never edit the production database by hand — always through migrations.
- One version record per deployed change-set; keep changelogs human-readable.
