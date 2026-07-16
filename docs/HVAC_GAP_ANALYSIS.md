# Varel HVAC — Gap Analysis (Phase 0)

Audit of the existing implementation against the Varel HVAC Master Brief.
Date: 2026-07-15. Repo: `matijapinko-collab/varel` (Next.js 16 / Prisma 7 / Postgres).

**Legend:** ✅ implemented · 🟡 partial · ❌ missing · ♻️ needs refactor · ⏸ deliberately postponed

---

## 0. Critical findings (read first)

### F1 — 🔴 The specified superadmin password is already committed to this repo
`Zaporka321#` was present in **`README.md`** and **`prisma/seed.ts`**, and is therefore
in **Git history** (2 commits). It is also the **existing `/administracija` CMS owner
password for the same username `mpinko`**.

This directly violates Master Brief §4 (“Do not place the password in … Git history,
public documentation, seed data committed to the repository”).

Done in this pass: plaintext removed from `README.md` and `prisma/seed.ts` (the seed now
reads `SEED_OWNER_PASSWORD` or generates a random dev password).

**Still required from the owner (cannot be fixed by code alone):**
1. Treat `Zaporka321#` as **burned**. Use a *different, fresh* secret for
   `INITIAL_HVAC_SUPERADMIN_PASSWORD` in production.
2. Rotate the existing `/administracija` CMS password for `mpinko` (same credential).
3. Removing it from history requires a rewrite (`git filter-repo`) + force-push, or
   accepting the exposure and relying on rotation. Rotation is the practical fix.
4. Do not reuse one credential across the CMS admin and the HVAC superadmin.

### F2 — 🔴 Package/pricing conflict between briefs
| | Master Brief §16 | Currently live on `/hvac` + in code |
|---|---|---|
| Names | Start / Team / Business | Solo / Team / Business |
| Price | 59 / 139 / 249 €/mo, no contract | 79 / 189 / 229 €/mo + 12m & 24m tiers |
| Extra user | 12 €/mo | 15 €/mo |
| Users | 1 / 5 / 15 | 1 / 5 / 20 |

The public landing page, `hvacPricing`, `PLAN_CONFIG`, the `HvacPlan` enum (`SOLO`) and
existing trial subscriptions all use the **old** model. **No change made** — this needs an
explicit decision (it changes public pricing, the enum, and existing records).

### F3 — 🟡 Two-factor authentication for superadmin not yet implemented
Brief §6 marks this **P0**. Schema fields exist (`twoFactorEnabled`, `twoFactorSecret`,
`recoveryCodesJson`) and `otplib` is already a dependency (used by CMS admin 2FA), so the
work is contained. **Next P0 item.**

### F4 — 🟡 File storage is public-URL based, not private + signed
Existing `src/lib/storage.ts` uses **Vercel Blob with public access**. Brief §27/§34
require private object storage + signed, short-lived URLs. `HvacFileAsset` exists but no
upload pipeline, WebP conversion, thumbnails or EXIF stripping yet.

---

## 1. Foundation & architecture

| Requirement | Status | Notes |
|---|---|---|
| Multi-tenant schema | ✅ | ~35 `Hvac*` models, `hvac_*` tables, indexed `tenantId` on every tenant-owned row, `Decimal(10,2)` money |
| Server-side tenant resolution | ✅ | `requireTenantContext()` re-verifies session + active membership + tenant per request |
| Tenant isolation in queries | ✅ | Every query scoped by `ctx.tenantId`; no client-supplied tenant ID is trusted |
| DB-level policies (RLS) | ⏸ | Application-layer enforcement only; RLS is a later hardening step |
| **Automated tenant-isolation tests** | ❌ | Brief §44 calls this the most important test. **P0 backlog.** |
| Croatian-only, no switcher | ✅ | No `/en` HVAC routes, no locale prefix (`proxy.ts` skips `/hvac*`) |
| Varel design reuse | ✅ | Reuses tokens + `@/components/admin/ui`; sky/cyan accent, light+dark |
| Indexes | 🟡 | Present on tenant/status/date lookups; revisit under real data volume |
| Background jobs | ❌ | No queue yet — email is inline/graceful. Needed for PDF/OCR/images (§39) |

## 2. Authentication & authorization

| Requirement | Status | Notes |
|---|---|---|
| Tenant B2B auth (separate from CMS) | ✅ | Own `HvacUser` table + `hvac_b2b_session` cookie (jose HS256), bcrypt(12) |
| Register → tenant + owner + trial | ✅ | Single transaction; verification + admin email |
| Email verification | ✅ | Token route; unverified banner (not hard-blocking) |
| Login rate limiting | ✅ | DB-backed via existing `loginAttempt` table |
| Anti-enumeration | ✅ | Password reset + superadmin login use generic messages |
| Roles (Owner/Admin/Dispatcher/Technician/Read-only) | 🟡 | Enum + `requireTenantRole` guards exist; per-permission configurability ❌ |
| **Superadmin (`/hvac/superadministracija`)** | ✅ | See §3 below |
| Superadmin 2FA | 🟡 | Fields ready, flow not built (F3) |
| Impersonation (§15) | ❌ | `HvacSupportAccessLog` model exists; UI/flow not built |

## 3. Superadministration — implemented this pass ✅

