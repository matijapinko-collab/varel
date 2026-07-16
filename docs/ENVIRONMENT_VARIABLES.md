# Environment variables

> **Never commit real secrets.** `.env` is gitignored; `.env.example` documents *names only*.
> All variables below are **server-side** unless prefixed `NEXT_PUBLIC_`.

## Core

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection (prod is injected at runtime by the DB integration) |
| `SHADOW_DATABASE_URL` | Local Prisma shadow DB |
| `AUTH_SECRET` | Signs CMS (Auth.js), HVAC B2B and superadmin sessions |
| `AUTH_URL` / `NEXT_PUBLIC_SITE_URL` | Canonical site URL (`https://varel.io`) |
| `DEFAULT_LANGUAGE` | Default public locale |

## HVAC B2B

| Variable | Purpose |
|---|---|
| `HVAC_B2B_ENABLED` | `"true"` enables the tenant app at `/hvac-b2b`. Unset ⇒ public sees the coming-soon page and no route touches `hvac_*` tables |

## HVAC superadministration

| Variable | Purpose |
|---|---|
| `INITIAL_HVAC_SUPERADMIN_USERNAME` | Username for the one-time bootstrap (production: `mpinko`) |
| `INITIAL_HVAC_SUPERADMIN_PASSWORD` | **Secret.** Initial password, used once. Hashed on bootstrap; invalid after the mandatory first change. Supplied out-of-band — never in code, docs or Git |

Both are read **only** by server-side code (`src/lib/hvac/superadmin.ts`).
`INITIAL_HVAC_SUPERADMIN_PASSWORD` may be **removed after the first password change**.

> ⚠️ Do not reuse a password that has ever appeared in the repository, in chat, or in the
> CMS admin account. See `HVAC_GAP_ANALYSIS.md` §F1.

## Seeds (development only)

| Variable | Purpose |
|---|---|
| `SEED_OWNER_PASSWORD` | Optional deterministic dev password for `npm run db:seed`. If unset, a random one is generated and printed once. Seeds must never run against production |

## Email / storage / integrations

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Transactional email (graceful no-op when unset) |
| `STORAGE_PROVIDER`, `BLOB_READ_WRITE_TOKEN` | Media storage (currently Vercel Blob, public URLs — see gap analysis F4) |
| `CRON_SECRET` | Protects cron + one-shot migration endpoints |
| `MIGRATION_TOKEN` | Optional alternative token for one-shot migrations |
| `CHROME_EXECUTABLE_PATH` | Optional Chromium for the LLM scanner's rendered-DOM layer |
| `AMAZON_*` | Price Checker (PA-API) |

## Rotation checklist

1. Change the value in Vercel → Environment Variables.
2. Redeploy (server-side values are read at runtime).
3. For `AUTH_SECRET`, rotation invalidates **all** sessions across CMS, B2B and superadmin.
