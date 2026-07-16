/**
 * Varel database seed.
 * Idempotent: safe to run multiple times (upserts everywhere).
 * Sample content is clearly marked as sample data.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PERMISSION_KEYS, ROLE_PERMISSIONS } from "../src/lib/permissions";
import type { UserRoleType } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const LANGUAGES = [
  { code: "en", name: "English", nativeName: "English", isDefault: true, isEnabled: true, position: 0 },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", isDefault: false, isEnabled: true, position: 1 },
  { code: "de", name: "German", nativeName: "Deutsch", isDefault: false, isEnabled: true, position: 2 },
  { code: "fr", name: "French", nativeName: "Français", isDefault: false, isEnabled: true, position: 3 },
  { code: "it", name: "Italian", nativeName: "Italiano", isDefault: false, isEnabled: true, position: 4 },
  { code: "es", name: "Spanish", nativeName: "Español", isDefault: false, isEnabled: true, position: 5 },
  { code: "zh", name: "Mandarin Chinese", nativeName: "中文", isDefault: false, isEnabled: false, position: 6 },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", isDefault: false, isEnabled: false, position: 7 },
];

const ROLES: { type: UserRoleType; name: string; description: string }[] = [
  { type: "OWNER", name: "Owner", description: "Full access to everything." },
  { type: "ADMIN", name: "Admin", description: "Most things except critical system settings." },
  { type: "EDITOR", name: "Editor", description: "Edit and publish content." },
  { type: "WRITER", name: "Writer", description: "Create drafts." },
  { type: "TRANSLATOR", name: "Translator", description: "Edit translations." },
  { type: "AFFILIATE_MANAGER", name: "Affiliate Manager", description: "Manage affiliate links." },
  { type: "SEO_MANAGER", name: "SEO Manager", description: "Edit SEO fields." },
  { type: "VIEWER", name: "Viewer", description: "Read-only admin access." },
];

// slug → [en name, hr name, icon]
const CATEGORIES: [string, string, string, string][] = [
  ["ai-tools", "AI Tools", "AI alati", "🤖"],
  ["software", "Software", "Softver", "💻"],
  ["automation", "Automation", "Automatizacija", "⚙️"],
  ["productivity", "Productivity", "Produktivnost", "🚀"],
  ["marketing", "Marketing", "Marketing", "📣"],
  ["seo", "SEO", "SEO", "🔍"],
  ["sales", "Sales", "Prodaja", "💼"],
  ["crm", "CRM", "CRM", "🤝"],
  ["design", "Design", "Dizajn", "🎨"],
  ["video", "Video", "Video", "🎬"],
  ["image-generation", "Image Generation", "Generiranje slika", "🖼️"],
  ["writing", "Writing", "Pisanje", "✍️"],
  ["coding", "Coding", "Programiranje", "👨‍💻"],
  ["no-code", "No-Code", "No-Code", "🧩"],
  ["data", "Data", "Podaci", "📊"],
  ["analytics", "Analytics", "Analitika", "📈"],
  ["customer-support", "Customer Support", "Korisnička podrška", "💬"],
  ["hr", "HR", "Ljudski resursi", "👥"],
  ["finance", "Finance", "Financije", "💰"],
  ["accounting", "Accounting", "Računovodstvo", "🧾"],
  ["education", "Education", "Edukacija", "🎓"],
  ["legal", "Legal", "Pravo", "⚖️"],
  ["e-commerce", "E-commerce", "E-trgovina", "🛒"],
  ["cybersecurity", "Cybersecurity", "Kibernetička sigurnost", "🔐"],
  ["hardware", "Hardware", "Hardver", "🖥️"],
  ["creator-gear", "Creator Gear", "Oprema za kreatore", "🎙️"],
  ["home-office", "Home Office", "Kućni ured", "🏠"],
  ["books", "Books", "Knjige", "📚"],
  ["3d-printing", "3D Printing", "3D ispis", "🖨️"],
];

const NAV: Record<string, { header: [string, string][]; footer: [string, string][] }> = {
  en: {
    header: [
      ["Discover", "/en/tools"], ["Compare", "/en/compare"], ["Guides", "/en/guides"],
      ["Editorial", "/en/editorial"], ["News", "/en/news"], ["Prompts", "/en/prompts"], ["Deals", "/en/deals"],
    ],
    footer: [
      ["Submit Tool", "/en/submit-tool"], ["Advertise", "/en/advertise"], ["About", "/en/about"],
      ["Contact", "/en/contact"], ["Affiliate Disclosure", "/en/affiliate-disclosure"],
      ["Privacy Policy", "/en/privacy-policy"], ["Terms", "/en/terms"], ["Cookie Policy", "/en/cookie-policy"],
    ],
  },
  hr: {
    header: [
      ["Istraži", "/hr/tools"], ["Usporedi", "/hr/compare"], ["Vodiči", "/hr/guides"],
      ["Kolumna", "/hr/editorial"], ["Vijesti", "/hr/news"], ["Promptovi", "/hr/prompts"], ["Ponude", "/hr/deals"],
    ],
    footer: [
      ["Prijavi alat", "/hr/submit-tool"], ["Oglašavanje", "/hr/advertise"], ["O nama", "/hr/about"],
      ["Kontakt", "/hr/contact"], ["Affiliate objava", "/hr/affiliate-disclosure"],
      ["Politika privatnosti", "/hr/privacy-policy"], ["Uvjeti korištenja", "/hr/terms"], ["Politika kolačića", "/hr/cookie-policy"],
    ],
  },
  de: {
    header: [
      ["Entdecken", "/de/tools"], ["Vergleichen", "/de/compare"], ["Guides", "/de/guides"],
      ["Kolumne", "/de/editorial"], ["News", "/de/news"], ["Prompts", "/de/prompts"], ["Deals", "/de/deals"],
    ],
    footer: [
      ["Tool einreichen", "/de/submit-tool"], ["Werben", "/de/advertise"], ["Über uns", "/de/about"],
      ["Kontakt", "/de/contact"], ["Affiliate-Hinweis", "/de/affiliate-disclosure"],
      ["Datenschutz", "/de/privacy-policy"], ["AGB", "/de/terms"], ["Cookie-Richtlinie", "/de/cookie-policy"],
    ],
  },
  fr: {
    header: [
      ["Découvrir", "/fr/tools"], ["Comparer", "/fr/compare"], ["Guides", "/fr/guides"],
      ["Éditorial", "/fr/editorial"], ["Actualités", "/fr/news"], ["Prompts", "/fr/prompts"], ["Offres", "/fr/deals"],
    ],
    footer: [
      ["Soumettre un outil", "/fr/submit-tool"], ["Publicité", "/fr/advertise"], ["À propos", "/fr/about"],
      ["Contact", "/fr/contact"], ["Divulgation d'affiliation", "/fr/affiliate-disclosure"],
      ["Confidentialité", "/fr/privacy-policy"], ["Conditions", "/fr/terms"], ["Politique de cookies", "/fr/cookie-policy"],
    ],
  },
  it: {
    header: [
      ["Scopri", "/it/tools"], ["Confronta", "/it/compare"], ["Guide", "/it/guides"],
      ["Editoriale", "/it/editorial"], ["Notizie", "/it/news"], ["Prompt", "/it/prompts"], ["Offerte", "/it/deals"],
    ],
    footer: [
      ["Invia uno strumento", "/it/submit-tool"], ["Pubblicità", "/it/advertise"], ["Chi siamo", "/it/about"],
      ["Contatti", "/it/contact"], ["Divulgazione affiliati", "/it/affiliate-disclosure"],
      ["Privacy", "/it/privacy-policy"], ["Termini", "/it/terms"], ["Politica sui cookie", "/it/cookie-policy"],
    ],
  },
  es: {
    header: [
      ["Descubrir", "/es/tools"], ["Comparar", "/es/compare"], ["Guías", "/es/guides"],
      ["Editorial", "/es/editorial"], ["Noticias", "/es/news"], ["Prompts", "/es/prompts"], ["Ofertas", "/es/deals"],
    ],
    footer: [
      ["Enviar herramienta", "/es/submit-tool"], ["Publicidad", "/es/advertise"], ["Acerca de", "/es/about"],
      ["Contacto", "/es/contact"], ["Divulgación de afiliados", "/es/affiliate-disclosure"],
      ["Privacidad", "/es/privacy-policy"], ["Términos", "/es/terms"], ["Política de cookies", "/es/cookie-policy"],
    ],
  },
};

const LEGAL_PAGES: [string, Record<string, string>][] = [
  ["about", { en: "About", hr: "O nama" }],
  ["contact", { en: "Contact", hr: "Kontakt" }],
  ["advertise", { en: "Advertise", hr: "Oglašavanje" }],
  ["submit-tool", { en: "Submit Tool", hr: "Prijavi alat" }],
  ["affiliate-disclosure", { en: "Affiliate Disclosure", hr: "Affiliate objava" }],
  ["privacy-policy", { en: "Privacy Policy", hr: "Politika privatnosti" }],
  ["terms", { en: "Terms of Use", hr: "Uvjeti korištenja" }],
  ["cookie-policy", { en: "Cookie Policy", hr: "Politika kolačića" }],
];

async function main() {
  console.log("Seeding Varel…");

  // ---- Languages -------------------------------------------------
  const langMap = new Map<string, string>();
  for (const lang of LANGUAGES) {
    const row = await db.language.upsert({
      where: { code: lang.code },
      create: lang,
      update: { name: lang.name, nativeName: lang.nativeName, position: lang.position },
    });
    langMap.set(lang.code, row.id);
  }
  console.log(`  languages: ${langMap.size}`);

  // ---- Permissions & roles --------------------------------------
  const permMap = new Map<string, string>();
  for (const key of PERMISSION_KEYS) {
    const row = await db.permission.upsert({
      where: { key },
      create: { key, name: key.replace(".", " → ") },
      update: {},
    });
    permMap.set(key, row.id);
  }
  const roleMap = new Map<UserRoleType, string>();
  for (const role of ROLES) {
    const row = await db.role.upsert({
      where: { type: role.type },
      create: role,
      update: { description: role.description },
    });
    roleMap.set(role.type, row.id);
    for (const key of ROLE_PERMISSIONS[role.type]) {
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: row.id,
            permissionId: permMap.get(key)!,
          },
        },
        create: { roleId: row.id, permissionId: permMap.get(key)! },
        update: {},
      });
    }
  }
  console.log(`  roles: ${roleMap.size}, permissions: ${permMap.size}`);

  // ---- Owner user -------------------------------------------------
  // Never commit a password. Supply SEED_OWNER_PASSWORD for a deterministic
  // local password; otherwise a random one is generated and printed once
  // (dev seed only — seeds must never run against production).
  const seedPassword = process.env.SEED_OWNER_PASSWORD || randomBytes(12).toString("base64url");
  if (!process.env.SEED_OWNER_PASSWORD) {
    console.log(`  ⚠ generated owner password (dev only, shown once): ${seedPassword}`);
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  const owner = await db.user.upsert({
    where: { email: "matija.pinko@hotmail.com" },
    create: {
      name: "Matija Pinko",
      username: "mpinko",
      email: "matija.pinko@hotmail.com",
      passwordHash,
      roleId: roleMap.get("OWNER")!,
      bio: "Founder of Varel. Writes The Varel Brief — human-written analysis of the technology and AI tool market.",
    },
    update: { username: "mpinko", roleId: roleMap.get("OWNER")! },
  });
  console.log(`  owner user: ${owner.username}`);

  // ---- Branding (prepared logo) -----------------------------------
  const logo = await db.media.upsert({
    where: { id: "seed-logo" },
    create: {
      id: "seed-logo",
      filename: "varel-logo.jpeg",
      originalFilename: "Varel logo.jpeg",
      mimeType: "image/jpeg",
      size: 26770,
      width: 1024,
      height: 559,
      url: "/branding/varel-logo.jpeg",
      storageKey: "branding/varel-logo.jpeg",
      altText: "Varel logo",
      title: "Varel logo",
      uploadedById: owner.id,
    },
    update: {},
  });
  const existingBranding = await db.brandingSetting.findFirst();
  if (!existingBranding) {
    await db.brandingSetting.create({
      data: {
        siteName: "Varel",
        tagline: "Find the right tools for modern work.",
        lightLogoId: logo.id,
        darkLogoId: logo.id,
        primaryColor: "#2563EB",
        accentColor: "#0EA5E9",
        defaultTheme: "LIGHT",
        enableThemeToggle: true,
      },
    });
  }
  console.log("  branding ready");

  // ---- Categories --------------------------------------------------
  let pos = 0;
  for (const [slug, en, hr, icon] of CATEGORIES) {
    const cat = await db.category.upsert({
      where: { slug },
      create: {
        slug,
        icon,
        position: pos,
        isFeatured: pos < 8,
        status: "PUBLISHED",
      },
      update: {},
    });
    for (const [code, name] of [["en", en], ["hr", hr]] as const) {
      await db.categoryTranslation.upsert({
        where: {
          categoryId_languageId: { categoryId: cat.id, languageId: langMap.get(code)! },
        },
        create: {
          categoryId: cat.id,
          languageId: langMap.get(code)!,
          name,
          slug,
        },
        update: { name },
      });
    }
    pos++;
  }
  console.log(`  categories: ${CATEGORIES.length}`);

  // ---- Menus -------------------------------------------------------
  for (const [code, nav] of Object.entries(NAV)) {
    const languageId = langMap.get(code)!;
    for (const [location, items] of [
      ["HEADER", nav.header],
      ["FOOTER", nav.footer],
    ] as const) {
      const menu = await db.menu.upsert({
        where: { location_languageId: { location, languageId } },
        create: { name: `${location} (${code})`, location, languageId },
        update: {},
      });
      await db.menuItem.deleteMany({ where: { menuId: menu.id } });
      let p = 0;
      for (const [label, url] of items) {
        await db.menuItem.create({
          data: { menuId: menu.id, label, url, position: p++ },
        });
      }
    }
  }
  console.log("  menus seeded for", Object.keys(NAV).join(", "));

  // ---- Homepage (page builder blocks) -----------------------------
  const HOMEPAGE_BLOCKS = (locale: string) => [
    {
      type: "hero",
      contentJson: {
        // Empty strings fall back to the locale dictionary at render time.
        title: "",
        subtitle: "",
        searchPlaceholder: "",
        suggestedSearches: [
          "AI writing tools", "Automation tools", "Best CRM",
          "SEO tools", "Creator setup", "ChatGPT alternatives",
        ],
      },
      settingsJson: { showSearch: "true" },
    },
    { type: "tool_grid", contentJson: { title: locale === "hr" ? "Alati u trendu" : "Trending tools" }, settingsJson: { trending: true, limit: 8 } },
    { type: "tool_grid", contentJson: { title: locale === "hr" ? "Izbor urednika" : "Editor's picks" }, settingsJson: { featured: true, limit: 4 } },
    { type: "category_grid", contentJson: { title: locale === "hr" ? "Istaknute kategorije" : "Featured categories" }, settingsJson: { featured: true, limit: 8 } },
    { type: "latest_comparisons", contentJson: {}, settingsJson: { limit: 4 } },
    { type: "latest_articles", contentJson: {}, settingsJson: { limit: 3 } },
    { type: "featured_editorial", contentJson: {}, settingsJson: {} },
    { type: "latest_news", contentJson: {}, settingsJson: { limit: 4 } },
    { type: "latest_deals", contentJson: {}, settingsJson: { limit: 3 } },
    { type: "newsletter", contentJson: {}, settingsJson: {} },
  ];

  const homepageKey = "seed-homepage";
  for (const code of ["en", "hr", "de", "fr", "it", "es"]) {
    const languageId = langMap.get(code)!;
    let page = await db.page.findFirst({
      where: { languageId, isHomepage: true, deletedAt: null },
    });
    if (!page) {
      page = await db.page.create({
        data: {
          languageId,
          translationKey: homepageKey,
          title: code === "hr" ? "Početna" : "Home",
          slug: "home",
          template: "builder",
          status: "PUBLISHED",
          isHomepage: true,
          publishedAt: new Date(),
          createdById: owner.id,
        },
      });
      let bp = 0;
      for (const block of HOMEPAGE_BLOCKS(code)) {
        await db.pageBlock.create({
          data: { pageId: page.id, position: bp++, ...block },
        });
      }
    }
  }
  console.log("  homepage pages created");

  // ---- Legal / info pages ------------------------------------------
  for (const [slug, titles] of LEGAL_PAGES) {
    const key = `seed-page-${slug}`;
    for (const code of ["en", "hr"]) {
      const languageId = langMap.get(code)!;
      const exists = await db.page.findFirst({ where: { languageId, slug } });
      if (exists) continue;
      const title = titles[code] ?? titles.en;
      const page = await db.page.create({
        data: {
          languageId,
          translationKey: key,
          title,
          slug,
          template: "builder",
          status: "PUBLISHED",
          publishedAt: new Date(),
          createdById: owner.id,
        },
      });
      await db.pageBlock.create({
        data: {
          pageId: page.id,
          position: 0,
          type: "rich_text",
          contentJson: {
            html: `<h2>${title}</h2><p>[SAMPLE] Replace this text in Admin → Pages → ${title}.</p>`,
          },
        },
      });
    }
  }
  console.log("  legal pages created");

  // ---- Sample content (clearly marked) ------------------------------
  const aiCat = await db.category.findUnique({ where: { slug: "ai-tools" } });

  // Sample affiliate link
  const sampleAffiliate = await db.affiliateLink.upsert({
    where: { id: "seed-affiliate" },
    create: {
      id: "seed-affiliate",
      brandName: "Sample Brand",
      entityType: "TOOL",
      originalUrl: "https://example.com",
      affiliateUrl: "https://example.com/?ref=varel-sample",
      network: "DIRECT",
      commissionType: "percentage",
      commissionValue: "30%",
      cookieDurationDays: 60,
      status: "ACTIVE",
      notes: "[SAMPLE] Demo affiliate link — replace with a real program.",
    },
    update: {},
  });

  // Sample tools
  const toolSpecs = [
    { slug: "sample-tool-alpha", name: "Sample Tool Alpha", trending: true, featured: true, rating: 4.6 },
    { slug: "sample-tool-beta", name: "Sample Tool Beta", trending: true, featured: false, rating: 4.2 },
  ];
  const toolIds: string[] = [];
  for (const spec of toolSpecs) {
    const tool = await db.tool.upsert({
      where: { slug: spec.slug },
      create: {
        name: spec.name,
        slug: spec.slug,
        websiteUrl: "https://example.com",
        pricingModel: "FREEMIUM",
        hasFreeTrial: true,
        hasApi: true,
        isFeatured: spec.featured,
        isTrending: spec.trending,
        status: "PUBLISHED",
        editorRating: spec.rating,
        publishedAt: new Date(),
        createdById: owner.id,
      },
      update: {},
    });
    toolIds.push(tool.id);
    if (aiCat) {
      await db.toolCategory.upsert({
        where: { toolId_categoryId: { toolId: tool.id, categoryId: aiCat.id } },
        create: { toolId: tool.id, categoryId: aiCat.id },
        update: {},
      });
    }
    for (const code of ["en", "hr"]) {
      await db.toolTranslation.upsert({
        where: {
          toolId_languageId: { toolId: tool.id, languageId: langMap.get(code)! },
        },
        create: {
          toolId: tool.id,
          languageId: langMap.get(code)!,
          name: spec.name,
          slug: spec.slug,
          shortDescription:
            code === "hr"
              ? "[PRIMJER] Demo alat — zamijeni stvarnim sadržajem u adminu."
              : "[SAMPLE] Demo tool — replace with real content in the admin.",
          longDescription:
            code === "hr"
              ? "<p>[PRIMJER] Ovo je primjer opisa alata. Uredi ga u Admin → Tools.</p>"
              : "<p>[SAMPLE] This is a sample tool description. Edit it in Admin → Tools.</p>",
          bestFor: code === "hr" ? "Demo svrha" : "Demo purposes",
          prosJson: ["Easy to try", "Good documentation", "Free tier"],
          consJson: ["It is only a sample", "Not a real product"],
          faqJson: [
            {
              question: code === "hr" ? "Je li ovo pravi alat?" : "Is this a real tool?",
              answer:
                code === "hr"
                  ? "Ne — ovo je primjer podataka koji dolazi sa seedom."
                  : "No — this is sample data that ships with the seed.",
            },
          ],
          status: "PUBLISHED",
        },
        update: {},
      });
    }
    if (tool.id === toolIds[0]) {
      await db.affiliateLink.update({
        where: { id: sampleAffiliate.id },
        data: { toolId: tool.id },
      });
    }
  }
  await db.toolAlternative.upsert({
    where: {
      toolId_alternativeToolId: { toolId: toolIds[0], alternativeToolId: toolIds[1] },
    },
    create: { toolId: toolIds[0], alternativeToolId: toolIds[1], reason: "[SAMPLE] Similar demo tool" },
    update: {},
  });

  // Sample comparison
  const existingCmp = await db.comparison.findFirst({
    where: { translations: { some: { slug: "sample-tool-alpha-vs-sample-tool-beta" } } },
  });
  if (!existingCmp) {
    const cmp = await db.comparison.create({
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        createdById: owner.id,
        tools: {
          create: [
            { toolId: toolIds[0], position: 1 },
            { toolId: toolIds[1], position: 2 },
          ],
        },
        rows: {
          create: [
            { label: "Best for", position: 0, toolValuesJson: { [toolIds[0]]: "Demos", [toolIds[1]]: "Also demos" } },
            { label: "Pricing", position: 1, toolValuesJson: { [toolIds[0]]: "Free", [toolIds[1]]: "Freemium" } },
          ],
        },
      },
    });
    for (const code of ["en", "hr"]) {
      await db.comparisonTranslation.create({
        data: {
          comparisonId: cmp.id,
          languageId: langMap.get(code)!,
          title:
            code === "hr"
              ? "Sample Tool Alpha vs Sample Tool Beta [PRIMJER]"
              : "Sample Tool Alpha vs Sample Tool Beta [SAMPLE]",
          slug: "sample-tool-alpha-vs-sample-tool-beta",
          summary:
            code === "hr"
              ? "[PRIMJER] Usporedba dva demo alata."
              : "[SAMPLE] A comparison of two demo tools.",
          verdict:
            code === "hr"
              ? "[PRIMJER] Oba su primjeri — zamijeni stvarnim sadržajem."
              : "[SAMPLE] Both are samples — replace with real content.",
          status: "PUBLISHED",
        },
      });
    }
  }

  // Sample guide (article)
  const existingArticle = await db.articleTranslation.findFirst({
    where: { slug: "sample-guide" },
  });
  if (!existingArticle) {
    const article = await db.article.create({
      data: {
        type: "CORNERSTONE",
        status: "PUBLISHED",
        authorId: owner.id,
        targetWordCount: 1500,
        publishedAt: new Date(),
      },
    });
    for (const code of ["en", "hr"]) {
      await db.articleTranslation.create({
        data: {
          articleId: article.id,
          languageId: langMap.get(code)!,
          title: code === "hr" ? "Primjer vodiča [PRIMJER]" : "Sample Guide [SAMPLE]",
          slug: "sample-guide",
          excerpt:
            code === "hr"
              ? "[PRIMJER] Ovo je primjer vodiča koji dolazi sa seedom."
              : "[SAMPLE] This is a sample guide that ships with the seed.",
          body:
            code === "hr"
              ? "<h2>Primjer sadržaja</h2><p>Uredi ovaj vodič u Admin → Guides.</p>"
              : "<h2>Sample content</h2><p>Edit this guide in Admin → Guides.</p>",
          focusKeyword: "sample guide",
          status: "PUBLISHED",
        },
      });
    }
    await db.articleTool.create({
      data: { articleId: article.id, toolId: toolIds[0], position: 0 },
    });
  }

  // Sample editorial post (The Varel Brief)
  const existingEditorial = await db.editorialTranslation.findFirst({
    where: { slug: "welcome-to-the-varel-brief" },
  });
  if (!existingEditorial) {
    const post = await db.editorialPost.create({
      data: {
        authorId: owner.id,
        status: "PUBLISHED",
        contentOrigin: "HUMAN_WRITTEN",
        publishedAt: new Date(),
      },
    });
    for (const code of ["en", "hr"]) {
      await db.editorialTranslation.create({
        data: {
          editorialPostId: post.id,
          languageId: langMap.get(code)!,
          title:
            code === "hr"
              ? "Dobrodošli u The Varel Brief [PRIMJER]"
              : "Welcome to The Varel Brief [SAMPLE]",
          slug: "welcome-to-the-varel-brief",
          excerpt:
            code === "hr"
              ? "[PRIMJER] Prva kolumna — zamijeni pravim sadržajem."
              : "[SAMPLE] The first column — replace with real content.",
          body:
            code === "hr"
              ? "<p>Ovo je primjer kolumne. Piše se ručno u adminu.</p>"
              : "<p>This is a sample column. It is written by hand in the admin.</p>",
          category: "My Take",
          status: "PUBLISHED",
        },
      });
    }
  }

  // Sample news item
  const existingNews = await db.newsTranslation.findFirst({
    where: { slug: "sample-news-item" },
  });
  if (!existingNews) {
    const news = await db.newsItem.create({
      data: {
        sourceName: "Example Source",
        sourceUrl: "https://example.com/news",
        priority: "MEDIUM",
        status: "PUBLISHED",
        createdById: owner.id,
        publishedAt: new Date(),
      },
    });
    for (const code of ["en", "hr"]) {
      await db.newsTranslation.create({
        data: {
          newsItemId: news.id,
          languageId: langMap.get(code)!,
          title: code === "hr" ? "Primjer vijesti [PRIMJER]" : "Sample news item [SAMPLE]",
          slug: "sample-news-item",
          summary:
            code === "hr"
              ? "[PRIMJER] Ovo je primjer vijesti."
              : "[SAMPLE] This is a sample news item.",
          whyItMatters:
            code === "hr"
              ? "Pokazuje kako izgleda news modul."
              : "It shows how the news module looks.",
          status: "PUBLISHED",
        },
      });
    }
  }

  // Sample prompt category + prompt
  const promptCat = await db.promptCategory.upsert({
    where: { slug: "writing" },
    create: { slug: "writing", position: 0, status: "PUBLISHED" },
    update: {},
  });
  for (const code of ["en", "hr"]) {
    await db.promptCategoryTranslation.upsert({
      where: {
        promptCategoryId_languageId: {
          promptCategoryId: promptCat.id,
          languageId: langMap.get(code)!,
        },
      },
      create: {
        promptCategoryId: promptCat.id,
        languageId: langMap.get(code)!,
        name: code === "hr" ? "Pisanje" : "Writing",
        slug: "writing",
      },
      update: {},
    });
  }
  const existingPrompt = await db.promptTranslation.findFirst({
    where: { slug: "sample-blog-outline-prompt" },
  });
  if (!existingPrompt) {
    const prompt = await db.prompt.create({
      data: {
        categoryId: promptCat.id,
        status: "PUBLISHED",
        difficulty: "BEGINNER",
        createdById: owner.id,
      },
    });
    for (const code of ["en", "hr"]) {
      await db.promptTranslation.create({
        data: {
          promptId: prompt.id,
          languageId: langMap.get(code)!,
          title:
            code === "hr"
              ? "Primjer prompta za outline bloga [PRIMJER]"
              : "Sample blog outline prompt [SAMPLE]",
          slug: "sample-blog-outline-prompt",
          description:
            code === "hr"
              ? "[PRIMJER] Generira strukturu blog posta."
              : "[SAMPLE] Generates a blog post outline.",
          promptText:
            "Act as an experienced content strategist. Create a detailed outline for a blog post about {{topic}} aimed at {{audience}}. Include H2/H3 headings, key points and a suggested CTA.",
          variablesJson: [
            { name: "topic", example: "AI writing tools" },
            { name: "audience", example: "small business owners" },
          ],
          exampleOutput: "1. Introduction…\n2. What to look for…\n3. Top picks…",
          compatibleModelsJson: ["Claude", "ChatGPT", "Gemini"],
          status: "PUBLISHED",
        },
      });
    }
  }

  // Sample deal
  const existingDeal = await db.dealTranslation.findFirst({
    where: { slug: "sample-deal" },
  });
  if (!existingDeal) {
    const deal = await db.deal.create({
      data: {
        brandName: "Sample Brand",
        affiliateLinkId: sampleAffiliate.id,
        oldPrice: 29,
        newPrice: 19,
        currency: "USD",
        discountPercent: 34,
        validUntil: new Date(Date.now() + 30 * 86_400_000),
        status: "PUBLISHED",
      },
    });
    for (const code of ["en", "hr"]) {
      await db.dealTranslation.create({
        data: {
          dealId: deal.id,
          languageId: langMap.get(code)!,
          title: code === "hr" ? "Primjer ponude −34% [PRIMJER]" : "Sample deal −34% [SAMPLE]",
          slug: "sample-deal",
          description:
            code === "hr"
              ? "[PRIMJER] Ovo je primjer ponude."
              : "[SAMPLE] This is a sample deal.",
          ctaText: code === "hr" ? "Iskoristi ponudu" : "Get deal",
          status: "PUBLISHED",
        },
      });
    }
  }

  // ---- Settings & app version --------------------------------------
  await db.setting.upsert({
    where: { key: "site_name" },
    create: { key: "site_name", valueJson: "Varel", description: "Public site name" },
    update: {},
  });
  await db.setting.upsert({
    where: { key: "cookie_banner_enabled" },
    create: { key: "cookie_banner_enabled", valueJson: true },
    update: {},
  });
  await db.appVersion.upsert({
    where: { version: "0.1.0" },
    create: {
      version: "0.1.0",
      title: "Initial Varel release",
      changelog: "First version: CMS, page builder, directory, comparisons, guides, editorial, news, prompts, deals, affiliate manager, SEO, analytics, security, version manager.",
      status: "APPLIED",
      appliedAt: new Date(),
      createdById: owner.id,
    },
    update: {},
  });

  console.log("Seed complete ✔");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
