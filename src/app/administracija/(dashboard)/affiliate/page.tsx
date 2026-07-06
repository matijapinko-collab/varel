import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteAffiliateLink } from "@/server/actions/affiliate";

export default async function AdminAffiliatePage() {
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const links = await db.affiliateLink.findMany({
    where: { deletedAt: null },
    include: {
      tool: true,
      _count: { select: { clicks: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  const recentClicks = await db.affiliateClick.groupBy({
    by: ["affiliateLinkId"],
    where: { clickedAt: { gte: since30 } },
    _count: true,
  });
  const clicks30 = new Map(recentClicks.map((c) => [c.affiliateLinkId, c._count]));

  return (
    <div>
      <PageHeader
        title="Affiliate Manager"
        action={{ href: "/administracija/affiliate/new", label: "+ New affiliate link" }}
      />
      <p className="mb-4 -mt-2 text-sm text-muted">
        Content never hardcodes affiliate URLs — it links to <code>/go/&lt;id&gt;</code>.
        Changing a URL here updates it everywhere instantly.
      </p>
      <AdminTable
        headers={["Brand", "Network", "Status", "Clicks (30d)", "Clicks (total)", "Redirect", ""]}
        empty={links.length === 0}
      >
        {links.map((link) => (
          <tr key={link.id} className="hover:bg-background-secondary/50">
            <td className="px-4 py-3">
              <Link href={`/administracija/affiliate/${link.id}`} className="font-medium hover:text-primary">
                {link.brandName}
              </Link>
              {link.tool && <div className="text-xs text-muted">Tool: {link.tool.name}</div>}
            </td>
            <td className="px-4 py-3 text-xs text-muted">
              {link.network.toLowerCase().replace("_", " ")}
            </td>
            <td className="px-4 py-3"><StatusBadge status={link.status} /></td>
            <td className="px-4 py-3 text-xs">{clicks30.get(link.id) ?? 0}</td>
            <td className="px-4 py-3 text-xs">{link._count.clicks}</td>
            <td className="px-4 py-3 text-xs">
              <code className="select-all rounded bg-soft px-1.5 py-0.5 text-primary">/go/{link.id}</code>
            </td>
            <td className="px-4 py-3 text-right">
              <DeleteButton action={deleteAffiliateLink.bind(null, link.id)} />
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
