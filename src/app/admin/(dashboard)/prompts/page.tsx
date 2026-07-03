import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deletePrompt } from "@/server/actions/content";

export default async function AdminPromptsPage() {
  const prompts = await db.prompt.findMany({
    where: { deletedAt: null },
    include: {
      translations: { include: { language: true } },
      category: { include: { translations: { where: { language: { code: "en" } } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Prompts" action={{ href: "/admin/prompts/new", label: "+ New prompt" }} />
      <AdminTable
        headers={["Title", "Category", "Difficulty", "Status", "Languages", ""]}
        empty={prompts.length === 0}
      >
        {prompts.map((p) => {
          const main = p.translations.find((t) => t.language.code === "hr") ?? p.translations[0];
          return (
            <tr key={p.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/admin/prompts/${p.id}`} className="font-medium hover:text-primary">
                  {main?.title ?? "(untitled)"}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {p.category?.translations[0]?.name ?? p.category?.slug ?? "—"}
              </td>
              <td className="px-4 py-3 text-xs">{p.difficulty.toLowerCase()}</td>
              <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
              <td className="px-4 py-3 text-xs text-muted">
                {p.translations.map((t) => t.language.code).join(", ")}
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton action={deletePrompt.bind(null, p.id)} />
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
