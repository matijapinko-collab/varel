import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteAffiliatePartner } from "@/server/actions/deals";

export default async function AdminPartnersPage() {
  const partners = await db.affiliatePartner.findMany({
    where: { deletedAt: null },
    include: { _count: { select: { offers: true } } },
    orderBy: [{ priority: "desc" }, { name: "asc" }],
    take: 300,
  });

  return (
    <div>
      <PageHeader
        title="Affiliate Partners"
        action={{ href: "/administracija/affiliate-partners/new", label: "+ New partner" }}
      />
      <p className="mb-4 -mt-2 text-sm text-muted">
        Retailers and networks behind product offers. Offers reference a partner; the Best
        Deals module picks the best available offer per product.
      </p>
      <AdminTable
        headers={["Partner", "Type", "Network", "Priority", "Offers", "Active", ""]}
        empty={partners.length === 0}
      >
        {partners.map((p) => (
          <tr key={p.id} className="hover:bg-background-secondary/50">
            <td className="px-4 py-3">
              <Link href={`/administracija/affiliate-partners/${p.id}`} className="font-medium hover:text-primary">
                {p.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-xs text-muted">{p.partnerType.toLowerCase()}</td>
            <td className="px-4 py-3 text-xs text-muted">{p.affiliateNetwork ?? "—"}</td>
            <td className="px-4 py-3 text-xs">{p.priority}</td>
            <td className="px-4 py-3 text-xs">{p._count.offers}</td>
            <td className="px-4 py-3 text-xs">{p.isActive ? "✓" : "—"}</td>
            <td className="px-4 py-3 text-right">
              <DeleteButton action={deleteAffiliatePartner.bind(null, p.id)} />
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
