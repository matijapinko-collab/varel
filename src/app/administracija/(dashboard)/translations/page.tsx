import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import { createDraftTranslation } from "@/server/actions/translations";

type Row = {
  kind: string;
  id: string;
  title: string;
  editBase: string;
  byLang: Map<string, { status: string }>;
};

/**
 * Translation Manager: matrix of content × languages. Croatian is the source
 * language; the "+" button creates a draft copy in the target language for
 * review (never auto-published).
 */
export default async function AdminTranslationsPage() {
  const languages = await db.language.findMany({
    where: { isEnabled: true },
    orderBy: { position: "asc" },
  });

  const [tools, articles, editorials, news, comparisons, prompts, deals] = await Promise.all([
    db.tool.findMany({
      where: { deletedAt: null },
      include: { translations: { include: { language: true } } },
    }),
    db.article.findMany({
      where: { deletedAt: null },
      include: { translations: { include: { language: true } } },
    }),
    db.editorialPost.findMany({
      where: { deletedAt: null },
      include: { translations: { include: { language: true } } },
    }),
    db.newsItem.findMany({
      where: { deletedAt: null },
      include: { translations: { include: { language: true } } },
    }),
    db.comparison.findMany({
      where: { deletedAt: null },
      include: { translations: { include: { language: true } } },
    }),
    db.prompt.findMany({
      where: { deletedAt: null },
      include: { translations: { include: { language: true } } },
    }),
    db.deal.findMany({
      where: { deletedAt: null },
      include: { translations: { include: { language: true } } },
    }),
  ]);

  const rows: Row[] = [];
  const collect = (
    kind: string,
    items: { id: string; translations: { language: { code: string }; status: string; title?: string; name?: string }[] }[],
    editBase: string
  ) => {
    for (const item of items) {
      const hr = item.translations.find((t) => t.language.code === "hr");
      const title = (hr?.title ?? hr?.name) || (item.translations[0]?.title ?? item.translations[0]?.name) || "(untitled)";
      rows.push({
        kind,
        id: item.id,
        title,
        editBase,
        byLang: new Map(item.translations.map((t) => [t.language.code, { status: t.status }])),
      });
    }
  };

  collect("tool", tools as never, "/administracija/tools");
  collect("article", articles as never, "/administracija/guides");
  collect("editorial", editorials as never, "/administracija/editorial");
  collect("news", news as never, "/administracija/news");
  collect("comparison", comparisons as never, "/administracija/comparisons");
  collect("prompt", prompts as never, "/administracija/prompts");
  collect("deal", deals as never, "/administracija/deals");

  return (
    <div>
      <PageHeader title="Translation Manager" />
      <p className="mb-6 -mt-2 text-sm text-muted">
        Content is written in Croatian (✍️) first. Click <strong>+</strong> to create a
        draft in another language, review it in the editor, then publish. Drafts are never
        auto-published.
      </p>
      <AdminTable
        headers={["Content", "Type", ...languages.map((l) => l.code.toUpperCase())]}
        empty={rows.length === 0}
      >
        {rows.map((row) => (
          <tr key={`${row.kind}-${row.id}`} className="hover:bg-background-secondary/50">
            <td className="max-w-64 truncate px-4 py-3">
              <Link href={`${row.editBase}/${row.id}`} className="font-medium hover:text-primary">
                {row.title}
              </Link>
            </td>
            <td className="px-4 py-3 text-xs text-muted">{row.kind}</td>
            {languages.map((lang) => {
              const tr = row.byLang.get(lang.code);
              if (tr) {
                return (
                  <td key={lang.code} className="px-4 py-3">
                    <Link
                      href={`${row.editBase}/${row.id}?lang=${lang.code}`}
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        tr.status === "PUBLISHED"
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                      }`}
                    >
                      {tr.status === "PUBLISHED" ? "✓" : "draft"}
                    </Link>
                  </td>
                );
              }
              if (lang.code === "hr" || !row.byLang.get("hr")) {
                return (
                  <td key={lang.code} className="px-4 py-3 text-xs text-muted">—</td>
                );
              }
              return (
                <td key={lang.code} className="px-4 py-3">
                  <form action={createDraftTranslation.bind(null, row.kind, row.id, lang.id)}>
                    <button
                      type="submit"
                      title={`Create ${lang.name} draft from Croatian`}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted hover:border-primary hover:text-primary"
                    >
                      +
                    </button>
                  </form>
                </td>
              );
            })}
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
