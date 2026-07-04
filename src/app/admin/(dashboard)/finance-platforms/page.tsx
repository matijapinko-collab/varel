import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteFinancePlatform } from "@/server/actions/finance";
import { FINANCE_TYPE_LABELS } from "@/lib/finance-data";

export default async function AdminFinancePlatformsPage() {
  const platforms = await db.financePlatform.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return (
    <div>
      <PageHeader
        title="Finance Platforms"
        action={{ href: "/admin/finance-platforms/new", label: "+ New platform review" }}
      />
      <p className="mb-4 -mt-2 text-sm text-muted">
        Brokers, trading platforms, investing apps and financial tools. Educational
        reviews only — never personalized financial advice.
      </p>
      <AdminTable
        headers={["Name", "Type", "Rating", "Status", "Last reviewed", "Updated", ""]}
        empty={platforms.length === 0}
      >
        {platforms.map((p) => (
          <tr key={p.id} className="hover:bg-background-secondary/50">
            <td className="px-4 py-3">
              <Link href={`/admin/finance-platforms/${p.id}`} className="font-medium hover:text-primary">
                {p.name}
              </Link>
              <div className="text-xs text-muted">/{p.slug}</div>
            </td>
            <td className="px-4 py-3 text-xs text-muted">{FINANCE_TYPE_LABELS[p.type]}</td>
            <td className="px-4 py-3 text-xs">{p.ratingOverall?.toFixed(1) ?? "—"}</td>
            <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
            <td className="px-4 py-3 text-xs text-muted">
              {p.lastReviewedAt ? p.lastReviewedAt.toLocaleDateString() : "—"}
            </td>
            <td className="px-4 py-3 text-xs text-muted">{p.updatedAt.toLocaleDateString()}</td>
            <td className="px-4 py-3 text-right">
              <DeleteButton action={deleteFinancePlatform.bind(null, p.id)} />
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
