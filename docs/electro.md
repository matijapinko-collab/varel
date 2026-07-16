# Varel Electric (`/electro`)

Multi-tenant SaaS for electrical-installation companies that work for investors,
general contractors and large construction projects. Built inside the Varel repo
following the Bisneys CRM / HVAC embedding pattern: `Electro*`-prefixed Prisma
models (`electro_*` tables), its own auth systems, feature-flagged, isolated from
the public site, the CMS admin, Bisneys and HVAC.

Product brief: the full numbered specification (§1–§80) supplied by Matija
(referenced below as "brief §N"). GPS tracking of employees is explicitly out of
scope and is never to be built.

## Architecture

- **Routes:** `src/app/(electro)/` route group, own `<html lang="hr">` shell,
  excluded from locale routing in `src/proxy.ts`.
  - Public (indexable): `/electro`, `/electro/funkcionalnosti`, `/electro/cijene`,
    `/electro/kontakt`, `/electro/registracija`, `/electro/prijava`,
    `/electro/postavi-lozinku/[token]`
  - App (noindex, cookie-gated): `/electro/app/...`
  - Superadministration (noindex, separate cookie): `/electro/superadministracija`
- **Feature flag:** `ELECTRO_ENABLED === "true"` (`isElectroEnabled()`), checked
  in layouts, entry pages and every auth-establishing action.
- **Tenancy:** every tenant-owned model carries `companyId`. Server guards load
  the tenant context from the session user; **no action ever trusts a
  client-supplied `companyId`** (enforced by `tests/electro/isolation.test.ts`).
  Superadmin actions are the only ones that take a `companyId` parameter, because
  the caller is a verified global superadmin.
- **Two session systems** (jose HS256 JWT, httpOnly cookies, `AUTH_SECRET`):
  - `electro_session` → `ElectroUser` (company staff), 12 h
  - `electro_sa_session` → `ElectroSuperadmin` (platform staff), 1 h
  Guards re-check the DB on every request (isActive, status, `sessionVersion`,
  company not archived, subscription status). JWT alone is never sufficient.
- **RBAC (brief §7):** roles are rows (`ElectroRole` + `ElectroUserRole`), one
  user can hold several (ADMIN, ENGINEER, SITE_MANAGER, ELECTRICIAN).
  `ElectroPermission`/`ElectroRolePermission` exist in the schema for
  finer-grained checks; per-project membership/overrides arrive in Phase C.
- **Subscription (brief §5):** plans are data (`ElectroSubscriptionPlan` +
  `ElectroPlanLimit` key-value limits), never hardcoded. Statuses:
  `PENDING_APPROVAL → TRIAL → ACTIVE | PAST_DUE | SUSPENDED | CANCELLED | EXPIRED`.
  Registration is **manually approved** by a superadmin; only approval starts the
  10-day trial (`plan.trialDays`). An expired trial is computed as `EXPIRED` by
  `effectiveSubscriptionStatus()` even before any background job persists it.
- **Audit:** `electroAudit()` → `ElectroAuditLog`, append-only, never throws,
  hashes IPs, never records passwords or raw invite tokens.
- **Invites (brief §9):** single-use, 7-day expiry, only the SHA-256 token hash
  stored (`ElectroInvite`). Users always set their own passwords.

## Key files

