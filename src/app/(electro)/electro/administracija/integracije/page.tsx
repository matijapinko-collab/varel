import { redirect } from "next/navigation";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

/**
 * Integrations (brief §22). Honest status — none are connected yet. ERP/cloud
 * providers are marked "U pripremi"; the CSV/XLSX import wizard is functional
 * and reached from Materijali → Uvoz. No fake "connected" states (§41).
 */
const INTEGRATIONS: Array<{ name: string; desc: string; status: "soon" | "enterprise" | "available" }> = [
  { name: "Pantheon", desc: "ERP sinkronizacija artikala i zaliha", status: "enterprise" },
  { name: "Minimax", desc: "Knjigovodstvo i artikli", status: "enterprise" },
  { name: "Synesis", desc: "ERP integracija", status: "enterprise" },
  { name: "4D Wand", desc: "ERP integracija", status: "enterprise" },
  { name: "Luceed", desc: "ERP integracija", status: "enterprise" },
  { name: "Google Drive", desc: "Sinkronizacija dokumenata", status: "soon" },
  { name: "OneDrive", desc: "Sinkronizacija dokumenata", status: "soon" },
  { name: "Dropbox", desc: "Sinkronizacija dokumenata", status: "soon" },
  { name: "CSV / XLSX uvoz", desc: "Ručni uvoz artikala i zaliha", status: "available" },
];

const BADGE: Record<string, { label: string; cls: string }> = {
  soon: { label: "U pripremi", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  enterprise: { label: "Enterprise", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
  available: { label: "Dostupno", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
};

export default async function ElectroIntegrationsPage() {
  const ctx = await requireElectroContext();
  if (!ctx.roles.includes("ADMIN")) redirect(`${ELECTRO_APP_BASE}/403`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Integracije</h1>
        <p className="text-sm text-muted">ERP i cloud integracije. Nijedna nije povezana — prikazan je stvarni status.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((it) => {
          const b = BADGE[it.status];
          return (
            <div key={it.name} className={electroCardCls}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold">{it.name}</h2>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.cls}`}>{b.label}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{it.desc}</p>
              <p className="mt-3 text-xs text-muted">
                {it.status === "available" ? "Uvoz artikala kroz Materijali → Uvoz." : it.status === "enterprise" ? "Dostupno u Enterprise paketu." : "Zatražite integraciju kroz podršku."}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
