import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deletePage } from "@/server/actions/pages";

export default async function AdminPagesPage() {
  const pages = await db.page.findMany({
    where: { deletedAt: null },
    include: { language: true, _count: { select: { blocks: true } } },
    orderBy: [{ isHomepage: "desc" }, { updatedAt: "desc" }],
    take: 300,
  });

  return (
    <div>
      <PageHeader title="Pages" action={{ href: "/administracija/pages/new", label: "+ New page" }} />
      <AdminTable
        headers={["Page", "Language", "Status", "Blocks", "Homepage", ""]}
        empty={pages.length === 0}
      >
        {pages.map((page) => (
          <tr key={page.id} className="hover:bg-background-secondary/50">
            <td className="px-4 py-3">
              <Link href={`/administracija/pages/${page.id}`} className="font-medium hover:text-primary">
                {page.title}
              </Link>
              <div className="text-xs text-muted">
                /{page.language.code}/{page.isHomepage ? "" : page.slug}
              </div>
            </td>
            <td className="px-4 py-3 text-xs uppercase text-muted">{page.language.code}</td>
            <td className="px-4 py-3"><StatusBadge status={page.status} /></td>
            <td className="px-4 py-3 text-xs">{page._count.blocks}</td>
            <td className="px-4 py-3 text-xs">{page.isHomepage ? "🏠" : "—"}</td>
            <td className="px-4 py-3 text-right">
              <DeleteButton action={deletePage.bind(null, page.id)} />
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