| Area | Path |
| --- | --- |
| Schema block | `prisma/schema.prisma` (models `Electro*`, end of file) |
| Constants / roles | `src/lib/electro/constants.ts` |
| Sessions + flag | `src/lib/electro/auth/session.ts` |
| Guards / tenant context | `src/lib/electro/auth/guard.ts` |
| Password policy | `src/lib/electro/auth/password.ts` |
| Subscription helpers | `src/lib/electro/subscription.ts` |
| Invites | `src/lib/electro/invites.ts` |
| Bootstrap (roles, plans, superadmin) | `src/lib/electro/bootstrap.ts` |
| Audit writer | `src/lib/electro/audit.ts` |
| Plan-limit enforcement | `src/lib/electro/limits.ts` |
| Team helpers (last-admin, counts) | `src/lib/electro/team.ts` |
| Pure limit/team messages (tested) | `src/lib/electro/limit-messages.ts` |
| Auth actions | `src/server/actions/electro-auth.ts` |
| Registration action | `src/server/actions/electro-registration.ts` |
| Superadmin company actions | `src/server/actions/electro-superadmin.ts` |
| Superadmin plan/limit actions | `src/server/actions/electro-superadmin-plans.ts` |
| Team (employee) actions | `src/server/actions/electro-team.ts` |
| Company/branch/department actions | `src/server/actions/electro-company.ts` |
| App nav (role-scoped) | `src/components/electro/layout/nav.ts` |
| Project status machine (tested) | `src/lib/electro/projects.ts` |
| Per-project access rules | `src/lib/electro/project-access.ts` |
| Investor actions | `src/server/actions/electro-investors.ts` |
| Project actions | `src/server/actions/electro-projects.ts` |
| Phase/location actions | `src/server/actions/electro-project-structure.ts` |
| Routes | `src/app/(electro)/…` |
| Components | `src/components/electro/…` |
| Tests | `tests/electro/{isolation,logic,limits,projects}.test.ts` |
| Proxy / robots wiring | `src/proxy.ts`, `src/app/robots.ts` |

## Environment variables

```
ELECTRO_ENABLED="true"                      # feature gate
ELECTRO_SUPERADMIN_USERNAME=""              # initial global superadmin (seeded
ELECTRO_SUPERADMIN_EMAIL=""                 # idempotently on first superadmin
ELECTRO_SUPERADMIN_INITIAL_PASSWORD=""      # login; remove after setup)
```

Shared infra reused: `AUTH_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`/`EMAIL_FROM`,
`ADMIN_NOTIFY_EMAIL` (new-registration notifications), `NEXT_PUBLIC_SITE_URL`
(invite links), `STORAGE_PROVIDER` (from Phase D).

## Local dev

1. `npm run db:dev` (local Prisma Postgres), `npm run db:push`, `npm run db:generate`
2. Set the `ELECTRO_*` vars in `.env`, `ELECTRO_ENABLED="true"`
3. `npm run dev` → `/electro`
4. Superadmin: log in at `/electro/superadministracija/prijava` (first login
   seeds roles, plans and the superadmin from env)
5. Full loop: `/electro/registracija` → approve in superadministracija → invite
   link (printed to the server console when email is unconfigured) →
   `/electro/postavi-lozinku/<token>` → `/electro/app/dashboard`

