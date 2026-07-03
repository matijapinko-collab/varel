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

## 2. Media storage

Varel uses **Vercel Blob** for media uploads in V1. Configure
`BLOB_READ_WRITE_TOKEN` in Vercel environment variables. Cloudflare R2 is
supported as a future alternative but is **not required** for the initial
deployment.

The provider is chosen with `STORAGE_PROVIDER`:

| Value | Behaviour |
|---|---|
| `vercel_blob` (default) | Uploads go to Vercel Blob. Needs `BLOB_READ_WRITE_TOKEN`. |
| `r2` | Uploads go to Cloudflare R2. Needs the `R2_*` variables. |
| `disabled` | Uploads are off, but you can still add media by external URL. |

The app never crashes if a provider is unconfigured — the Media Library shows a
clear warning and external image URLs still work.

### Set up Vercel Blob (recommended)

1. Go to the Vercel dashboard.
2. Open the **Varel** project.
3. Go to **Storage**.
4. Create / connect a **Blob** store.
5. Copy the Blob **read-write token**.
6. Add it to Environment Variables as `BLOB_READ_WRITE_TOKEN`.
7. Set `STORAGE_PROVIDER=vercel_blob`.
8. Redeploy the project.

Vercel Blob serves from `*.public.blob.vercel-storage.com`, already allowed in
`next.config.ts` → `images.remotePatterns`.

### Cloudflare R2 (optional, future)

Set `STORAGE_PROVIDER=r2` and provide `R2_ACCESS_KEY`, `R2_SECRET_KEY`,
`R2_BUCKET_NAME`, `R2_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`)
and `R2_PUBLIC_URL` (public bucket/custom-domain URL). Add the public host to
`images.remotePatterns` in `next.config.ts`.

Locally, if `STORAGE_PROVIDER` is unset, uploads fall back to `public/uploads`
(dev only — not usable on Vercel's read-only filesystem).

## 3. Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Framework preset: Next.js (defaults are fine — `npm run build`).
3. Set environment variables (Production + Preview), from `.env.example`:
   - `DATABASE_URL` (Neon pooled)
   - `AUTH_SECRET` (`openssl rand -base64 32`)
   - `AUTH_URL` = `https://your-domain.com`
   - `AUTH_TRUST_HOST` = `true`
   - `NEXT_PUBLIC_SITE_URL` = `https://your-domain.com`
   - `STORAGE_PROVIDER` = `vercel_blob` and `BLOB_READ_WRITE_TOKEN` (see §2)
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
- [ ] Vercel Blob configured (`STORAGE_PROVIDER=vercel_blob` + `BLOB_READ_WRITE_TOKEN`; Media Library shows no warning)
- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain (canonical/hreflang)
- [ ] Sample `[SAMPLE]` content replaced or archived
- [ ] Backup schedule in place (docs/BACKUP.md)
