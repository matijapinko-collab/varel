import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader, BisneysEmptyState } from "@/components/bisneyscrm/shared/module-page";
import { RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

const KPIS = [
  "Novi leadovi danas", "Nove tvrtke", "Ukupne aktivnosti", "Pozivi",
  "Follow-upovi", "Sastanci", "Zatvoreni poslovi", "Vrijednost pipelinea",
  "Novi kandidati", "Intervjui", "Poslani klijentu", "Aktivna upozorenja",
];

export default async function BisneysDashboard() {
  const user = await requireBisneysUser();

  const connection = await db.bisneysTrelloConnection.findFirst().catch(() => null);
  const status = connection?.status ?? "DISCONNECTED";
  const lastSynced = connection?.lastSyncedAt
    ? connection.lastSyncedAt.toLocaleString("hr-HR")
    : "—";

  const today = new Date().toLocaleDateString("hr-HR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div>
      <BisneysPageHeader title={`Dobrodošli, ${user.username}`} description={today} />

      {/* Trello sync status strip */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${status === "SYNCED" ? "bg-green-500" : status === "ERROR" ? "bg-red-500" : "bg-muted"}`} />
          Trello: <span className="font-medium">{status}</span>
        </span>
        <span className="flex items-center gap-2 text-muted">
          <RefreshCw size={14} /> Zadnja sinkronizacija: {lastSynced}
        </span>
      </div>

      {/* KPI grid (values populate once entities + Trello sync land) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {KPIS.map((label) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted">{label}</div>
            <div className="mt-2 text-2xl font-bold tabular-nums">—</div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted">Nedavne aktivnosti</h2>
        <BisneysEmptyState
          title="Još nema aktivnosti."
          hint="Aktivnosti će se pojaviti nakon Trello sinkronizacije ili ručnog unosa u CRM-u."
        />
      </div>
    </div>
  );
}
