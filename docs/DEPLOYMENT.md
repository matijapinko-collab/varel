# Deployment — Vercel + Neon + Cloudflare R2

## 1. Database (Neon)

1. Create a project at https://neon.tech (or use Vercel Postgres).
2. Copy the **pooled** connection string.
3. Apply the schema and seed:

```bash
DATABASE_URL="<neon-pooled-url>" npx prisma migrate deploy
DATABASE_URL="<neon-pooled-url>" npm run db:seed
```

`prisma/migrations/0001_init` contains the full initial schema, so
`migrate deploy` is all that production ever runs. New migrations are created
locally with `npx prisma migrate dev --name <change>` (or `db push` + a new
`migrate diff` file — see docs/UPDATES.md).

## 2. Media storage (Cloudflare R2)

1. Cloudflare dashboard → R2 → Create bucket (e.g. `varel-media`).
2. Enable public access for the bucket (or attach a custom domain like
   `media.varel.com`) → this is `R2_PUBLIC_URL`.
3. Create an API token with Object Read & Write → `R2_ACCESS_KEY` / `R2_SECRET_KEY`.
4. `R2_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com`.
5. Add the public host to `images.remotePatterns` in `next.config.ts` if you
   use a custom domain.

Without R2 configured, uploads fall back to `public/uploads` — this works
locally but **not** on Vercel (read-only filesystem).

## 3. Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Framework preset: Next.js (defaults are fine — `npm run build`).
3. Set environment variables (Production + Preview), from `.env.example`:
   - `DATABASE_URL` (Neon pooled)
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_URL` = `https://your-domain.com`
   - `AUTH_TRUST_HOST` = `true`
   - `NEXT_PUBLIC_SITE_URL` = `https://your-domain.com`
   - `R2_*` (see above)
   - optional: `GOOGLE_ANALYTICS_ID`, `GOOGLE_TAG_MANAGER_ID`
4. Deploy.

`postinstall` runs `prisma generate` automatically on Vercel.

## 4. Domain + Cloudflare

Point the domain to Vercel (CNAME) — you can keep Cloudflare DNS in front
(proxy on or off both work; if proxied, set SSL mode to "Full (strict)").

## 5. After the first deploy

1. Log in at `/admin` with the seed credentials and **change the password**.
2. Enable 2FA (Admin → Users).
3. Upload the final logo, favicon and OG image (Media Library → Branding).
4. Review menus, homepage sections and legal pages.
5. Add real affiliate links in the Affiliate Manager.
6. Add Google Analytics / Search Console codes (Admin → Analytics).
7. Submit `https://your-domain.com/sitemap.xml` in Search Console.

## Production checklist

- [ ] `AUTH_SECRET` is unique and secret
- [ ] Seed password changed, 2FA enabled for all admin users
- [ ] R2 configured (media library shows no local-storage warning)
- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain (canonical/hreflang)
- [ ] Sample `[SAMPLE]` content replaced or archived
- [ ] Backup schedule in place (docs/BACKUP.md)
