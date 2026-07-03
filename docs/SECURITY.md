# Security notes

## Authentication & sessions
- Auth.js (credentials provider) with JWT sessions, **8-hour expiration**.
- Login accepts username **or** email + password (+ TOTP code when 2FA is on).
- Passwords hashed with bcrypt (cost 12). Policy: ≥10 chars, upper, lower, digit
  (`validatePassword` in `src/lib/security.ts`).
- **2FA (TOTP)**: each user can enable it in Admin → Users; secrets stored per
  user; an Owner can disable a user's 2FA for account recovery.

## Authorization (RBAC)
- 8 roles (Owner → Viewer) mapped to permission keys in
  `src/lib/permissions.ts`; also seeded into `roles`/`permissions` tables.
- **Every** server action starts with `requirePermission("<key>")`
  (`src/server/actions/helpers.ts`) — the sidebar/proxy are convenience only,
  never the security boundary.
- The `/admin` proxy check is optimistic (cookie presence); the admin layout
  re-validates the session server-side, and actions re-check permissions.

## Rate limiting & login tracking
- DB-backed failed-login limiter: 5 failures per 15 minutes per identifier
  (serverless-safe, no Redis required).
- All attempts recorded in `login_attempts`; failures also in the audit log.

## Audit log
- `audit()` (`src/lib/security.ts`) records who/what/when + salted IP hash for
  every mutation: logins, content changes, SEO edits, affiliate changes, media,
  settings, role changes, versions, backups. Viewable in Admin → Security.
- Raw IPs are **never stored** — only salted SHA-256 hashes.

## Input & upload validation
- API routes validate input with zod; forms are parsed with typed helpers.
- Uploads: allow-list of image MIME types, 8 MB limit, sanitized filenames,
  permission-checked (`media.manage`), audited.
- SQL injection prevented by Prisma parameterized queries.

## Headers & platform
- Security headers set in `next.config.ts` (HSTS, X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy).
- CSRF: Auth.js CSRF tokens for auth flows; server actions use Next.js
  built-in origin checking; state-changing API routes require a session.
- Secrets only in environment variables — `.env` is gitignored;
  `.env.example` documents every variable.

## Known V1 limitations (documented on purpose)
- `custom_html` block and HTML content fields are rendered as-is. Only trusted
  admin users can edit content; if untrusted editors are ever added, add HTML
  sanitization (e.g. `sanitize-html`) before render.
- Version Manager stores pasted code but **never executes it** (by design).
