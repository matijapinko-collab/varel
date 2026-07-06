import Link from "next/link";
import { db } from "@/lib/db";

async function count<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function AdminDashboard() {
  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [
    visitorsToday,
    visitors7,
    visitors30,
    affiliateClicks30,
    signups30,
    searches30,
    publishedTools,
    draftTools,
    publishedArticles,
    draftArticles,
    recentAudit,
    appVersion,
  ] = await Promise.all([
    count(() => db.analyticsEvent.count({ where: { type: "PAGE_VIEW", createdAt: { gte: todayStart } } }), 0),
    count(() => db.analyticsEvent.count({ where: { type: "PAGE_VIEW", createdAt: { gte: since7 } } }), 0),
    count(() => db.analyticsEvent.count({ where: { type: "PAGE_VIEW", createdAt: { gte: since30 } } }), 0),
    count(() => db.affiliateClick.count({ where: { clickedAt: { gte: since30 } } }), 0),
    count(() => db.newsletterSubscriber.count({ where: { createdAt: { gte: since30 } } }), 0),
    count(() => db.searchQuery.count({ where: { createdAt: { gte: since30 } } }), 0),
    count(() => db.tool.count({ where: { status: "PUBLISHED", deletedAt: null } }), 0),
    count(() => db.tool.count({ where: { status: "DRAFT", deletedAt: null } }), 0),
    count(() => db.articleTranslation.count({ where: { status: "PUBLISHED" } }), 0),
    count(() => db.articleTranslation.count({ where: { status: "DRAFT" } }), 0),
    count(
      () =>
        db.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { user: { select: { name: true } } },
        }),
      []
    ),
    count(() => db.appVersion.findFirst({ where: { status: "APPLIED" }, orderBy: { appliedAt: "desc" } }), null),
  ]);

  const stats = [
    { label: "Visitors today", value: visitorsToday },
    { label: "Visitors (7 days)", value: visitors7 },
    { label: "Visitors (30 days)", value: visitors30 },
    { label: "Affiliate clicks (30 days)", value: affiliateClicks30 },
    { label: "Newsletter signups (30 days)", value: signups30 },
    { label: "Searches (30 days)", value: searches30 },
    { label: "Published tools", value: publishedTools, href: "/administracija/tools" },
    { label: "Draft tools", value: draftTools, href: "/administracija/tools" },
    { label: "Published articles", value: publishedArticles, href: "/administracija/guides" },
    { label: "Draft articles", value: draftArticles, href: "/administracija/guides" },
  ];

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            App version: {appVersion?.version ?? process.env.APP_VERSION ?? "0.1.0"}
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          View site ↗
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((stat) => {
          const card = (
            <div className="rounded-card border border-border bg-card p-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="mt-1 text-xs text-muted">{stat.label}</div>
            </div>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="transition-transform hover:-translate-y-0.5">
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Latest admin activity</h2>
      <div className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
        {recentAudit.length === 0 && (
          <div className="px-5 py-4 text-sm text-muted">No activity yet.</div>
        )}
        {recentAudit.map((log) => (
          <div key={log.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <span>
              <span className="font-medium">{log.user?.name ?? "System"}</span>{" "}
              <span className="text-muted">
                {log.action.toLowerCase().replace(/_/g, " ")}
                {log.entityType ? ` · ${log.entityType}` : ""}
              </span>
            </span>
            <span className="text-xs text-muted">
              {log.createdAt.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
