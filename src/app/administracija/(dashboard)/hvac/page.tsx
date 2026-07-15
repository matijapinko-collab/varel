import { db } from "@/lib/db";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import { updateHvacLeadStatus } from "@/server/actions/hvac";
import { HvacLeadStatusSelect } from "@/components/admin/hvac-lead-status";
import type { HvacLeadStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<HvacLeadStatus, string> = {
  NEW: "Novi",
  CONTACTED: "Kontaktiran",
  QUALIFIED: "Kvalificiran",
  BETA_CANDIDATE: "Beta kandidat",
  NOT_INTERESTED: "Nije zainteresiran",
  CONVERTED: "Konvertiran",
};

const STATUS_STYLE: Record<HvacLeadStatus, string> = {
  NEW: "bg-blue-500/10 text-blue-600",
  CONTACTED: "bg-amber-500/10 text-amber-600",
  QUALIFIED: "bg-cyan-500/10 text-cyan-600",
  BETA_CANDIDATE: "bg-purple-500/10 text-purple-600",
  NOT_INTERESTED: "bg-gray-400/10 text-gray-500",
  CONVERTED: "bg-green-500/10 text-green-600",
};

export default async function HvacLeadsPage() {
  const leads = await db.hvacLead.findMany({ orderBy: { createdAt: "desc" }, take: 300 }).catch(() => []);
  const newCount = leads.filter((l) => l.status === "NEW").length;

  return (
    <div>
      <PageHeader title="Varel HVAC — prijave" />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Prijave za rani pristup s <code>/hvac</code> landing stranice.
        {newCount > 0 && <span className="ml-1 font-medium text-blue-600">{newCount} novih.</span>}
      </p>

      <AdminTable
        headers={["Datum", "Osoba / tvrtka", "Kontakt", "Tim", "Trenutni sustav", "Paket", "Status"]}
        empty={leads.length === 0}
      >
        {leads.map((l) => (
          <tr key={l.id} className="align-top">
            <td className="px-3 py-2.5 text-xs text-muted">{l.createdAt.toISOString().slice(0, 10)}</td>
            <td className="px-3 py-2.5">
              <div className="font-medium">{l.fullName}</div>
              <div className="text-xs text-muted">{l.company}{l.city ? ` · ${l.city}` : ""}</div>
              {l.message && <div className="mt-1 max-w-xs text-xs text-muted">{l.message}</div>}
            </td>
            <td className="px-3 py-2.5 text-xs">
              <a href={`mailto:${l.email}`} className="text-primary hover:underline">{l.email}</a>
              {l.phone && <div className="text-muted">{l.phone}</div>}
            </td>
            <td className="px-3 py-2.5 text-xs text-muted">{l.teamSize ?? "—"}</td>
            <td className="px-3 py-2.5 text-xs text-muted">{l.currentSystem ?? "—"}</td>
            <td className="px-3 py-2.5 text-xs text-muted">{l.interestedPlan ?? "—"}</td>
            <td className="px-3 py-2.5">
              <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[l.status]}`}>
                {STATUS_LABEL[l.status]}
              </span>
              <HvacLeadStatusSelect
                action={updateHvacLeadStatus.bind(null, l.id)}
                current={l.status}
                options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              />
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
