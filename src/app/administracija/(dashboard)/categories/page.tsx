import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { generateLocalizedCategorySlugs } from "@/server/actions/categories";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteCategory } from "@/server/actions/categories";
import { seedAcademyCategories } from "@/server/actions/academy";

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
        action={{ href: "/administracija/categories/new", label: "+ New category" }}
      />
      <form action={generateLocalizedCategorySlugs} className="-mt-2 mb-4">
        <button className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary">
          Generate localized slugs
        </button>
        <span className="ml-2 text-xs text-muted">
          Fills each language&apos;s slug from its translated name (e.g. &ldquo;AI alati&rdquo; → <code>ai-alati</code>),
          so Croatian post URLs read /hr/ai-alati/… Hand-edited slugs are left alone.
        </span>
      </form>
      <form action={seedAcademyCategories} className="mb-4">
        <button className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary">
          Seed Academy categories
        </button>
        <span className="ml-2 text-xs text-muted">
          Creates the <code>Akademija</code> / <code>Academy</code> parent plus its 15 topics. Safe to
          re-run — it matches on slug, refreshes names, and never overwrites a slug you edited.
        </span>
      </form>
      <AdminTable
        headers={["Category", "Status", "Languages", "Tools", "Featured", ""]}
        empty={categories.length === 0}
      >
        {categories.map((cat) => {
          const en = cat.translations.find((t) => t.language.code === "en");
          return (
            <tr key={cat.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/administracija/categories/${cat.id}`} className="font-medium hover:text-primary">
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
