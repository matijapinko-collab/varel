import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteDeal } from "@/server/actions/content";
import { archiveExpiredDeals } from "@/server/actions/deals";

function isExpired(d: { endsAt: Date | null; validUntil: Date | null }): boolean {
  const end = d.endsAt ?? d.validUntil;
  return end != null && end < new Date();
}

/** Price drops ≥5% detected from consecutive PriceHistory points (last 7 days). */
async function getRecentPriceDrops() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const history = await db.priceHistory.findMany({
    where: { checkedAt: { gte: since }, price: { not: null } },
    orderBy: [{ offerId: "asc" }, { checkedAt: "asc" }],
    include: {
      offer: { include: { tool: true, partner: true } },
    },
    take: 500,
  });
  const drops: {
    toolId: string;
    toolName: string;
    partnerName: string;
    from: number;
    to: number;
    percent: number;
    at: Date;
    currency: string;
  }[] = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1];
    const cur = history[i];
    if (prev.offerId !== cur.offerId) continue;
    const a = Number(prev.price);
    const b = Number(cur.price);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b >= a) continue;
    const percent = Math.round(((a - b) / a) * 100);
    if (percent < 5) continue;
    drops.push({
      toolId: cur.offer.toolId,
      toolName: cur.offer.tool.name,
      partnerName: cur.offer.merchantName ?? cur.offer.partner.name,
      from: a,
      to: b,
      percent,
      at: cur.checkedAt,
      currency: cur.currency,
    });
  }
  return drops.sort((x, y) => y.percent - x.percent).slice(0, 10);
}

export default async function AdminDealsPage() {
  const deals = await db.deal.findMany({
    where: { deletedAt: null },
    include: {
      translations: { include: { language: true } },
      affiliateLink: true,
      product: true,
      partner: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  const expiredCount = deals.filter((d) => d.status === "PUBLISHED" && isExpired(d)).length;
  const priceDrops = await getRecentPriceDrops();

  return (
    <div>
      <PageHeader title="Best Deals" action={{ href: "/administracija/deals/new", label: "+ New deal" }}>
        {expiredCount > 0 && (
          <form action={archiveExpiredDeals}>
            <button
              type="submit"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
            >
              Archive {expiredCount} expired
            </button>
          </form>
        )}
      </PageHeader>
      <p className="mb-4 -mt-2 text-sm text-muted">
        Expired deals (past their end date) are hidden from the site automatically and can
        be archived here in one click.
      </p>

      {priceDrops.length > 0 && (
        <div className="mb-6 rounded-card border border-green-500/30 bg-green-500/5 p-5">
          <h2 className="text-sm font-semibold">
            💚 Recent price drops (last 7 days) — deal opportunities
          </h2>
          <div className="mt-3 space-y-1.5">
            {priceDrops.map((drop, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <Link href={`/administracija/tools/${drop.toolId}/offers`} className="font-medium hover:text-primary">
                    {drop.toolName}
                  </Link>{" "}
                  <span className="text-muted">via {drop.partnerName}</span>
                </span>
                <span className="text-xs">
                  <span className="text-muted line-through">{drop.currency === "EUR" ? "€" : drop.currency + " "}{drop.from.toFixed(2)}</span>{" "}
                  → <span className="font-semibold">{drop.currency === "EUR" ? "€" : drop.currency + " "}{drop.to.toFixed(2)}</span>{" "}
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-bold text-green-600 dark:text-green-400">
                    -{drop.percent}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <AdminTable
        headers={["Deal", "Product / Partner", "Discount", "Featured", "Ends", "Status", ""]}
        empty={deals.length === 0}
      >
        {deals.map((d) => {
          const main = d.translations.find((t) => t.language.code === "hr") ?? d.translations[0];
          const expired = isExpired(d);
          const end = d.endsAt ?? d.validUntil;
          return (
            <tr key={d.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/administracija/deals/${d.id}`} className="font-medium hover:text-primary">
                  {main?.title ?? "(untitled)"}
                </Link>
                <div className="text-xs text-muted">{d.brandName}</div>
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {d.product?.name ?? "—"}
                {d.partner && <div>{d.partner.name}</div>}
              </td>
              <td className="px-4 py-3 text-xs">
                {d.discountPercent != null ? `-${d.discountPercent}%` : "—"}
              </td>
              <td className="px-4 py-3 text-xs">{d.isFeatured ? "★" : "—"}</td>
              <td className="px-4 py-3 text-xs text-muted">
                {end ? end.toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  <StatusBadge status={d.status} />
                  {expired && d.status === "PUBLISHED" && (
                    <span className="inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
                      expired
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton action={deleteDeal.bind(null, d.id)} />
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