Production DDL: same process as Bisneys (`docs/bisneyscrm.md` → "Database
migration (production)") — `prisma migrate diff` against prod, apply manually.

## Roadmap

- **A — Foundation** ✅ (this phase): tenancy schema, dual auth, RBAC base,
  plans/limits data model, registration → manual approval → 10-day trial →
  admin invite, suspension/reactivation/trial-extension/plan change,
  superadministracija v1, public marketing pages, audit log, isolation tests.
  Brief §1–§9, §62 (core), §72–§73 (statuses), §76 (MVP start).
- **B — Company & team** ✅ (done + verified 2026-07-16): branches/departments
  (soft-deactivated), employee CRUD with email invites, multi-role editing,
  last-admin protection (brief §6, §9, §14), plan-limit enforcement
  (`maxUsers`, `maxAdmins`, `maxBranches`) via `src/lib/electro/limits.ts`,
  company profile editor, role-scoped app nav, superadmin plan/limit editor UI
  (`/electro/superadministracija/paketi`). Actions: `electro-team.ts`,
  `electro-company.ts`, `electro-superadmin-plans.ts`. Pure messages in
  `limit-messages.ts` (db-free, tested).
- **C — Investors & projects** ✅ (done + verified 2026-07-16): investors +
  contacts (§15), projects with per-company codes, status machine + status
  history with reason-required transitions (§17), hierarchical locations (§18),
  phases (§19), project members + per-project access (§13), optimistic locking
  on project edits (§70). Actions: `electro-investors.ts`, `electro-projects.ts`,
  `electro-project-structure.ts`. Access rules in `project-access.ts`, status
  machine in `projects.ts` (pure, tested). Still to do in a C2 pass: project
  templates and the duplication wizard (§19–§20), phase templates.
- **D — Documents & photos** ✅ (done + verified 2026-07-16): document center
  with categories, versioning (§25 — a new version never overwrites; old stays
  valid until the new one is approved), engineer approval workflow (§22–§24),
  upload MIME/size validation (§64–§65), work photos with structured metadata
  (§29). Storage via `src/lib/storage.ts` (local-fallback in dev, Blob/R2 in
  prod). Actions: `electro-documents.ts`, `electro-photos.ts`; logic in
  `documents.ts` (tested).
- **E — Tasks, diary, issues** ✅ (done + verified 2026-07-16): tasks with
  review-gated completion (§21 — never auto-completes), site diary with lock +
  revision immutability (§33), issues with no OPEN→CLOSED shortcut and
  solution-required resolution (§36), role dashboards (§58). Actions:
  `electro-tasks.ts`, `electro-issues.ts`, `electro-daily-logs.ts`; state
  machines in `workflow.ts` (tested).
- **F — Warehouses & materials** ✅ (done + verified 2026-07-16): warehouses
  (§37), items with min-stock (§38), **immutable stock ledger** — balance is
  SUM(movements), never a mutable field (§40), consumption with confirmation +
  **double-spend & negative-stock protection** verified end-to-end (§41–§42),
  manual movements with mandatory reasons (§49), low-stock alerts (§44).
  Actions: `electro-warehouses.ts`, `electro-consumption.ts`; ledger in
  `stock.ts`. (Deferred to F2: two-step transfers §43, ERP import wizard §50–§52.)
- **G — Money & reports** ✅ (done + verified 2026-07-16): project budget +
  cost log with utilisation & margin (§45–§48), generated HTML/PDF reports
  (§34–§35, print-to-PDF, own version rows), audit-log viewer (§60), global
  search respecting permissions (§59), idempotent demo company (§79). Actions:
  `electro-budget.ts`, `electro-reports.ts`; math in `budget.ts` (tested),
  report builder in `report.ts`.
- **H — Phase 2+** (post-MVP, per brief §76): investor portal, XML/ERP import,
  serials/warranties, AI photo analysis, e-signing, PWA offline, R2 storage,
  procurement, change requests, project/phase templates + duplication wizard
  (§19–§20), two-step stock transfers (§43), notifications delivery (§57).

## Deployment

The full module builds for production (`npm run build` — all `/electro` routes
compile). To deploy:

1. **Schema:** apply `prisma/electro-migrations/0001_electro_init.sql` to the
   production database (41 tables, 19 enums, all `electro_*` — isolated from the
   rest of the schema). Generated via
   `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`
   then filtered to electro objects.
2. **Env (Vercel → Project Settings → Environment Variables):** set
   `ELECTRO_ENABLED="true"`, the `ELECTRO_SUPERADMIN_*` seed vars, a
   `STORAGE_PROVIDER` (`vercel_blob` + `BLOB_READ_WRITE_TOKEN`, or `r2`), and
   optionally `ELECTRO_SEED_TOKEN` for the demo.
3. **Deploy:** push to the connected git branch; Vercel builds and deploys.
4. **Bootstrap:** log in at `/electro/superadministracija/prijava` (first login
   seeds roles, plans and the superadmin from env), then optionally
   `POST /api/electro/seed-demo` with `x-electro-seed-token` for demo data.

## Current limitations (end of Phase G)

- Plan limits enforced for users/admins/branches/investors/active projects;
  document/warehouse-count limits are modelled but not yet gated.
- Project templates, duplication wizard, two-step transfers, ERP import,
  notification delivery and the investor portal are deferred (Phase H).
- `ElectroPermission`/`ElectroRolePermission` tables exist but capability-level
  checks aren't used yet — authorization is role-key based (ADMIN vs member).
  Per-project membership/overrides come in Phase C.
- No impersonation, no MFA, no background-job queue yet (trial expiry is
  computed on read; a Vercel cron can persist transitions later).
- Email verification for registration is implicit via the invite link.
- The engineer/site-manager/electrician app views are placeholders until their
  data modules (projects, tasks, documents) exist — only ADMIN has functional
  screens (employees, settings) beyond the shared dashboard.
