import Link from "next/link";
import { db } from "@/lib/db";
import { createPost } from "@/server/actions/posts";
import { PostsTable, type PostRow } from "@/components/admin/posts-table";
import type { Prisma } from "@/generated/prisma/client";
import { postPathFor } from "@/lib/post-url";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "All" },
  { key: "PUBLISHED", label: "Published" },
  { key: "DRAFT", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "ARCHIVED", label: "Archived" },
  { key: "trash", label: "Trash" },
];

function whereFor(status: string, q: string, languageId: string): Prisma.ArticleWhereInput {
  const base: Prisma.ArticleWhereInput = {};
  if (status === "trash") base.deletedAt = { not: null };
  else base.deletedAt = null;

  if (status === "PUBLISHED" || status === "DRAFT" || status === "ARCHIVED") base.status = status;
  if (status === "scheduled") base.scheduledAt = { gt: new Date() };

  if (q) {
    base.translations = { some: { title: { contains: q, mode: "insensitive" } } };
  }
  if (languageId) {
    base.translations = {
      some: { ...(q ? { title: { contains: q, mode: "insensitive" } } : {}), languageId },
    };
  }
  return base;
}

export default async function PostsPage(props: PageProps<"/administracija/posts">) {
  const sp = await props.searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const q = typeof sp.q === "string" ? sp.q : "";
  const langFilter = typeof sp.lang === "string" ? sp.lang : "";

  const languages = await db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } });
  const langId = languages.find((l) => l.code === langFilter)?.id ?? "";

  const [articles, counts] = await Promise.all([
    db.article.findMany({
      where: whereFor(status, q, langId),
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        author: { select: { name: true } },
        translations: { include: { language: { select: { code: true } } } },
        primaryCategory: { include: { translations: { select: { name: true, slug: true, languageId: true } } } },
      },
    }),
    Promise.all([
      db.article.count({ where: { deletedAt: null } }),
      db.article.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
      db.article.count({ where: { deletedAt: null, status: "DRAFT" } }),
      db.article.count({ where: { deletedAt: null, scheduledAt: { gt: new Date() } } }),
      db.article.count({ where: { deletedAt: null, status: "ARCHIVED" } }),
      db.article.count({ where: { deletedAt: { not: null } } }),
    ]),
  ]);

  const countByTab: Record<string, number> = {
    all: counts[0],
    PUBLISHED: counts[1],
    DRAFT: counts[2],
    scheduled: counts[3],
    ARCHIVED: counts[4],
    trash: counts[5],
  };

  const rows: PostRow[] = articles.map((a) => {
    const tr =
      a.translations.find((t) => t.language.code === (langFilter || "hr")) ??
      a.translations.find((t) => t.language.code === "hr") ??
      a.translations[0];
    const catName =
      a.primaryCategory?.translations.find((ct) => ct.languageId === (tr?.languageId ?? ""))?.name ??
      a.primaryCategory?.translations[0]?.name ??
      null;
    return {
      id: a.id,
      title: tr?.title ?? "(untitled)",
      slug: tr?.slug ?? "",
      languageId: tr?.languageId ?? "",
      author: a.author?.name ?? "—",
      languages: a.translations.map((t) => t.language.code),
      status: a.status,
      updatedAt: a.updatedAt.toISOString(),
      publishedAt: a.publishedAt?.toISOString() ?? null,
      trashed: a.deletedAt != null,
      seoOk: Boolean(tr?.focusKeyword) && a.featuredImageId != null,
      seoScore: tr?.seoCompletionScore ?? null,
      aiScore: tr?.llmCompletionScore ?? null,
      category: catName,
      previewLocale: tr?.language.code ?? "hr",
      publicUrl: postPathFor(tr?.language.code ?? "hr", tr?.slug ?? "", a, tr?.languageId),
    };
  });

  const buildTabHref = (key: string) => {
    const params = new URLSearchParams();
    if (key !== "all") params.set("status", key);
    if (q) params.set("q", q);
    if (langFilter) params.set("lang", langFilter);
    const qs = params.toString();
    return `/administracija/posts${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <form action={createPost}>
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Add New Post
          </button>
        </form>
      </div>

      {/* Filter tabs */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {TABS.map((tab, i) => {
          const active = status === tab.key || (tab.key === "all" && status === "all");
          return (
            <span key={tab.key} className="flex items-center gap-3">
              {i > 0 && <span className="text-border">|</span>}
              <Link
                href={buildTabHref(tab.key)}
                className={active ? "font-semibold text-primary" : "text-muted hover:text-primary"}
              >
                {tab.label} <span className="text-muted">({countByTab[tab.key] ?? 0})</span>
              </Link>
            </span>
          );
        })}
      </div>

      {/* Search + language filter */}
      <form method="get" className="mt-4 flex flex-wrap gap-2">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search posts…"
          className="h-9 w-64 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <select
          name="lang"
          defaultValue={langFilter}
          className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
        >
          <option value="">All languages</option>
          {languages.map((l) => (
            <option key={l.code} value={l.code}>{l.nativeName}</option>
          ))}
        </select>
        <button className="h-9 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary">
          Filter
        </button>
      </form>

      <div className="mt-4">
        <PostsTable
          rows={rows}
          languages={languages.map((l) => ({ id: l.id, code: l.code, nativeName: l.nativeName }))}
        />
      </div>
    </div>
  );
}
