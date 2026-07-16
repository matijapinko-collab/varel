# Bisneys CRM

Internal sales-CRM + recruitment-ATS + Trello-analytics tool, built as an **isolated
module inside the Varel repo** and served at `https://varel.io/bisneyscrm`. It shares
Varel's deployment, database and design system but is otherwise self-contained: its own
route group, its own session/identity, and its own `Bisneys*`-prefixed database tables.
It never affects the public site, blog, `/administracija`, or the HVAC products.

> Status: **Phase A — Foundation** (auth, users/roles, layout + navigation, module
> scaffolding, noindex, feature flag). Trello, business entities, dashboards, the
> relationship engine, finance/alerts and audit UI land in later phases (see Roadmap).

## Architecture

- **Location:** `src/app/(bisneyscrm)/` — a route group with its own `<html lang="hr">`
  layout (Varel has no root layout; each top-level segment renders one).
- **Isolation:** all DB models are prefixed `Bisneys*` (tables `bisneys_*`) so they never
  collide or couple with Varel's models. Domain models are Trello-independent — the
  integration is an adapter: `TrelloCard → sync/mapping → BisneysCompany | BisneysCandidate | BisneysJob`.
- **Auth:** separate identity (`BisneysUser`) and session (cookie `bisneys_session`, a
  jose HS256 JWT signed with `AUTH_SECRET`, httpOnly, Secure in prod, 60-minute lifetime).
  CRM users have **no** access to `/administracija`, and Varel admins have no implicit CRM
  access. bcryptjs (cost 12) for password hashing.
- **Roles:** `SUPERADMIN`, `ADMIN`. Every authorization check is server-side
  (`requireBisneysUser`, `requireBisneysSuperadmin`); hidden UI is never the control.
- **Feature flag:** `BISNEYS_CRM_ENABLED`. Unless it is exactly `"true"`, `/bisneyscrm`
  renders a coming-soon page and no `bisneys_*` table is touched — so the module can ship
  to production disabled, with zero risk to Varel, until it is intentionally turned on.

### Key files

| Concern | Path |
| --- | --- |
| Route group + noindex layout | `src/app/(bisneyscrm)/layout.tsx` |
| Login / change-password / app | `src/app/(bisneyscrm)/bisneyscrm/**` |
| Session + flag + hashing | `src/lib/bisneyscrm/auth/session.ts` |
| Guards (server authz) | `src/lib/bisneyscrm/auth/guard.ts` |
| Password policy | `src/lib/bisneyscrm/auth/password.ts` |
| Role capabilities | `src/lib/bisneyscrm/permissions.ts` |
| Audit writer | `src/lib/bisneyscrm/audit.ts` |
| Seed (env-driven) | `src/lib/bisneyscrm/bootstrap.ts` |
| Auth server actions | `src/server/actions/bisneys-auth.ts` |
| Navigation + shell | `src/components/bisneyscrm/**` |
| Seed endpoint | `src/app/api/bisneyscrm/bootstrap/route.ts` |
| Schema (appended) | `prisma/schema.prisma` (BISNEYS CRM section) |
| Varel wiring | `src/proxy.ts`, `src/app/robots.ts` |

## Environment variables

See `.env.example` (BISNEYS CRM section). Summary:

- `BISNEYS_CRM_ENABLED` — `"true"` to enable; anything else keeps it inert.
- `BISNEYS_BOOTSTRAP_TOKEN` — guards the seed endpoint.
- `BISNEYS_SUPERADMIN_USERNAME|EMAIL|INITIAL_PASSWORD` — seeds `mpinko` (SUPERADMIN,
  `mustChangePassword=false`).
- `BISNEYS_ADMIN_USERNAME|EMAIL|INITIAL_PASSWORD` — seeds `ccoklica` (ADMIN,
  `mustChangePassword=true`).
- `AUTH_SECRET` — reused from Varel for session signing.

**Never commit real passwords.** The `*_INITIAL_PASSWORD` values live only in local `.env`
or Vercel env. Initial passwords are hashed on seed; only the hash is stored — never
logged, returned by any API, shown in the UI, or written to the audit log.

## Local development

```bash
# 1. Start the local Prisma Postgres (port 51214) if not already running
npm run db:dev

# 2. Apply the schema (creates the bisneys_* tables; existing Varel tables untouched)
npm run db:push

# 3. In .env set (local only): BISNEYS_CRM_ENABLED=true, a BISNEYS_BOOTSTRAP_TOKEN,
#    and the two users' credentials.

# 4. Run the app, then seed the initial users
npm run dev
curl -X POST http://localhost:3000/api/bisneyscrm/bootstrap \
  -H "x-bootstrap-token: $BISNEYS_BOOTSTRAP_TOKEN"
```

