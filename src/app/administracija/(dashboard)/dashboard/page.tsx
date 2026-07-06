import Link from "next/link";
import { db } from "@/lib/db";
import { createQuickDraft } from "@/server/actions/content";
import { getAmazonCredentials, isAmazonConfigured } from "@/lib/price-checker/config";
import { getAmazonStatus } from "@/server/actions/integrations";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

type RecentItem = {
  id: string;
  title: string;
  type: string;
  editLabel: string;
  editUrl: string;
  status: string;
  author: string;
  updatedAt: Date;
};

export default async function AdminDashboard() {
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [
    publishedPosts,
    draftPosts,
    pagesCount,
    toolsCount,
    categoriesCount,
    mediaCount,
    recentArticles,
    recentTools,
    recentComparisons,
    recentAudit,
    appVersion,
    postsNoFocus,
    postsNoImage,
    pagesWithMeta,
    pcSearches30,
    amazonStatus,
  ] = await Promise.all([
    safe(() => db.article.count({ where: { status: "PUBLISHED", deletedAt: null } }), 0),
    safe(() => db.article.count({ where: { status: "DRAFT", deletedAt: null } }), 0),
    safe(() => db.page.count({ where: { deletedAt: null } }), 0),
    safe(() => db.tool.count({ where: { deletedAt: null } }), 0),
    safe(() => db.category.count(), 0),
    safe(() => db.media.count(), 0),
    safe(
      () =>
        db.article.findMany({
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 6,
          include: { author: { select: { name: true } }, translations: { take: 1 } },
        }),
      []
    ),
    safe(
      () =>
        db.tool.findMany({
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { id: true, name: true, status: true, updatedAt: true },
        }),
      []
    ),
    safe(
      () =>
        db.comparison.findMany({
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: { translations: { take: 1 } },
        }),
      []
    ),
    safe(
      () =>
        db.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { user: { select: { name: true } } },
        }),
      []
    ),
    safe(() => db.appVersion.findFirst({ where: { status: "APPLIED" }, orderBy: { appliedAt: "desc" } }), null),
    safe(() => db.articleTranslation.count({ where: { status: "PUBLISHED", focusKeyword: null } }), 0),
    safe(() => db.article.count({ where: { status: "PUBLISHED", deletedAt: null, featuredImageId: null } }), 0),
    safe(
      () => db.seoMetadata.count({ where: { entityType: "PAGE", metaDescription: { not: null } } }),
      0
    ),
    safe(() => db.analyticsEvent.count({ where: { type: "SEARCH", entityType: "PRICE_CHECKER", createdAt: { gte: since30 } } }), 0),
    safe(() => getAmazonStatus(), {} as Awaited<ReturnType<typeof getAmazonStatus>>),
  ]);

  // Merge recent content across types.
  const recent: RecentItem[] = [
    ...recentArticles.map((a) => ({
      id: a.id,
      title: a.translations[0]?.title ?? "(untitled)",
      type: "Post",
      editLabel: "Edit Post",
      editUrl: `/administracija/posts/${a.id}/edit`,
      status: a.status,
      author: a.author?.name ?? "—",
      updatedAt: a.updatedAt,
    })),
    ...recentTools.map((t) => ({
      id: t.id,
      title: t.name,
      type: "Tool",
      editLabel: "Edit Tool",
      editUrl: `/administracija/tools/${t.id}`,
      status: t.status,
      author: "—",
      updatedAt: t.updatedAt,
    })),
    ...recentComparisons.map((c) => ({
      id: c.id,
      title: c.translations[0]?.title ?? "(untitled)",
      type: "Comparison",
      editLabel: "Edit Comparison",
      editUrl: `/administracija/comparisons/${c.id}`,
      status: c.status,
      author: "—",
      updatedAt: c.updatedAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8);

  const pagesNoMeta = Math.max(0, pagesCount - pagesWithMeta);
  const credentials = getAmazonCredentials();
  const amazonConfigured = isAmazonConfigured();
  const glance = [
    { label: "Published posts", value: publishedPosts, href: "/administracija/posts?status=PUBLISHED" },
    { label: "Draft posts", value: draftPosts, href: "/administracija/posts?status=DRAFT" },
    { label: "Pages", value: pagesCount, href: "/administracija/pages" },
    { label: "Tools", value: toolsCount, href: "/administracija/tools" },
    { label: "Categories", value: categoriesCount, href: "/administracija/categories" },
    { label: "Media files", value: mediaCount, href: "/administracija/media" },
  ];

  const newLinks = [
    { label: "New Post", href: "/administracija/posts/new" },
    { label: "New Page", href: "/administracija/pages/new" },
    { label: "New Tool", href: "/administracija/tools/new" },
    { label: "New Comparison", href: "/administracija/comparisons/new" },
  ];

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Welcome back — here's what's happening on Varel.</p>
        </div>
        <div className="flex gap-2">
          {newLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              + {l.label.replace("New ", "")}
            </Link>
          ))}
          <Link
            href="/"
            target="_blank"
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary hover:text-primary"
          >
            View site ↗
          </Link>
        </div>
      </div>

      {/* At a Glance */}
      <Widget title="At a Glance" className="mt-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {glance.map((s) => (
            <Link key={s.label} href={s.href} className="rounded-lg border border-border bg-background p-3 transition-transform hover:-translate-y-0.5">
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="mt-0.5 text-xs text-muted">{s.label}</div>
            </Link>
          ))}
        </div>
      </Widget>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Recent Content */}
        <Widget title="Recent Content">
          <div className="divide-y divide-border">
            {recent.length === 0 && <p className="py-3 text-sm text-muted">No content yet.</p>}
            {recent.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span>{item.type}</span>
                    <StatusDot status={item.status} />
                    <span>· {item.author}</span>
                    <span>· {item.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>
                <Link
                  href={item.editUrl}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:border-primary hover:text-primary"
                >
                  {item.editLabel}
                </Link>
              </div>
            ))}
          </div>
        </Widget>

        {/* Quick Draft */}
        <Widget title="Quick Draft">
          <form action={createQuickDraft} className="space-y-3">
            <input
              name="title"
              placeholder="Post title"
              required
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <textarea
              name="body"
              placeholder="What's on your mind?"
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Save Draft
            </button>
          </form>
        </Widget>

        {/* SEO Overview */}
        <Widget title="SEO Overview">
          <ul className="space-y-2 text-sm">
            <SeoRow count={postsNoFocus} label="Published posts without a focus keyword" href="/administracija/posts" />
            <SeoRow count={postsNoImage} label="Published posts missing a featured image" href="/administracija/posts" />
            <SeoRow count={pagesNoMeta} label="Pages missing a meta description" href="/administracija/pages" />
          </ul>
          <Link href="/administracija/seo" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            Open SEO Manager →
          </Link>
        </Widget>

        {/* Recent Activity */}
        <Widget title="Recent Activity">
          <div className="divide-y divide-border">
            {recentAudit.length === 0 && <p className="py-3 text-sm text-muted">No activity yet.</p>}
            {recentAudit.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{log.user?.name ?? "System"}</span>{" "}
                  <span className="text-muted">
                    {log.action.toLowerCase().replace(/_/g, " ")}
                    {log.entityType ? ` · ${log.entityType.toLowerCase()}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted">{log.createdAt.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Widget>

        {/* Price Checker Status */}
        <Widget title="Price Checker Status">
          <ul className="space-y-2 text-sm">
            <StatusRow ok={amazonConfigured} label="Amazon API configured" />
            <StatusRow ok={Boolean(credentials?.partnerTag)} label="Affiliate tag configured" />
            <li className="flex items-center justify-between">
              <span className="text-muted">Last API test</span>
              <span>{amazonStatus.lastTestedAt ? new Date(amazonStatus.lastTestedAt).toLocaleString() : "never"}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">Searches (30 days)</span>
              <span className="font-medium">{pcSearches30}</span>
            </li>
          </ul>
          <Link href="/administracija/integrations" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
            Manage integration →
          </Link>
        </Widget>

        {/* System Status */}
        <Widget title="System Status">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted">App version</span>
              <span className="font-medium">{appVersion?.version ?? process.env.APP_VERSION ?? "0.1.0"}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">Environment</span>
              <span className="font-medium">{process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted">Storage provider</span>
              <span className="font-medium">{process.env.STORAGE_PROVIDER ?? "vercel_blob"}</span>
            </li>
            <StatusRow ok label="Database connected" />
            <StatusRow ok={Boolean(process.env.BLOB_READ_WRITE_TOKEN)} label="Vercel Blob configured" />
            <StatusRow ok={amazonConfigured} label="Amazon API configured" />
          </ul>
        </Widget>
      </div>
    </div>
  );
}

function Widget({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-border bg-card ${className}`}>
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "PUBLISHED" ? "bg-green-500" : status === "DRAFT" ? "bg-amber-500" : "bg-gray-400";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {status.toLowerCase()}
    </span>
  );
}

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${ok ? "text-green-600" : "text-amber-600"}`}>
        <span className={`h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-amber-500"}`} />
        {ok ? "Yes" : "No"}
      </span>
    </li>
  );
}

function SeoRow({ count, label, href }: { count: number; label: string; href: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <Link
        href={href}
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
          count > 0 ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"
        }`}
      >
        {count}
      </Link>
    </li>
  );
}
