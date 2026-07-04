import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";
import { deleteStockAnalysis } from "@/server/actions/finance";
import { RISK_LABELS, IDEA_TYPE_LABELS } from "@/lib/finance-data";

export default async function AdminStockAnalysisPage() {
  const analyses = await db.stockAnalysis.findMany({
    where: { deletedAt: null },
    include: { author: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return (
    <div>
      <PageHeader
        title="Stock Analysis"
        action={{ href: "/admin/stock-analysis/new", label: "+ New analysis" }}
      />
      <p className="mb-4 -mt-2 text-sm text-muted">
        Editorial analysis and educational investment ideas — never personalized advice.
        No “buy now” language; every page carries the stock disclaimer automatically.
      </p>
      <AdminTable
        headers={["Company", "Idea type", "Risk", "Status", "Last reviewed", ""]}
        empty={analyses.length === 0}
      >
        {analyses.map((a) => (
          <tr key={a.id} className="hover:bg-background-secondary/50">
            <td className="px-4 py-3">
              <Link href={`/admin/stock-analysis/${a.id}`} className="font-medium hover:text-primary">
                {a.companyName} <span className="font-mono text-xs text-primary">{a.ticker}</span>
              </Link>
            </td>
            <td className="px-4 py-3 text-xs text-muted">{IDEA_TYPE_LABELS[a.investmentIdeaType]}</td>
            <td className="px-4 py-3">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_LABELS[a.riskLevel].tone}`}>
                {RISK_LABELS[a.riskLevel].label}
              </span>
            </td>
            <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
            <td className="px-4 py-3 text-xs text-muted">
              {a.lastReviewedAt ? a.lastReviewedAt.toLocaleDateString() : "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <DeleteButton action={deleteStockAnalysis.bind(null, a.id)} />
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
