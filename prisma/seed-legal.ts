/**
 * Seeds / refreshes the Privacy Policy and Cookie Policy legal pages (English +
 * Croatian) into the CMS, with SEO metadata, and fixes the Croatian footer
 * links to use the localized slugs. Idempotent — safe to run repeatedly.
 *
 * Run: npm run db:seed:legal   (uses DATABASE_URL from the environment)
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { LEGAL_SEED } from "./legal-content";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function upsertLegalPage(
  langCode: string,
  spec: { slug: string; title: string; body: string; seoTitle: string; seoDescription: string },
  ownerId: string | null,
  translationKey: string
) {
  const lang = await db.language.findUnique({ where: { code: langCode } });
  if (!lang) return;

  let page = await db.page.findFirst({ where: { languageId: lang.id, slug: spec.slug } });
  if (!page) {
    page = await db.page.create({
      data: {
        languageId: lang.id,
        translationKey,
        title: spec.title,
        slug: spec.slug,
        template: "builder",
        status: "PUBLISHED",
        publishedAt: new Date(),
        createdById: ownerId ?? undefined,
      },
    });
  } else {
    await db.page.update({
      where: { id: page.id },
      data: { title: spec.title, status: "PUBLISHED", deletedAt: null, publishedAt: page.publishedAt ?? new Date() },
    });
  }

  // One rich_text block holds the legal body (fully editable in the page builder).
  await db.pageBlock.deleteMany({ where: { pageId: page.id } });
  await db.pageBlock.create({
    data: { pageId: page.id, position: 0, type: "rich_text", contentJson: { html: spec.body } },
  });

  await db.seoMetadata.upsert({
    where: {
      entityType_entityId_languageId: { entityType: "PAGE", entityId: page.id, languageId: lang.id },
    },
    create: {
      entityType: "PAGE",
      entityId: page.id,
      languageId: lang.id,
      metaTitle: spec.seoTitle,
      metaDescription: spec.seoDescription,
    },
    update: { metaTitle: spec.seoTitle, metaDescription: spec.seoDescription },
  });

  return page;
}

async function main() {
  console.log("Seeding legal pages…");
  const owner = await db.user.findFirst({ where: { username: "mpinko" } });
  const ownerId = owner?.id ?? null;

  // English + Croatian Privacy & Cookie policies.
  await upsertLegalPage("en", LEGAL_SEED.privacy.en, ownerId, "legal-privacy");
  await upsertLegalPage("hr", LEGAL_SEED.privacy.hr, ownerId, "legal-privacy");
  await upsertLegalPage("en", LEGAL_SEED.cookie.en, ownerId, "legal-cookie");
  await upsertLegalPage("hr", LEGAL_SEED.cookie.hr, ownerId, "legal-cookie");

  // Remove the old Croatian English-slug placeholder pages (privacy-policy /
  // cookie-policy) now replaced by the localized slugs.
  const hr = await db.language.findUnique({ where: { code: "hr" } });
  if (hr) {
    for (const oldSlug of ["privacy-policy", "cookie-policy"]) {
      const stale = await db.page.findFirst({ where: { languageId: hr.id, slug: oldSlug } });
      if (stale) {
        await db.seoMetadata.deleteMany({ where: { entityType: "PAGE", entityId: stale.id } });
        await db.page.delete({ where: { id: stale.id } });
        console.log(`  removed stale HR page /${oldSlug}`);
      }
    }
    // Point the Croatian footer links at the localized slugs.
    const footer = await db.menu.findUnique({
      where: { location_languageId: { location: "FOOTER", languageId: hr.id } },
      include: { items: true },
    });
    if (footer) {
      const remap: Record<string, string> = {
        "/hr/privacy-policy": "/hr/politika-privatnosti",
        "/hr/cookie-policy": "/hr/politika-kolacica",
      };
      for (const item of footer.items) {
        if (remap[item.url]) {
          await db.menuItem.update({ where: { id: item.id }, data: { url: remap[item.url] } });
          console.log(`  footer link ${item.url} → ${remap[item.url]}`);
        }
      }
    }
  }

  console.log("Legal pages seeded ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
