import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { findEntryToCompany, companyInsiders } from "@/lib/bisneyscrm/relationships/pathfinder";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard, SelectInput } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";

const BAND_TONE: Record<string, string> = { Visoka: "bg-green-500/10 text-green-600 dark:text-green-400", Srednja: "bg-amber-500/10 text-amber-600 dark:text-amber-300", Niska: "bg-gray-500/10 text-gray-500" };

export default async function CompanyEntry({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const companyId = typeof sp.companyId === "string" ? sp.companyId : "";
  const sourceId = typeof sp.sourcePersonId === "string" ? sp.sourcePersonId : "";

  const [companies, sources] = await Promise.all([
    db.bisneysCompany.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 500, select: { id: true, name: true } }),
    db.bisneysPerson.findMany({ where: { deletedAt: null }, orderBy: { fullName: "asc" }, take: 500, select: { id: true, fullName: true } }),
  ]);

  let paths: Awaited<ReturnType<typeof findEntryToCompany>> = [];
  let insiderCount = 0;
  let directCount = 0;
  let companyName = "";
  if (companyId) {
    const company = companies.find((c) => c.id === companyId);
    companyName = company?.name ?? "";
    const [insiders, directContacts] = await Promise.all([
      companyInsiders(companyId),
      db.bisneysContact.count({ where: { companyId } }),
    ]);
    insiderCount = insiders.size;
    directCount = directContacts;
    if (sourceId) paths = await findEntryToCompany(sourceId, companyId, { maxDepth: 4 });
  }

  const inputCls = "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500";

  return (
    <div className="max-w-4xl">
      <BackLink href="/bisneyscrm/relationships">Osobe i odnosi</BackLink>
      <BisneysPageHeader title="Pronađi ulaz u tvrtku" description="Najkraći put kroz mrežu odnosa do ciljane tvrtke." />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-2">
        <div><label className="mb-1 block text-xs text-muted">Ciljana tvrtka</label>
          <SelectInput name="companyId" defaultValue={companyId} className="w-64"><option value="">Odaberi tvrtku…</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectInput>
        </div>
        <div><label className="mb-1 block text-xs text-muted">Od osobe (naš kontakt)</label>
          <SelectInput name="sourcePersonId" defaultValue={sourceId} className="w-64"><option value="">Odaberi osobu…</option>{sources.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</SelectInput>
        </div>
        <button type="submit" className={`${inputCls} bg-indigo-500 font-semibold text-white hover:opacity-90`}>Pronađi put</button>
      </form>

      {companyId && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted">Direktni kontakti</div><div className="mt-1 text-2xl font-bold tabular-nums">{directCount}</div></div>
          <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted">Osobe u bazi u toj tvrtki</div><div className="mt-1 text-2xl font-bold tabular-nums">{insiderCount}</div></div>
          <div className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted">Pronađenih puteva</div><div className="mt-1 text-2xl font-bold tabular-nums">{paths.length}</div></div>
        </div>
      )}

      {companyId && !sourceId && <p className="text-sm text-muted">Odaberi i početnu osobu da izračunam najkraći put.</p>}

      {sourceId && companyId && (
        paths.length === 0 ? (
          <DetailCard title="Nema puta">
            <p className="text-sm text-muted">Nije pronađen put do <b>{companyName}</b> unutar 4 koraka. Provjeri postoje li osobe povezane s tom tvrtkom (zaposlenje/kontakt) i odnosi prema njima.</p>
          </DetailCard>
        ) : (
          <div className="space-y-3">
            {paths.map((p, i) => (
              <div key={p.insiderId} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">Preporučeni put</span>}
                    <span className="text-sm text-muted">{p.hops} {p.hops === 1 ? "korak" : "koraka"}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BAND_TONE[p.band]}`}>{p.band} vjerojatnost</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  {p.steps.length === 0 ? (
                    <Link href={`/bisneyscrm/people/${p.insiderId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{p.insiderName}</Link>
                  ) : p.steps.map((s, j) => (
                    <span key={j} className="flex items-center gap-1.5">
                      {j === 0 && <Link href={`/bisneyscrm/people/${s.fromId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{s.fromName}</Link>}
                      <span className={`text-xs ${s.verified ? "text-muted" : "text-amber-600 dark:text-amber-400"}`}>—{s.relType}{s.verified ? "" : " (nepotvrđeno)"}→</span>
                      <Link href={`/bisneyscrm/people/${s.toId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{s.toName}</Link>
                    </span>
                  ))}
                  <span className="text-xs text-muted">—{p.insiderRole}→</span>
                  <span className="font-semibold">{companyName}</span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {p.insiderName} {p.insiderCurrent ? "trenutačno radi" : "radio je"} u ciljanoj tvrtki ({p.insiderRole}).
                </p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
