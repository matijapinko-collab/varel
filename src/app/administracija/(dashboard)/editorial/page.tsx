import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteEditorial } from "@/server/actions/content";

export default async function AdminEditorialPage() {
  const posts = await db.editorialPost.findMany({
    where: { deletedAt: null },
    include: { translations: { include: { language: true } }, author: true },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Editorial — The Varel Brief"
        action={{ href: "/administracija/editorial/new", label: "+ New column" }}
      />
      <p className="mb-4 -mt-2 text-sm text-muted">
        Human-written analysis by the founder. Every post displays the label
        “Written by Matija Pinko — Human-written analysis”.
      </p>
      <AdminTable
        headers={["Title", "Category", "Status", "Languages", ""]}
        empty={posts.length === 0}
      >
        {posts.map((p) => {
          const main = p.translations.find((t) => t.language.code === "hr") ?? p.translations[0];
          return (
            <tr key={p.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/administracija/editorial/${p.id}`} className="font-medium hover:text-primary">
                  {main?.title ?? "(untitled)"}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-muted">{main?.category ?? "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              <td className="px-4 py-3 text-xs text-muted">
                {p.translations.map((t) => t.language.code).join(", ")}
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton action={deleteEditorial.bind(null, p.id)} />
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
