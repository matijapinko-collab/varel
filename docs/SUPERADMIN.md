# Varel HVAC — Superadministration

Internal Varel-level administration for the HVAC SaaS platform.

- **Route:** `https://varel.io/hvac/superadministracija`
- **Separate from** `https://varel.io/administracija` (public varel.io content CMS).
  Different table, different session cookie, different guards, different navigation.
- Shares only: design system, utilities, hashing/session primitives.

## Access model

| | |
|---|---|
| Account table | `hvac_superadmins` (`HvacSuperadmin`) |
| Session cookie | `hvac_sa_session` — httpOnly, `sameSite=strict`, secure in prod, 4 h |
| Hashing | bcrypt, cost 12 |
| Guard | `requireSuperadmin()` — also enforces the mandatory password change |

There is **no registration**. A tenant user or CMS user can never escalate into this role:
the tables and sessions are entirely disjoint.

## Bootstrap (server-side only)

The initial account is created idempotently on the first login attempt by
`ensureSuperadminBootstrap()` from environment secrets:

```
INITIAL_HVAC_SUPERADMIN_USERNAME
INITIAL_HVAC_SUPERADMIN_PASSWORD
```

The process:
1. returns immediately if any superadmin already exists (never recreates);
2. hashes the password with bcrypt and stores **only the hash**;
3. sets `mustChangePassword = true`, `isActive = true`;
4. logs a single line **without** credentials.

> The password is never written to code, logs, API responses, the UI, or the database in
> plaintext. Set these variables as **server-side** secrets (Vercel → Environment
> Variables, all environments where the superadmin must exist).

**After the first successful password change you can delete
`INITIAL_HVAC_SUPERADMIN_PASSWORD` from the environment.** The account persists; the
bootstrap becomes a no-op because an account already exists.

## Mandatory first password change

1. `/hvac/superadministracija` → unauthenticated → redirect to `…/prijava`
2. login with the initial credentials
3. `mustChangePassword = true` → redirect to `…/promjena-zaporke`
4. **no superadministration content is rendered before the change**
5. new password is validated **server-side**, hashed, stored
6. `mustChangePassword = false`, `passwordChangedAt` set
7. `sessionVersion` is incremented → **all existing sessions are invalidated**
8. a fresh session is issued for the current device only
9. the event is written to the audit log
10. redirect to the dashboard

The initial password is permanently invalid afterwards (the hash is replaced).

### Password policy (server-enforced)
at least 12 characters · uppercase · lowercase · digit · special character ·
different from the current password · must not contain the username ·
must not contain a common/trivial phrase.

## Rate limiting & error messages

Login attempts are rate limited (shared DB-backed limiter, namespaced `sa:<username>`).
Failures always return the same message and never reveal whether the account exists:

```
Korisničko ime ili zaporka nisu ispravni.
```

The precise reason is recorded internally in the audit log.

## Audit events

`superadmin_first_login`, `superadmin_login`, `superadmin_login_failed`,
`superadmin_login_rate_limited`, `superadmin_password_changed`,
`superadmin_password_change_failed`, `superadmin_logout`.

Never logged: plaintext passwords, hashes, TOTP secrets, session tokens.

## Indexing protection (defence in depth)

1. Authorization — unauthorized requests receive **no** private content.
2. HTML metadata — `noindex, nofollow, noarchive, nosnippet` (subtree layout).
3. `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` — set in `src/proxy.ts`.
4. `robots.txt` — disallow (an instruction only, never access control).
5. Sitemap — excluded.

The same five layers apply to `/administracija`.

## Adding further superadmins

Not self-service. Create additional accounts only via a controlled server-side process
(bootstrap env for the first account, or a deliberate, audited server-side script).
Every creation must be audited.

## Open items (see `HVAC_GAP_ANALYSIS.md`)

- **P0:** TOTP 2FA + recovery codes (fields already on the model).
- **P0:** rotate any credential previously committed to the repository.
- Company actions (suspend / package change / trial / export) and audited impersonation.
