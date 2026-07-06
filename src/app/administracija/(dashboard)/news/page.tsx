import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteNews } from "@/server/actions/content";

export default async function AdminNewsPage() {
  const items = await db.newsItem.findMany({
    where: { deletedAt: null },
    include: { translations: { include: { language: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="News" action={{ href: "/administracija/news/new", label: "+ New news item" }} />
      <AdminTable
        headers={["Title", "Source", "Priority", "Status", "Languages", ""]}
        empty={items.length === 0}
      >
        {items.map((n) => {
          const main = n.translations.find((t) => t.language.code === "hr") ?? n.translations[0];
          return (
            <tr key={n.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/administracija/news/${n.id}`} className="font-medium hover:text-primary">
                  {main?.title ?? "(untitled)"}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-muted">{n.sourceName ?? "—"}</td>
              <td className="px-4 py-3 text-xs">{n.priority.toLowerCase()}</td>
              <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
              <td className="px-4 py-3 text-xs text-muted">
                {n.translations.map((t) => t.language.code).join(", ")}
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton action={deleteNews.bind(null, n.id)} />
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
