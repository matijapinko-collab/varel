import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteArticle } from "@/server/actions/content";

export default async function AdminGuidesPage() {
  const articles = await db.article.findMany({
    where: { deletedAt: null },
    include: { translations: { include: { language: true } }, author: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Guides" action={{ href: "/administracija/guides/new", label: "+ New guide" }} />
      <AdminTable
        headers={["Title", "Type", "Status", "Languages", "Author", ""]}
        empty={articles.length === 0}
      >
        {articles.map((a) => {
          const main = a.translations.find((t) => t.language.code === "hr") ?? a.translations[0];
          return (
            <tr key={a.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/administracija/guides/${a.id}`} className="font-medium hover:text-primary">
                  {main?.title ?? "(untitled)"}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-muted">{a.type.toLowerCase()}</td>
              <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
              <td className="px-4 py-3 text-xs text-muted">
                {a.translations.map((t) => t.language.code).join(", ")}
              </td>
              <td className="px-4 py-3 text-xs text-muted">{a.author?.name ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <DeleteButton action={deleteArticle.bind(null, a.id)} />
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
