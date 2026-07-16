# Varel HVAC B2B — QA, Security & Go-Live

Reference for the multi-tenant HVAC SaaS built inside varel.io. The whole module
is gated behind the `HVAC_B2B_ENABLED` environment flag: while it is unset, every
`/hvac-b2b/*` route shows the coming-soon page and **no request touches `hvac_*`
tables**, so the code can ship to production before the go-live switch is flipped.

## Automated tests

```bash
npm test
```

Runs the Node built-in test runner over `tests/**/*.test.ts` with the
`react-server` condition (so `server-only` modules import cleanly). Node 24+ runs
the TypeScript directly. Coverage:

- `tests/hvac/documents.test.ts` — invoice/quote line maths: qty × price, discount
  before VAT, non-VAT (0%) handling, 2-decimal boundary rounding, document totals,
  billing name/address formatting.
- `tests/hvac/reminders.test.ts` — reminder scheduling buckets
  (FUTURE/UPCOMING/READY), the rule that manual states are never auto-overwritten,
  and next-service-date arithmetic.
- `tests/hvac/logic.test.ts` — OIB checksum validation, calendar overlap +
  lane-layout algorithm, and view ranges (day/week).
- `tests/hvac/isolation.test.ts` — **structural tenant-isolation guard** (below).

These are pure-logic tests and need no database. Flows that require a DB/session
(create → issue → pay, booking submission, reminder → inquiry) are verified
manually in the preview browser during each phase.

## Multi-tenant isolation

The security model:

- Every `hvac_*` row carries an indexed `tenantId`.
- Server code reaches tenant data **only** through `requireTenantContext()` /
  `requireTenantRole()` (`src/lib/hvac/tenant.ts`), which re-verify the session,
  the active membership, and the tenant on every request. Client-supplied tenant
  ids are never trusted.
- Superadmin actions go through `requireSuperadmin()`; the public booking API and
  the public document view gate on `isHvacB2bEnabled()` and treat their
  slug/token as the sole authorization.

`tests/hvac/isolation.test.ts` enforces this structurally: it fails if any
`src/server/actions/hvac-*.ts` module (or any exported action inside it) does not
call a guard. Internal helpers that receive an already-authorized `tenantId` as
their first argument (e.g. `generateRemindersForTenant`, shared with the
authenticated cron) are exempt by that signature; the auth bootstrap modules are
exempt by name.

## Three separate auth stacks

| Surface | Cookie | Identity | Entry |
|---|---|---|---|
| CMS (varel.io content) | `authjs.session-token` | `User` | `/administracija` |
| HVAC B2B app | `hvac_b2b_session` (jose HS256) | `HvacUser` + `HvacTenantUser` | `/hvac-b2b/prijava` |
| HVAC superadmin | `hvac_sa_session` (jose HS256, sameSite=strict, 4h) | `HvacSuperadmin` | `/hvac/superadministracija` |

They never share cookies or tables.

## Security checklist

- [x] Tenant isolation enforced server-side on every request (guards above).
- [x] Passwords hashed with bcrypt (cost 12). Superadmin password policy enforced;
      changing it bumps `sessionVersion` and invalidates all existing sessions.
- [x] Public forms (early-access lead, hosted booking) use a honeypot field +
      DB-backed rate limiting by hashed IP (`requestMeta().ipHash`).
- [x] Admin + superadmin surfaces are `noindex` across five layers (authz, HTML
      meta, `X-Robots-Tag` via `proxy.ts`, robots.txt, sitemap exclusion).
- [x] Issued invoices are immutable (only payments/cancel); signed work orders are
      locked; converted quotes are frozen.
- [x] Money is `Decimal(10,2)`; non-VAT-registered companies never charge VAT.
- [ ] **F4 (open P0):** work-order photos and signatures upload to *public* Vercel
      Blob (unguessable URLs). Move to private storage + signed URLs before real
      customer data is handled at scale.
- [ ] **Superadmin TOTP 2FA** — schema/otplib ready, deferred by owner decision.

## Go-live runbook

1. Generate the `hvac_*` DDL:
   `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
   (prod `DATABASE_URL` is injected at runtime and unreachable from the CLI, so
   apply it via a one-shot token-protected route or `prisma db execute`, as with
   previous phases). Confirm all `hvac_*` tables + the Phase 6 columns
   (`publicToken`, invoicing settings) exist.
2. Set production env: `HVAC_B2B_ENABLED=true`, `INITIAL_HVAC_SUPERADMIN_USERNAME`,
   `INITIAL_HVAC_SUPERADMIN_PASSWORD` (strong, not reused), `CRON_SECRET`,
   `RESEND_API_KEY` + verified `EMAIL_FROM` (else all email is a silent no-op).
   See `docs/ENVIRONMENT_VARIABLES.md`.
3. Verify crons registered in `vercel.json`: `/api/cron/deals` (05:00) and
   `/api/cron/hvac-reminders` (06:00). The reminders cron is a no-op while the
   flag is unset.
4. Smoke test after enabling: register a company → onboarding → create a customer,
   appointment, work order (sign it), invoice (issue + pay), quote, booking page,
   reminder. Confirm the superadmin console lists the tenant.

## Backups

Follow `docs/BACKUP.md` for the database provider (Prisma Postgres, STARTER plan).
The `hvac_*` tables are part of the same database, so the existing backup covers
them. Recommended additions before go-live:

- Enable a Prisma usage/billing alert (a prior outage was quota exhaustion).
- Do one **restore test** into a scratch database to confirm the dump is usable.
- Vercel Blob assets (photos/signatures/logos) are stored separately from the DB —
  include the blob store in the backup plan, or rely on its provider durability.

## Known issues / follow-ups

- **Build blocker (external):** a concurrent `bisneyscrm` workstream imports
  `next/headers` from a pages-router path, which fails `next build`. Not part of
  HVAC; must be fixed before the repo builds/deploys. HVAC phases verify via
  `tsc --noEmit` + the preview server meanwhile.
- Stray `" 2"`-suffixed duplicate source files from an earlier phase are flagged
  for removal (they are unreferenced and do not create routes).
- No email digest for due reminders yet (surfaced in the UI + reports instead).
