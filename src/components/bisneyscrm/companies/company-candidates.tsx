import Link from "next/link";
import { linkCandidateToCompany, unlinkCandidateFromCompany } from "@/server/actions/bisneys-candidate-company";
import { COMPANY_RELATION_LABELS, COMPANY_RELATION_VALUES, type CompanyCandidateSummary } from "@/lib/bisneyscrm/companies/candidate-links";
import { shortDate } from "@/lib/bisneyscrm/format";

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2 text-center">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

export function CompanyCandidates({
  companyId, summary, candidateOptions,
}: { companyId: string; summary: CompanyCandidateSummary; candidateOptions: { id: string; name: string }[] }) {
  const { rows, counts } = summary;
  const inputCls = "rounded-lg border border-border bg-background px-2 py-1.5 text-sm";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 text-base font-semibold">Kandidati <span className="text-sm font-normal text-muted">({counts.total})</span></h2>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Kpi label="Ukupno" value={counts.total} />
        <Kpi label="Trenutačni" value={counts.current} />
        <Kpi label="Bivši" value={counts.former} />
        <Kpi label="Poslani klijentu" value={counts.sentToClient} />
        <Kpi label="Na intervjuu" value={counts.interview} />
        <Kpi label="Zaposleni" value={counts.hired} />
      </div>

      {rows.length === 0 ? (
        <p className="mb-4 text-sm text-muted">Još nema povezanih kandidata.</p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Kandidat</th><th className="py-2 pr-3">Zanimanje</th><th className="py-2 pr-3">Odnos</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Zadnja aktivnost</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.source}-${r.linkId ?? r.candidateId}-${i}`} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-medium"><Link href={`/bisneyscrm/candidates/${r.candidateId}`} className="hover:text-indigo-500">{r.name}</Link></td>
                  <td className="py-2 pr-3">{r.profession ?? "—"}</td>
                  <td className="py-2 pr-3"><span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-500">{r.relationLabel}</span></td>
                  <td className="py-2 pr-3 text-muted">{r.status ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r.lastActivity ? shortDate(new Date(r.lastActivity)) : "—"}</td>
                  <td className="py-2 text-right">
                    {r.source === "link" && r.linkId && (
                      <form action={unlinkCandidateFromCompany.bind(null, r.linkId, companyId)}>
                        <button className="text-xs text-red-500 hover:underline">Ukloni</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={linkCandidateToCompany.bind(null, companyId)} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <div>
          <label className="mb-1 block text-xs text-muted">Kandidat</label>
          <select name="candidateId" required className={inputCls}>
            <option value="">Odaberi…</option>
            {candidateOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Odnos</label>
          <select name="relation" defaultValue="POTENTIAL_CONTACT" className={inputCls}>
            {COMPANY_RELATION_VALUES.map((r) => <option key={r} value={r}>{COMPANY_RELATION_LABELS[r]}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90">Poveži kandidata</button>
      </form>
    </div>
  );
}
