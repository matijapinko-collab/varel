import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable } from "@/components/admin/ui";

type SeoRow = {
  title: string;
  editUrl: string;
  entityType: string;
  entityId: string;
  languageCode: string;
  issues: string[];
};

/**
 * SEO Manager: scans all published content and flags missing or weak
 * SEO metadata. Each row links straight to the editor.
 */
export default async function AdminSeoPage() {
  const [seoRows, toolTrs, articleTrs, editorialTrs, comparisonTrs, newsTrs, promptTrs, dealTrs, pages] =
    await Promise.all([
      db.seoMetadata.findMany({ include: { language: true } }),
      db.toolTranslation.findMany({
        where: { tool: { deletedAt: null } },
        include: { language: true, tool: true },
      }),
      db.articleTranslation.findMany({
        where: { article: { deletedAt: null } },
        include: { language: true },
      }),
      db.editorialTranslation.findMany({
        where: { editorialPost: { deletedAt: null } },
        include: { language: true },
      }),
      db.comparisonTranslation.findMany({
        where: { comparison: { deletedAt: null } },
        include: { language: true },
      }),
      db.newsTranslation.findMany({
        where: { newsItem: { deletedAt: null } },
        include: { language: true },
      }),
      db.promptTranslation.findMany({
        where: { prompt: { deletedAt: null } },
        include: { language: true },
      }),
      db.dealTranslation.findMany({
        where: { deal: { deletedAt: null } },
        include: { language: true },
      }),
      db.page.findMany({ where: { deletedAt: null }, include: { language: true } }),
    ]);

  const seoIndex = new Map(
    seoRows.map((s) => [`${s.entityType}:${s.entityId}:${s.languageId}`, s])
  );
  const titleCounts = new Map<string, number>();
  for (const s of seoRows) {
    if (s.metaTitle) titleCounts.set(s.metaTitle, (titleCounts.get(s.metaTitle) ?? 0) + 1);
  }

  const rows: SeoRow[] = [];
  const check = (
    entityType: string,
    entityId: string,
    languageId: string,
    languageCode: string,
    title: string,
    editUrl: string,
    extra: { faqMissing?: boolean } = {}
  ) => {
    const seo = seoIndex.get(`${entityType}:${entityId}:${languageId}`);
    const issues: string[] = [];
    if (!seo?.metaTitle) issues.push("missing meta title");
    if (!seo?.metaDescription) issues.push("missing meta description");
    if (!seo?.focusKeyword) issues.push("missing focus keyword");
    if (seo?.metaTitle && (titleCounts.get(seo.metaTitle) ?? 0) > 1) issues.push("duplicate title");
    if (seo?.robots.includes("noindex")) issues.push("noindex");
    if (extra.faqMissing) issues.push("missing FAQ");
    if (seo?.metaTitle && seo.metaTitle.length > 60) issues.push("title too long");
    if (seo?.metaDescription && seo.metaDescription.length > 160) issues.push("description too long");
    if (issues.length) {
      rows.push({ title, editUrl, entityType, entityId, languageCode, issues });
    }
  };

  for (const t of toolTrs) {
    check("TOOL", t.toolId, t.languageId, t.language.code, t.name, `/admin/tools/${t.toolId}?lang=${t.language.code}`, {
      faqMissing: !Array.isArray(t.faqJson) || (t.faqJson as unknown[]).length === 0,
    });
  }
  for (const a of articleTrs) {
    check("ARTICLE", a.articleId, a.languageId, a.language.code, a.title, `/admin/guides/${a.articleId}?lang=${a.language.code}`, {
      faqMissing: !Array.isArray(a.faqJson) || (a.faqJson as unknown[]).length === 0,
    });
  }
  for (const e of editorialTrs) {
    check("EDITORIAL", e.editorialPostId, e.languageId, e.language.code, e.title, `/admin/editorial/${e.editorialPostId}?lang=${e.language.code}`);
  }
  for (const c of comparisonTrs) {
    check("COMPARISON", c.comparisonId, c.languageId, c.language.code, c.title, `/admin/comparisons/${c.comparisonId}?lang=${c.language.code}`);
  }
  for (const n of newsTrs) {
    check("NEWS", n.newsItemId, n.languageId, n.language.code, n.title, `/admin/news/${n.newsItemId}?lang=${n.language.code}`);
  }
  for (const p of promptTrs) {
    check("PROMPT", p.promptId, p.languageId, p.language.code, p.title, `/admin/prompts/${p.promptId}?lang=${p.language.code}`);
  }
  for (const d of dealTrs) {
    check("DEAL", d.dealId, d.languageId, d.language.code, d.title, `/admin/deals/${d.dealId}?lang=${d.language.code}`);
  }
  for (const p of pages) {
    check("PAGE", p.id, p.languageId, p.language.code, p.title, `/admin/pages/${p.id}`);
  }

  rows.sort((a, b) => b.issues.length - a.issues.length);

  return (
    <div>
      <PageHeader title="SEO Manager" />
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-card border border-border bg-card p-4">
          <div className="text-2xl font-bold">{rows.length}</div>
          <div className="mt-1 text-xs text-muted">Items with SEO issues</div>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <div className="text-2xl font-bold">
            {rows.filter((r) => r.issues.includes("missing meta title")).length}
          </div>
          <div className="mt-1 text-xs text-muted">Missing meta titles</div>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <div className="text-2xl font-bold">{seoRows.length}</div>
          <div className="mt-1 text-xs text-muted">SEO records saved</div>
        </div>
      </div>

      <AdminTable headers={["Content", "Type", "Lang", "Issues"]} empty={rows.length === 0}>
        {rows.slice(0, 200).map((row) => (
          <tr key={`${row.entityType}-${row.entityId}-${row.languageCode}`} className="hover:bg-background-secondary/50">
            <td className="px-4 py-3">
              <Link href={row.editUrl} className="font-medium hover:text-primary">
                {row.title}
              </Link>
            </td>
            <td className="px-4 py-3 text-xs text-muted">{row.entityType.toLowerCase()}</td>
            <td className="px-4 py-3 text-xs uppercase text-muted">{row.languageCode}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {row.issues.map((issue) => (
                  <span
                    key={issue}
                    className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500"
                  >
                    {issue}
                  </span>
                ))}
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
