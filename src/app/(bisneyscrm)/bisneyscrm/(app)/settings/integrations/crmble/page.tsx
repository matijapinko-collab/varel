import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { getSafeConnection } from "@/lib/bisneyscrm/trello/connection";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { CrmbleImportWizard } from "@/components/bisneyscrm/companies/crmble-import-wizard";

export const dynamic = "force-dynamic";

function Diag({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-1.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

export default async function CrmblePage() {
  await requireBisneysUser();
  const conn = await getSafeConnection();
  const cardsWithCrmble = conn.connected
    ? await db.bisneysTrelloCard.count({ where: { customFieldsJson: { not: undefined } } }).catch(() => 0)
    : 0;

  return (
    <div className="max-w-3xl">
      <BisneysPageHeader title="Crmble kontakti" description="Crmble podaci nisu pouzdano dostupni preko Trello API-ja — uvoz ide kroz CSV/Excel export." />

      <section className="mb-4 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 text-base font-semibold">Crmble dijagnostika</h2>
        <Diag label="Trello povezan" value={conn.connected ? "DA" : "NE"} tone={conn.connected ? "text-green-600" : "text-muted"} />
        <Diag label="Kartice s custom/plugin poljima" value={String(cardsWithCrmble)} tone="text-muted" />
        <Diag label="Crmble contact database preko Trello API-ja" value="NE (Power-Up private/shared data)" tone="text-amber-600" />
        <Diag label="Preporučeni način uvoza" value="CSV / Excel export" tone="text-indigo-500" />
        <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Crmble kontakti čine zaseban address book na razini Crmble Teama i ne moraju postojati kao zasebne Trello kartice,
          pa standardna Trello sinkronizacija ne jamči cijelu bazu. Zato koristi Crmble CSV/Excel izvoz pa uvezi ovdje.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-3 text-base font-semibold">Uvezi Crmble kontakte (CSV)</h2>
        <CrmbleImportWizard />
      </section>
    </div>
  );
}
