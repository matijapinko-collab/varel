import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { distinctCandidateLabels, getCandidateLabelMap } from "@/lib/bisneyscrm/trello/candidate-map";
import { saveCandidateLabelMap, reparseTrelloCandidatesAction } from "@/server/actions/bisneys-trello";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { PendingButton } from "@/components/bisneyscrm/trello/pending-button";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

const btnPrimary = "rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60";
const btn = "rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-indigo-500/50 disabled:opacity-60";
const inputCls = "w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-indigo-500";

export default async function TrelloLabelMapping() {
  await requireBisneysSuperadmin();
  const [labels, map, professions, cardCount] = await Promise.all([
    distinctCandidateLabels(),
    getCandidateLabelMap(),
    db.bisneysProfession.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.bisneysTrelloCard.count(),
  ]);

  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/settings/trello">Trello integracija</BackLink>
      <BisneysPageHeader
        title="Mapiranje labela → kandidati"
        description="Svaka Trello labela može se mapirati na zanimanje, pipeline status i tag. Sinkronizacija i parser tada obogaćuju kandidate stvorene iz kartica."
      />

      {labels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted">
          Nema pronađenih labela na sinkroniziranim karticama ({cardCount} kartica u bazi).
          Pokreni inicijalnu sinkronizaciju Trella pa se ovdje vrati.
        </div>
      ) : (
        <>
          <form action={saveCandidateLabelMap} className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-2 grid grid-cols-[1fr_1.3fr_1.1fr_1fr] gap-2 border-b border-border pb-2 text-xs font-semibold text-muted">
              <span>Labela</span><span>Zanimanje</span><span>Status</span><span>Tag</span>
            </div>
            <div className="space-y-2">
              {labels.map((label) => {
                const entry = map[label] ?? {};
                return (
                  <div key={label} className="grid grid-cols-[1fr_1.3fr_1.1fr_1fr] items-center gap-2 text-sm">
                    <span className="truncate font-medium" title={label}>{label}</span>
                    <select name={`prof:${label}`} defaultValue={entry.professionId ?? ""} className={inputCls}>
                      <option value="">—</option>
                      {professions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select name={`status:${label}`} defaultValue={entry.status ?? ""} className={inputCls}>
                      <option value="">—</option>
                      {CANDIDATE_STATUS_VALUES.map((s) => <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s]}</option>)}
                    </select>
                    <input name={`tag:${label}`} defaultValue={entry.tag ?? ""} placeholder="tag" className={inputCls} />
                  </div>
                );
              })}
            </div>
            <div className="mt-4"><PendingButton className={btnPrimary} pendingLabel="Spremanje…">Spremi mapiranje</PendingButton></div>
          </form>

          <div className="mt-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-1 text-base font-semibold">Ponovno parsiraj kartice</h2>
            <p className="mb-3 text-sm text-muted">
              Primijeni trenutno mapiranje + parser na sve sinkronizirane kartice povezane s kandidatima
              (email/telefon iz teksta, tagovi/zanimanje iz labela). Obogaćuje samo prazna polja — sigurno za ponavljanje.
            </p>
            <form action={reparseTrelloCandidatesAction}>
              <PendingButton className={btn} pendingLabel="Parsiranje…">Parsiraj kartice u kandidate</PendingButton>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
