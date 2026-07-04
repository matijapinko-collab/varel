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

  return (
    <div>
      <PageHeader title="Best Deals" action={{ href: "/admin/deals/new", label: "+ New deal" }}>
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
                <Link href={`/admin/deals/${d.id}`} className="font-medium hover:text-primary">
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
