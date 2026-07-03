import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteDeal } from "@/server/actions/content";

export default async function AdminDealsPage() {
  const deals = await db.deal.findMany({
    where: { deletedAt: null },
    include: { translations: { include: { language: true } }, affiliateLink: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Deals" action={{ href: "/admin/deals/new", label: "+ New deal" }} />
      <AdminTable
        headers={["Deal", "Brand", "Discount", "Valid until", "Status", "Affiliate", ""]}
        empty={deals.length === 0}
      >
        {deals.map((d) => {
          const main = d.translations.find((t) => t.language.code === "hr") ?? d.translations[0];
          return (
            <tr key={d.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/admin/deals/${d.id}`} className="font-medium hover:text-primary">
                  {main?.title ?? "(untitled)"}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-muted">{d.brandName}</td>
              <td className="px-4 py-3 text-xs">
                {d.discountPercent != null ? `-${d.discountPercent}%` : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {d.validUntil ? d.validUntil.toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
              <td className="px-4 py-3 text-xs">{d.affiliateLink ? "✓" : "—"}</td>
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
