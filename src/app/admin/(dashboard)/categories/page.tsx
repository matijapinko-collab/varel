import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteCategory } from "@/server/actions/categories";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    where: { deletedAt: null },
    include: {
      translations: { include: { language: true } },
      _count: { select: { tools: true } },
    },
    orderBy: { position: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        action={{ href: "/admin/categories/new", label: "+ New category" }}
      />
      <AdminTable
        headers={["Category", "Status", "Languages", "Tools", "Featured", ""]}
        empty={categories.length === 0}
      >
        {categories.map((cat) => {
          const en = cat.translations.find((t) => t.language.code === "en");
          return (
            <tr key={cat.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/admin/categories/${cat.id}`} className="font-medium hover:text-primary">
                  {cat.icon} {en?.name ?? cat.slug}
                </Link>
                <div className="text-xs text-muted">/{cat.slug}</div>
              </td>
              <td className="px-4 py-3"><StatusBadge status={cat.status} /></td>
              <td className="px-4 py-3 text-xs text-muted">
                {cat.translations.map((t) => t.language.code).join(", ")}
              </td>
              <td className="px-4 py-3 text-xs">{cat._count.tools}</td>
              <td className="px-4 py-3 text-xs">{cat.isFeatured ? "★" : "—"}</td>
              <td className="px-4 py-3 text-right">
                <DeleteButton action={deleteCategory.bind(null, cat.id)} />
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
