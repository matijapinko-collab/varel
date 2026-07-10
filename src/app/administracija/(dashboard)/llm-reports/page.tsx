import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  free_scan_completed: "bg-blue-500/10 text-blue-600",
  waiting_admin_review: "bg-amber-500/10 text-amber-600",
  offer_sent: "bg-purple-500/10 text-purple-600",
  paid: "bg-green-500/10 text-green-600",
  sent: "bg-green-500/10 text-green-600",
  rejected: "bg-red-500/10 text-red-600",
  archived: "bg-gray-400/10 text-gray-500",
};

export default async function LlmReportsPage() {
  const requests = await db.llmScanRequest
    .findMany({ orderBy: { createdAt: "desc" }, take: 200 })
    .catch(() => []);

  const pending = requests.filter((r) => r.reportStatus === "waiting_admin_review").length;

  return (
    <div>
      <PageHeader title="LLM Visibility Reports">
        <Link href="/administracija/settings/llm-scanner" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary">Scanner settings</Link>
      </PageHeader>
      <p className="-mt-2 mb-4 text-sm text-muted">
        Leads and detailed-report requests from the LLM Visibility Scanner.
        {pending > 0 && <span className="ml-1 font-medium text-amber-600">{pending} waiting for review.</span>}
      </p>

      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-background-secondary text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Website</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Lang</th>
              <th className="px-3 py-2">Free score</th>
              <th className="px-3 py-2">Add-ons</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted">No scan requests yet.</td></tr>
            )}
            {requests.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-3 py-2.5">
                  <Link href={`/administracija/llm-reports/${r.id}`} className="font-medium hover:text-primary">{r.normalizedDomain}</Link>
                  {r.name && <div className="text-xs text-muted">{r.name}{r.companyName ? ` · ${r.companyName}` : ""}</div>}
                </td>
                <td className="px-3 py-2.5 text-muted">{r.email}</td>
                <td className="px-3 py-2.5 text-xs uppercase">{r.preferredLanguage}</td>
                <td className="px-3 py-2.5">
                  {r.freeScanScore != null ? (
                    <span className={`font-semibold ${r.freeScanScore >= 70 ? "text-green-600" : r.freeScanScore >= 45 ? "text-amber-600" : "text-red-600"}`}>{r.freeScanScore}</span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">
                  {[r.socialProfileAddon && "Social", r.competitorAddon && "Competitor"].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-2.5">{r.detailedReportRequested ? `${r.totalPrice} €` : "—"}</td>
                <td className="px-3 py-2.5 text-xs capitalize text-muted">{r.paymentStatus.replace(/_/g, " ")}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.reportStatus] ?? "bg-gray-200 text-gray-600"}`}>
                    {r.reportStatus.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">{r.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        Offer/report emails and PDF generation are part of the next phase — this list captures leads and requests.{" "}
        <Link href="/administracija/settings" className="text-primary hover:underline">Configure payment instructions in Settings.</Link>
      </p>
    </div>
  );
}