Log in at `/bisneyscrm/login` with a username **or** email + password.

## Database migration (production)

The prod `DATABASE_URL` is injected by the Prisma integration and is not reachable from
the CLI, and `tsx` seed scripts do not run in this environment. Follow the established
Varel pattern:

1. Generate DDL: `npx prisma migrate diff --from-... --to-schema-datamodel prisma/schema.prisma --script`
   (or a one-shot token-gated DDL endpoint) to create the `bisneys_*` tables in prod.
2. Set the Bisneys env vars in Vercel (including `BISNEYS_CRM_ENABLED=true`).
3. Seed the users: `POST /api/bisneyscrm/bootstrap` with `x-bootstrap-token`.
4. Log in as `ccoklica` and complete the forced password change.

## Permission model

| Capability | SUPERADMIN | ADMIN |
| --- | --- | --- |
| Dashboards, sales/delivery analytics, activities | ✅ | ✅ |
| Edit companies/contacts/candidates/jobs/leads/deals, services, relationships | ✅ | ✅ |
| Manage users, roles, password resets | ✅ | ❌ |
| Trello credentials + integration | ✅ | ❌ |
| Audit log, system settings, alert rules, relationship types | ✅ | ❌ |

Admin can never delete/deactivate/re-role the superadmin, see Trello tokens, change global
security settings, or delete audit/critical data. All enforced server-side.

## Password change

- **Forced first login (`ccoklica`):** after the first login the user is redirected to
  `/bisneyscrm/change-password` and cannot reach any other CRM route until the initial
  password is replaced. Policy: ≥10 chars, upper, lower, digit, special, ≠ current.
- **Anytime:** `/bisneyscrm/settings/account` for both users. A change bumps
  `sessionVersion`, invalidating all other sessions; "log out of all other devices" does
  the same on demand.

## Trello integration *(Phase B — not yet wired)*

Superadmin will configure it at `/bisneyscrm/settings/trello`: enter/authorize Trello
access (stored server-side, encrypted, never returned to the browser), pick the sales and
delivery boards, and map lists → CRM statuses. Mapping is keyed by **Trello list ID**
(`BisneysTrelloList.mappedStatus`) so it survives list renames. Sync (initial +
reconciliation) writes to `bisneys_*` tables; the webhook endpoint will live at
`/api/bisneyscrm/trello/webhook` (idempotent via the Trello action id).

## Deduplication *(Phase C)*

People (email/phone/name+company/Trello card id), companies (name/legal name/OIB/domain/
phone), candidates (phone/email/name/Trello card id/employer). Possible duplicates are
flagged (`possibleDuplicate`), never auto-merged; merges are audited.

## Backup

Bisneys data lives in the shared Varel Postgres and is covered by Varel's backup strategy;
the new `bisneys_*` tables are included automatically. Verify a restore includes them.

## Noindex

Five layers: server-side auth, `robots` metadata on the layout
(`noindex,nofollow,noarchive,nosnippet,noimageindex`), the `X-Robots-Tag` header from
`proxy.ts`, a `robots.txt` disallow, and exclusion from `sitemap.ts`. The login route is
noindexed too.

## Rollback

Because everything is additive and flag-gated: set `BISNEYS_CRM_ENABLED` unset/`false` to
disable the whole module instantly (Varel keeps working). To remove entirely, delete the
`(bisneyscrm)` group, `src/lib/bisneyscrm`, `src/components/bisneyscrm`,
`src/server/actions/bisneys-auth.ts`, the bootstrap route, revert the `proxy.ts`/
`robots.ts` additions, and drop the `bisneys_*` tables + `Bisneys*` schema block.

## Known pre-existing issue (not Bisneys)

`npx tsc --noEmit` reports Decimal type errors in `src/server/actions/hvac-invoices.ts`
and `hvac-quotations.ts`. These files are unrelated to Bisneys and were not modified;
the errors pre-date this work.

## Roadmap

A. Foundation (done) · B. Trello · C. Business entities · D. Dashboards · E. Relationship
engine · F. Finance & alerts · G. Stabilize (audit UI, dedup, performance, regression,
deploy). See `.claude/plans` / the project brief §71.
