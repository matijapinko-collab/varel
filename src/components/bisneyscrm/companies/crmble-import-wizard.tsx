"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseDelimited, type ParsedTable } from "@/lib/bisneyscrm/import/csv";
import { CRMBLE_TARGET_FIELDS, guessCrmbleMapping } from "@/lib/bisneyscrm/crmble/fields";
import { previewCrmbleImportAction, runCrmbleImportAction } from "@/server/actions/bisneys-crmble";
import type { CrmbleRow } from "@/lib/bisneyscrm/crmble/import";

type Step = "input" | "map" | "preview" | "done";
type Preview = Awaited<ReturnType<typeof previewCrmbleImportAction>>;
type Result = Awaited<ReturnType<typeof runCrmbleImportAction>>;

export function CrmbleImportWizard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const parse = (raw: string) => {
    const t = parseDelimited(raw);
    if (!t.headers.length) return;
    setTable(t); setMapping(guessCrmbleMapping(t.headers)); setStep("map");
  };
  const onFile = (f: File) => { const r = new FileReader(); r.onload = () => { const s = String(r.result ?? ""); setText(s); parse(s); }; r.readAsText(f); };

  const buildRows = (): CrmbleRow[] => {
    if (!table) return [];
    return table.rows.map((cols) => {
      const row: Record<string, string> = {};
      for (const [idx, field] of Object.entries(mapping)) { const v = (cols[Number(idx)] ?? "").trim(); if (v) row[field] = v; }
      return row as CrmbleRow;
    });
  };

  const doPreview = () => start(async () => { setPreview(await previewCrmbleImportAction(buildRows())); setStep("preview"); });
  const doImport = () => start(async () => { setResult(await runCrmbleImportAction(buildRows())); setStep("done"); router.refresh(); });

  const mapped = new Set(Object.values(mapping));
  const hasName = mapped.has("fullName") || (mapped.has("firstName") && mapped.has("lastName"));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        {(["input", "map", "preview", "done"] as Step[]).map((s, i) => (
          <span key={s} className={`rounded-full px-2.5 py-1 font-semibold ${step === s ? "bg-indigo-500 text-white" : "bg-card border border-border text-muted"}`}>{i + 1}. {({ input: "Podaci", map: "Mapiranje", preview: "Pregled", done: "Gotovo" } as Record<Step, string>)[s]}</span>
        ))}
      </div>

      {step === "input" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm text-muted">Izvezite kontakte iz Crmblea (CSV/Excel → CSV) i zalijepite ili učitajte datoteku.</p>
          <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="mb-3 block text-sm" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder="Name,Surname,Email,Phone,Company,Job title,Deal value&#10;Ivan,Horvat,ivan@x.com,0912345678,EXCEL COMPUTERS d.o.o.,CTO,15000" className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-indigo-500" />
          <button onClick={() => parse(text)} disabled={!text.trim()} className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Nastavi</button>
        </div>
      )}

      {step === "map" && table && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm text-muted">Poveži Crmble stupce ({table.rows.length} redaka) s Bisneys poljima.</p>
          <div className="space-y-2">
            {table.headers.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                <span className="truncate font-mono text-xs">{h || `(stupac ${i + 1})`} <span className="text-muted">· {(table.rows[0]?.[i] ?? "").slice(0, 22)}</span></span>
                <span className="text-muted">→</span>
                <select value={mapping[i] ?? ""} onChange={(e) => setMapping((m) => { const n = { ...m }; if (e.target.value) n[i] = e.target.value; else delete n[i]; return n; })} className="rounded-lg border border-border bg-background px-2 py-1.5">
                  <option value="">— preskoči —</option>
                  {CRMBLE_TARGET_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          {!hasName && <p className="mt-3 text-xs text-red-500">Mapiraj „Ime i prezime" (ili „Ime" + „Prezime").</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setStep("input")} className="rounded-lg border border-border px-4 py-2 text-sm">Natrag</button>
            <button onClick={doPreview} disabled={!hasName || pending} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Provjera…" : "Pregled + dedup"}</button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-green-500/10 px-3 py-1 text-green-600">Nove osobe: {preview.counts.newPeople}</span>
            <span className="rounded-lg bg-amber-500/10 px-3 py-1 text-amber-600">Postojeće: {preview.counts.existingPeople}</span>
            <span className="rounded-lg bg-blue-500/10 px-3 py-1 text-blue-600">Nove tvrtke: {preview.counts.newCompanies}</span>
          </div>
          <div className="max-h-72 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card"><tr className="text-left text-muted"><th className="px-2 py-1">#</th><th className="px-2 py-1">Osoba</th><th className="px-2 py-1">Tvrtka</th><th className="px-2 py-1">Osoba</th><th className="px-2 py-1">Tvrtka</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.index} className="border-t border-border/60">
                    <td className="px-2 py-1 text-muted">{r.index + 1}</td>
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1">{r.company ?? "—"}</td>
                    <td className="px-2 py-1">{r.valid ? (r.personStatus === "new" ? <span className="text-green-600">nova</span> : <span className="text-amber-600">postoji</span>) : <span className="text-red-600">bez imena</span>}</td>
                    <td className="px-2 py-1">{r.companyStatus === "none" ? "—" : r.companyStatus === "new" ? <span className="text-blue-600">nova</span> : <span className="text-muted">postoji</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setStep("map")} className="rounded-lg border border-border px-4 py-2 text-sm">Natrag</button>
            <button onClick={doImport} disabled={pending} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Uvoz…" : "Uvezi"}</button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-lg font-semibold">Uvoz gotov</p>
          <p className="mt-2 text-sm text-muted">Osobe: <b className="text-green-600">{result.people}</b> · Tvrtke: <b className="text-blue-600">{result.companies}</b> · Kontakti: <b>{result.contacts}</b> · Dealovi: <b>{result.deals}</b> · Preskočeno: <b className="text-amber-600">{result.skipped}</b></p>
          <button onClick={() => router.push("/bisneyscrm/companies")} className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white">Otvori tvrtke</button>
        </div>
      )}
    </div>
  );
}
