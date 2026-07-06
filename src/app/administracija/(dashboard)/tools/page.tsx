import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteTool } from "@/server/actions/tools";

export default async function AdminToolsPage() {
  const tools = await db.tool.findMany({
    where: { deletedAt: null },
    include: {
      translations: { select: { language: { select: { code: true } } } },
      categories: { include: { category: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Tools" action={{ href: "/administracija/tools/new", label: "+ New tool" }} />
      <AdminTable
        headers={["Name", "Status", "Languages", "Categories", "Rating", ""]}
        empty={tools.length === 0}
      >
        {tools.map((tool) => (
          <tr key={tool.id} className="hover:bg-background-secondary/50">
            <td className="px-4 py-3">
              <Link href={`/administracija/tools/${tool.id}`} className="font-medium hover:text-primary">
                {tool.name}
              </Link>
              <div className="text-xs text-muted">/{tool.slug}</div>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={tool.status} />
            </td>
            <td className="px-4 py-3 text-xs text-muted">
              {tool.translations.map((t) => t.language.code).join(", ") || "—"}
            </td>
            <td className="px-4 py-3 text-xs text-muted">
              {tool.categories.map((c) => c.category.slug).join(", ") || "—"}
            </td>
            <td className="px-4 py-3 text-xs">{tool.editorRating ?? "—"}</td>
            <td className="px-4 py-3 text-right">
              <DeleteButton action={deleteTool.bind(null, tool.id)} />
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
