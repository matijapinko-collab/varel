# Architecture notes

Implementation of the approved "Varel Software Architecture" and
"Varel Database Design" documents.

## Stack
- **Next.js 16** (App Router, Turbopack, `proxy.ts` instead of middleware,
  async request APIs) — read `node_modules/next/dist/docs/` before big changes.
- **React 19**, **TypeScript**, **Tailwind CSS 4** (theme tokens in
  `src/app/globals.css`, palettes from the design brief).
- **PostgreSQL + Prisma 7** — client generated to `src/generated/prisma`,
  runtime uses the `@prisma/adapter-pg` driver adapter (`src/lib/db.ts`).
- **Auth.js v5** (credentials + TOTP 2FA), JWT sessions.
- **Cloudflare R2** for media (S3 API) with a local-dev fallback.
- Meilisearch/Redis are optional future upgrades — search currently runs on
  Postgres queries; interfaces live in `src/lib/` so swapping is contained.

## Folder structure

```
src/
  app/
    [locale]/            public site (en, hr, de, fr, it, es, zh, hi)
      tools/  categories/  compare/  guides/  editorial/
      news/  prompts/  deals/  search/  [slug]/   ← CMS pages
    admin/
      login/
      (dashboard)/       protected admin modules (sidebar shell)
    api/                 auth, track, newsletter, admin upload/export
    go/[id]/             affiliate redirect + click tracking
    sitemap.ts robots.ts
  components/
    layout/  blocks/  cards/  admin/  analytics/
  lib/                   db, auth, i18n, seo, settings, storage, permissions,
                         security, content readers, block schemas
  server/actions/        permission-checked, audited mutations per module
  generated/prisma/      generated client (gitignored)
prisma/                  schema, migrations, seed
docs/                    this documentation
```

## Key decisions

1. **Two root layouts** — `[locale]/layout.tsx` (public, theme + branding from
   DB) and `admin/layout.tsx`. Next.js multiple-root-layouts pattern.
2. **Locale routing in `proxy.ts`** — cookie → Accept-Language → default; admin,
   api, `/go` and files bypass it. Locale prefix is always present on public URLs.
3. **Polymorphic SEO** — one `seo_metadata` table keyed by
   (entityType, entityId, languageId); shared editor component `SeoFields` +
   `saveSeoFromForm`; consumed via `buildSeoMetadata` (canonical, hreflang for
   all 8 locales, OG/Twitter, robots).
4. **Translations as sibling rows** — every content type has a
   `<Entity>Translation` table unique on (entityId, languageId), with its own
   slug, status and SEO. Croatian is the authoring language; the Translation
   Manager copies HR → target as `[TRANSLATE]`-marked drafts.
5. **Page builder** — `pages` + ordered `page_blocks` with `contentJson`/
   `settingsJson`. Block types + editable fields are declared once in
   `src/lib/blocks-schema.ts`; the admin renders friendly forms from it and the
   public `BlockRenderer` renders the stored JSON (data-driven blocks query the
   DB: tool grids, latest content, etc.). Global sections are supported via
   `global_sections` and referenced by blocks.
6. **Central affiliate manager** — content stores only `affiliateLinkId`;
   public pages link to `/go/<id>` which records an `affiliate_clicks` row
   (device, country, referrer, salted IP hash) and 302-redirects. Changing a
   URL in the manager updates every placement instantly.
7. **Internal analytics** — `/api/track` collects typed events (page/tool
   views, searches, prompt copies, language switches…) into
   `analytics_events`; the admin dashboard and Analytics module aggregate them.
   GA4/GTM are injected only when configured in Settings.
8. **Rendering model** — dynamic SSR (no `cacheComponents` in V1) because
   every page reads CMS data and theme cookies; Vercel edge caching + fast
   Prisma queries keep TTFB low. Moving hot pages to `use cache` +
   `revalidateTag` is a contained future optimization.
9. **No arbitrary code execution** — the Version Manager records updates and
   enforces a manual, documented apply/rollback workflow (docs/UPDATES.md).

## Future readiness
- News ingestion (n8n), AI translation, AI recommendations: schema fields
  (`contentOrigin`, `sourceUrl`, priorities) and the actions layer are already
  shaped for automation; add API routes or queue consumers without schema
  changes.
- Marketplace/user accounts: `users`/`roles` are general-purpose; public
  registration is simply not exposed yet.
- Amazon products: `affiliate_links.entityType = AMAZON_PRODUCT` is reserved;
  a dedicated `amazon_products` table is specified in the DB design doc for
  when Amazon content ships.
