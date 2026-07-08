import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ONE-SHOT: create the llm_scan_requests table (if missing) and add the
 * "LLM Visibility Scanner" item to the "Varel Tools" header dropdown for all
 * locales. Protected by CRON_SECRET or a one-time token. Idempotent.
 * DELETE this route after running it once.
 */
const ONE_TIME_TOKEN = "1226b19eb25a44829473e34c9889319a989ee0a530c6c06c";

const NAV_LABELS: Record<string, string[]> = {
  en: ["Home", "AI Tools", "Varel Tools", "Buying Guides", "Comparisons", "Blog", "About Us"],
  hr: ["Početna", "AI alati", "Varel alati", "Vodiči za kupnju", "Usporedbe", "Blog", "O nama"],
  de: ["Startseite", "KI-Tools", "Varel-Tools", "Kaufberatung", "Vergleiche", "Blog", "Über uns"],
  fr: ["Accueil", "Outils IA", "Outils Varel", "Guides d'achat", "Comparatifs", "Blog", "À propos"],
  it: ["Home", "Strumenti IA", "Strumenti Varel", "Guide all'acquisto", "Confronti", "Blog", "Chi siamo"],
  es: ["Inicio", "Herramientas IA", "Herramientas Varel", "Guías de compra", "Comparativas", "Blog", "Sobre nosotros"],
  zh: ["首页", "AI 工具", "Varel 工具", "购买指南", "对比", "博客", "关于我们"],
  hi: ["होम", "एआई टूल्स", "Varel टूल्स", "खरीद गाइड", "तुलना", "ब्लॉग", "हमारे बारे में"],
};
const FINDER: Record<string, string> = { en: "AI Tool Finder", hr: "AI alat za pronalazak", de: "KI-Tool-Finder", fr: "Trouveur d'outils IA", it: "Ricerca strumenti IA", es: "Buscador de herramientas IA", zh: "AI 工具查找器", hi: "एआई टूल फाइंडर" };
const SCANNER: Record<string, string> = { en: "LLM Visibility Scanner", hr: "LLM Visibility Scanner", de: "LLM Visibility Scanner", fr: "LLM Visibility Scanner", it: "LLM Visibility Scanner", es: "LLM Visibility Scanner", zh: "LLM Visibility Scanner", hi: "LLM Visibility Scanner" };
const CHECKER: Record<string, string> = { en: "Varel Price Checker", hr: "Varel provjera cijena", de: "Varel Preis-Checker", fr: "Varel Comparateur de prix", it: "Varel Confronto prezzi", es: "Varel Comparador de precios", zh: "Varel 比价", hi: "Varel मूल्य जांच" };

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const token = new URL(request.url).searchParams.get("token");
  if (!((secret && auth === `Bearer ${secret}`) || token === ONE_TIME_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "llm_scan_requests" (
        "id" TEXT PRIMARY KEY,
        "websiteUrl" TEXT NOT NULL,
        "normalizedDomain" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "companyName" TEXT,
        "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
        "permissionConfirmed" BOOLEAN NOT NULL DEFAULT false,
        "permissionConfirmedAt" TIMESTAMP(3),
        "permissionIp" TEXT,
        "freeScanCompleted" BOOLEAN NOT NULL DEFAULT false,
        "freeScanScore" INTEGER,
        "freeScanJson" JSONB,
        "detailedReportRequested" BOOLEAN NOT NULL DEFAULT false,
        "pageSelectionMethod" TEXT,
        "additionalUrlsJson" JSONB,
        "socialProfileAddon" BOOLEAN NOT NULL DEFAULT false,
        "socialProfileUrlsJson" JSONB,
        "competitorAddon" BOOLEAN NOT NULL DEFAULT false,
        "competitorUrl" TEXT,
        "basePrice" INTEGER NOT NULL DEFAULT 20,
        "addonPrice" INTEGER NOT NULL DEFAULT 0,
        "totalPrice" INTEGER NOT NULL DEFAULT 20,
        "paymentMethod" TEXT NOT NULL DEFAULT 'manual_offer',
        "paymentStatus" TEXT NOT NULL DEFAULT 'not_sent',
        "reportStatus" TEXT NOT NULL DEFAULT 'lead_created',
        "finalReportApprovedByAdmin" BOOLEAN NOT NULL DEFAULT false,
        "approvedByAdminAt" TIMESTAMP(3),
        "privateReportToken" TEXT,
        "publicShareSlug" TEXT,
        "publicShareEnabled" BOOLEAN NOT NULL DEFAULT false,
        "reportJson" JSONB,
        "adminNotes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "llm_scan_requests_privateReportToken_key" ON "llm_scan_requests" ("privateReportToken")`);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "llm_scan_requests_publicShareSlug_key" ON "llm_scan_requests" ("publicShareSlug")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "llm_scan_requests_reportStatus_idx" ON "llm_scan_requests" ("reportStatus")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "llm_scan_requests_email_idx" ON "llm_scan_requests" ("email")`);

    // Rebuild HEADER nav with the 3-item Varel Tools dropdown.
    const languages = await db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } });
    for (const lang of languages) {
      const loc = lang.code;
      const labels = NAV_LABELS[loc] ?? NAV_LABELS.en;
      const menu = await db.menu.upsert({
        where: { location_languageId: { location: "HEADER", languageId: lang.id } },
        create: { name: `HEADER (${loc})`, location: "HEADER", languageId: lang.id },
        update: {},
      });
      await db.menuItem.deleteMany({ where: { menuId: menu.id } });
      const top = [
        { label: labels[0], url: `/${loc}` },
        { label: labels[1], url: `/${loc}/tools?category=ai-tools` },
        { label: labels[2], url: `/${loc}/ai-tool-finder`, dropdown: true },
        { label: labels[3], url: `/${loc}/guides` },
        { label: labels[4], url: `/${loc}/compare` },
        { label: labels[5], url: `/${loc}/editorial` },
        { label: labels[6], url: `/${loc}/about` },
      ];
      let p = 0;
      for (const item of top) {
        const created = await db.menuItem.create({ data: { menuId: menu.id, label: item.label, url: item.url, position: p++ } });
        if (item.dropdown) {
          await db.menuItem.create({ data: { menuId: menu.id, parentItemId: created.id, label: FINDER[loc] ?? FINDER.en, url: `/${loc}/ai-tool-finder`, position: 0 } });
          await db.menuItem.create({ data: { menuId: menu.id, parentItemId: created.id, label: SCANNER[loc] ?? SCANNER.en, url: `/${loc}/varel-tools/llm-visibility-scanner`, position: 1 } });
          await db.menuItem.create({ data: { menuId: menu.id, parentItemId: created.id, label: CHECKER[loc] ?? CHECKER.en, url: `/${loc}/best-deals`, position: 2 } });
        }
      }
    }

    return NextResponse.json({ ok: true, navRebuiltFor: languages.map((l) => l.code) });
  } catch (e) {
    console.error("[migrate-llm-scanner] failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
