import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteComparison } from "@/server/actions/content";

export default async function AdminComparisonsPage() {
  const comparisons = await db.comparison.findMany({
    where: { deletedAt: null },
    include: {
      translations: { include: { language: true } },
      tools: { include: { tool: true }, orderBy: { position: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader
        title="Comparisons"
        action={{ href: "/admin/comparisons/new", label: "+ New comparison" }}
      />
      <AdminTable
        headers={["Title", "Tools", "Status", "Languages", ""]}
        empty={comparisons.length === 0}
      >
        {comparisons.map((c) => {
          const main = c.translations.find((t) => t.language.code === "hr") ?? c.translations[0];
          return (
            <tr key={c.id} className="hover:bg-background-secondary/50">
              <td className="px-4 py-3">
                <Link href={`/admin/comparisons/${c.id}`} className="font-medium hover:text-primary">
                  {main?.title ?? "(untitled)"}
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-muted">
                {c.tools.map((t) => t.tool.name).join(" vs ") || "—"}
              </td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3 text-xs text-muted">
                {c.translations.map((t) => t.language.code).join(", ")}
              </td>
              <td className="px-4 py-3 text-right">
                <DeleteButton action={deleteComparison.bind(null, c.id)} />
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
