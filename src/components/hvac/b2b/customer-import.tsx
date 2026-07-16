"use client";

import { useActionState } from "react";
import { importCustomersCsv, type ImportResult } from "@/server/actions/hvac-customers";

export function CustomerImport() {
  const [state, action, pending] = useActionState<ImportResult, FormData>(
    (_prev, form) => importCustomersCsv(_prev, form),
    {},
  );

  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Uvoz klijenata iz CSV-a</summary>
      <div className="border-t border-border p-4">
        <p className="text-sm text-muted">
          Učitajte CSV datoteku sa stupcima: <code className="text-xs">tip, ime, prezime, naziv_tvrtke, oib, email, telefon, adresa, grad, postanski_broj, napomena</code>.{" "}
          <a href="/api/hvac-b2b/import-template" className="text-sky-600 hover:underline dark:text-sky-300">Preuzmi predložak</a>
        </p>
        <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          <button type="submit" disabled={pending} className="rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {pending ? "Uvozim…" : "Uvezi"}
          </button>
        </form>
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        {state.imported != null && (
          <div className="mt-2 text-sm">
            <p className="text-emerald-600 dark:text-emerald-300">Uvezeno: {state.imported}. Preskočeno: {state.skipped ?? 0}.</p>
            {state.errors && state.errors.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-amber-600 dark:text-amber-300">
                {state.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