| Requirement | Status |
|---|---|
| Route `/hvac/superadministracija` | ✅ separate from `/administracija` |
| Initial account `mpinko`, env-only bootstrap | ✅ idempotent, hashed, never logged |
| `mustChangePassword` on first login | ✅ verified |
| No content before password change | ✅ verified (redirect, zero dashboard HTML) |
| Initial password invalid after change | ✅ verified (generic error) |
| Old sessions invalidated on change | ✅ `sessionVersion` bumped + checked per request |
| Strong password policy (server-side) | ✅ 12+, upper/lower/digit/special, ≠ current, no username, no common |
| Rate limiting + generic errors | ✅ |
| Audit logging | ✅ `superadmin_first_login`, `_login_failed`, `_password_changed`, `_logout`, `_rate_limited` |
| No self-service superadmin creation | ✅ no registration route; no role escalation path |
| Dashboard (companies, users, WOs, storage, failures, security events) | 🟡 first version live; company **actions** (suspend/package change/extend trial/export/impersonate) ❌ |

## 4. Indexing protection ✅ (verified)

| Layer | `/administracija` | `/hvac/superadministracija` |
|---|---|---|
| Authorization (no content leak) | ✅ | ✅ |
| HTML `noindex,nofollow,noarchive,nosnippet` | ✅ | ✅ |
| `X-Robots-Tag` header (`proxy.ts`) | ✅ | ✅ |
| `robots.txt` disallow | ✅ | ✅ |
| Sitemap exclusion | ✅ (0 matches) | ✅ (0 matches) |
| No public links | ✅ | ✅ |

Public routes verified to carry **no** `X-Robots-Tag`.

## 5. HVAC functional modules

| Module | Status | Notes |
|---|---|---|
| Onboarding wizard (7 steps, resumable) | ✅ | Company/services/hours/technicians/booking/import/done |
| Company + services + working hours settings | ✅ | |
| Technicians + package limits | ✅ | Active-count vs plan, extra-user projection |
| Team users (invite/role/deactivate) | ✅ | Owner-only |
| Subscription view (tenant side) | ✅ | Read-only; superadmin management ❌ |
| Customers (individual/company) | ✅ | Search, pagination, archive, profile, timeline |
| Duplicate warnings (phone/email/OIB) | ❌ | §19 |
| Locations | ✅ | Per customer + global list |
| Devices (units) | ✅ | Full profile, inline edit, search |
| Device categories configurable | 🟡 | Fixed `HvacUnitType` enum; not tenant-configurable |
| Calendar / dispatch | ❌ | **Next feature phase** |
| Appointments | 🟡 | Model + statuses exist; no UI |
| Inquiries | 🟡 | Model exists; no UI |
| Work orders | 🟡 | Model + numbering counter exist; no UI/lifecycle |
| Technician mobile workflow | ❌ | Shell has field-first mobile nav; screens not built |
| Photos + WebP + thumbnails | ❌ | (F4) |
| Digital signature + locking | ❌ | Model exists |
| PDF reports | ❌ | |
| Email notification templates | 🟡 | Verification/invite/reset/lead exist; operational set ❌ |
| Public booking `/hvac-booking/[slug]` | ❌ | Settings + slug exist; page not built |
| Offers / additional-work approval | ❌ | Models exist |
| Maintenance contracts | ❌ | Not modelled yet |
| Reminder engine | 🟡 | `HvacServiceReminder` model; no engine |
| OCR label scanning | ❌ | §22 |
| Varel Smart Label (QR) | ❌ | §23 |
| WhatsApp parser | ❌ | §35 |
| Android/PWA | ❌ | Responsive web only |
| Reports | ❌ | |
| CSV import/export | ✅ | Customers import; customers/units export |

## 6. Operations

| Requirement | Status | Notes |
|---|---|---|
| Audit log | ✅ | `HvacAuditLog` + `HvacActivityLog`; never logs secrets |
| Soft deletion | ✅ | `deletedAt`/`archivedAt` across entities |
| Backups | 🟡 | Managed Prisma Postgres; **no documented restore test** (§38) |
| Error monitoring | ❌ | Console only; no Sentry/health endpoint |
| Deletion/retention workflows | ❌ | §40 |
| Storage private + signed URLs | ❌ | (F4) |

## 7. Deployment status

- `/hvac` landing, `/hvac-demo`, `/hvac-b2b` (coming-soon) are **live** on varel.io.
- The whole B2B app is **gated behind `HVAC_B2B_ENABLED`** (unset in prod ⇒ dark).
- **Prod DB has not been migrated** for the `hvac_*` tables — required before enabling.
- Superadmin is gated only by authentication (not the feature flag) and needs the same migration.

---

## 8. Ordered backlog (P0 → P2)

**P0 — security / correctness (before any production use)**
1. Rotate credentials per **F1**; use a fresh `INITIAL_HVAC_SUPERADMIN_PASSWORD`.
2. Decide the package/pricing model per **F2**.
3. Superadmin **2FA (TOTP + recovery codes)** — F3.
4. **Automated tenant-isolation tests** + superadmin auth tests (§44 critical list).
5. Private file storage + signed URLs before any photo upload ships — F4.
6. Prod migration for `hvac_*`, then enable `HVAC_B2B_ENABLED`.
7. Documented + tested backup restore.

**P1 — MVP completion (daily usability)**
8. Calendar + appointments + inquiries.
9. Work-order lifecycle + technician mobile + photos/WebP + signature + locking + PDF.
10. Operational email templates + background jobs.
11. Public booking page.
12. Superadmin company actions (suspend/package/trial/export) + impersonation with banner.

**P2 — differentiation**
13. Offers + approvals, maintenance contracts, reminder engine, reports.
14. OCR labels, Smart Label QR, WhatsApp parser, Android/PWA.

---

## 9. Deliberately postponed (per brief §10)
Accounting, payroll, fiscalization, warehouse/procurement, ERP integrations, iOS,
fleet routing, public API.
