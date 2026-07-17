"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseDelimited, guessMapping, IMPORT_FIELDS, type ParsedTable } from "@/lib/bisneyscrm/import/csv";
import { previewCandidateImport, runCandidateImport, type ImportRow, type PreviewRow } from "@/server/actions/bisneys-import";

type Step = "input" | "map" | "preview" | "done";

export function ImportWizard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<{ rows: PreviewRow[]; counts: { new: number; duplicate: number; invalid: number } } | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [result, setResult] = useState<{ created: number; skipped: number; failed: number } | null>(null);

  const parse = (raw: string) => {
    const t = parseDelimited(raw);
    if (!t.headers.length) return;
    setTable(t); setMapping(guessMapping(t.headers)); setStep("map");
  };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { const s = String(reader.result ?? ""); setText(s); parse(s); };
    reader.readAsText(file);
  };

  const buildRows = (): ImportRow[] => {
    if (!table) return [];
    return table.rows.map((cols) => {
      const row: ImportRow = {};
      for (const [idxStr, field] of Object.entries(mapping)) {
        const v = (cols[Number(idxStr)] ?? "").trim();
        if (v) (row as Record<string, string>)[field] = v;
      }
      return row;
    });
  };

  const doPreview = () => start(async () => { setPreview(await previewCandidateImport(buildRows())); setStep("preview"); });
  const doImport = () => start(async () => {
    const res = await runCandidateImport(buildRows(), { skipDuplicates });
    setResult(res); setStep("done");
    router.refresh();
  });

  const mappedFields = new Set(Object.values(mapping));
  const hasName = mappedFields.has("fullName") || (mappedFields.has("firstName") && mappedFields.has("lastName"));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        {(["input", "map", "preview", "done"] as Step[]).map((s, i) => (
          <span key={s} className={`rounded-full px-2.5 py-1 font-semibold ${step === s ? "bg-indigo-500 text-white" : "bg-card border border-border text-muted"}`}>{i + 1}. {({ input: "Podaci", map: "Mapiranje", preview: "Pregled", done: "Gotovo" } as Record<Step, string>)[s]}</span>
        ))}
      </div>

      {step === "input" && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-sm text-muted">Zalijepite CSV/TSV ili učitajte <code>.csv</code> datoteku. (XLSX: spremite kao CSV u Excelu.)</p>
          <input type="file" accept=".csv,.tsv,.txt,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="mb-3 block text-sm" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="ime,email,telefon,grad,zanimanje&#10;Ivan Horvat,ivan@example.com,0912345678,Zagreb,HVAC serviser"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-indigo-500" />
          <button onClick={() => parse(text)} disabled={!text.trim()} className="mt-3 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Nastavi</button>
        </div>
      )}

      {step === "map" && table && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-sm text-muted">Poveži stupce iz datoteke ({table.rows.length} redaka) s poljima kandidata.</p>
          <div className="space-y-2">
            {table.headers.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                <span className="truncate font-mono text-xs">{h || `(stupac ${i + 1})`} <span className="text-muted">· {(table.rows[0]?.[i] ?? "").slice(0, 24)}</span></span>
                <span className="text-muted">→</span>
                <select value={mapping[i] ?? ""} onChange={(e) => setMapping((m) => { const n = { ...m }; if (e.target.value) n[i] = e.target.value; else delete n[i]; return n; })}
                  className="rounded-lg border border-border bg-background px-2 py-1.5">
                  <option value="">— preskoči —</option>
                  {IMPORT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          {!hasName && <p className="mt-3 text-xs text-red-500">Mapiraj barem „Ime i prezime" (ili „Ime" + „Prezime").</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={() => setStep("input")} className="rounded-lg border border-border px-4 py-2 text-sm">Natrag</button>
            <button onClick={doPreview} disabled={!hasName || pending} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Provjera…" : "Pregled + dedup"}</button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg bg-green-500/10 px-3 py-1 text-green-600">Novi: {preview.counts.new}</span>
            <span className="rounded-lg bg-amber-500/10 px-3 py-1 text-amber-600">Duplikati: {preview.counts.duplicate}</span>
            <span className="rounded-lg bg-red-500/10 px-3 py-1 text-red-600">Neispravni: {preview.counts.invalid}</span>
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card"><tr className="text-left text-muted"><th className="px-2 py-1">#</th><th className="px-2 py-1">Ime</th><th className="px-2 py-1">Email</th><th className="px-2 py-1">Telefon</th><th className="px-2 py-1">Status</th></tr></thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.index} className="border-t border-border/60">
                    <td className="px-2 py-1 text-muted">{r.index + 1}</td>
                    <td className="px-2 py-1">{r.fullName}</td>
                    <td className="px-2 py-1">{r.email ?? "—"}</td>
                    <td className="px-2 py-1">{r.phone ?? "—"}</td>
                    <td className="px-2 py-1">
                      {r.status === "new" && <span className="text-green-600">nov</span>}
                      {r.status === "duplicate" && <span className="text-amber-600">duplikat{r.matchName ? ` (${r.matchName})` : ""}</span>}
                      {r.status === "invalid" && <span className="text-red-600">{r.reason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} /> Preskoči duplikate</label>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setStep("map")} className="rounded-lg border border-border px-4 py-2 text-sm">Natrag</button>
            <button onClick={doImport} disabled={pending} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{pending ? "Uvoz…" : `Uvezi ${skipDuplicates ? preview.counts.new : preview.counts.new + preview.counts.duplicate} kandidata`}</button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-lg font-semibold">Uvoz gotov</p>
          <p className="mt-2 text-sm text-muted">Kreirano: <b className="text-green-600">{result.created}</b> · Preskočeno: <b className="text-amber-600">{result.skipped}</b> · Greške: <b className="text-red-600">{result.failed}</b></p>
          <button onClick={() => router.push("/bisneyscrm/candidates")} className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white">Otvori kandidate</button>
        </div>
      )}
    </div>
  );
}
