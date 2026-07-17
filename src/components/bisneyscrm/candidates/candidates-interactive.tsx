"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  CANDIDATE_FIELDS, FIELD_BY_KEY, OPERATOR_LABELS,
  type FilterGroup, type FilterCondition, type FilterCombinator, type FilterOperator,
} from "@/lib/bisneyscrm/candidates/filter-engine";
import { CANDIDATE_STATUS_LABELS, CANDIDATE_STATUS_VALUES } from "@/lib/bisneyscrm/format";
import { bulkCandidateAction } from "@/server/actions/bisneys-candidate-ops";
import { saveCandidateView } from "@/server/actions/bisneys-candidate-ops";

export type CandidateRow = {
  id: string; name: string; profession: string; city: string;
  status: string; statusLabel: string; profileLabel: string; created: string; tags: string[];
};
type Pool = { id: string; name: string };

const FIELD_WITH_VALUE = (op: FilterOperator) => op !== "isTrue" && op !== "isFalse";

export function CandidatesInteractive({
  rows, pools, initialFilter, returnTo,
}: { rows: CandidateRow[]; pools: Pool[]; initialFilter: FilterGroup | null; returnTo: string }) {
  const router = useRouter();
  const pathname = usePathname();

  /* ---- advanced filter builder ---- */
  const [open, setOpen] = useState(Boolean(initialFilter));
  const [combinator, setCombinator] = useState<FilterCombinator>(initialFilter?.combinator ?? "AND");
  const [conds, setConds] = useState<FilterCondition[]>(initialFilter?.conditions ?? []);

  const addCond = () => {
    const f = CANDIDATE_FIELDS[0];
    setConds((c) => [...c, { field: f.key, op: f.ops[0], value: "" }]);
  };
  const updateCond = (i: number, patch: Partial<FilterCondition>) =>
    setConds((c) => c.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeCond = (i: number) => setConds((c) => c.filter((_, idx) => idx !== i));

  const applyFilter = () => {
    const group: FilterGroup = { combinator, conditions: conds.filter((c) => FIELD_BY_KEY.has(c.field)) };
    const qs = new URLSearchParams();
    if (group.conditions.length) qs.set("f", encodeURIComponent(JSON.stringify(group)));
    router.push(`${pathname}${qs.toString() ? `?${qs}` : ""}`);
  };
  const clearFilter = () => { setConds([]); router.push(pathname); };

  const filterJson = useMemo(
    () => JSON.stringify({ combinator, conditions: conds.filter((c) => FIELD_BY_KEY.has(c.field)) }),
    [combinator, conds],
  );

  /* ---- selection + bulk ---- */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState("");
  const allChecked = rows.length > 0 && selected.size === rows.length;
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  return (
    <div>
      {/* Advanced filter */}
      <div className="mb-4 rounded-2xl border border-border bg-card">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold">
          <span>Napredni filter {conds.length > 0 && <span className="ml-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-500">{conds.length}</span>}</span>
          <span className="text-muted">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div className="border-t border-border px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="text-muted">Poveži uvjete s:</span>
              {(["AND", "OR"] as FilterCombinator[]).map((c) => (
                <button key={c} onClick={() => setCombinator(c)} className={`rounded-lg px-3 py-1 text-xs font-semibold ${combinator === c ? "bg-indigo-500 text-white" : "border border-border"}`}>
                  {c === "AND" ? "I (sve)" : "ILI (bilo koji)"}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {conds.map((c, i) => {
                const def = FIELD_BY_KEY.get(c.field);
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select value={c.field} onChange={(e) => { const nf = FIELD_BY_KEY.get(e.target.value)!; updateCond(i, { field: e.target.value, op: nf.ops[0], value: "" }); }}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                      {CANDIDATE_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                    <select value={c.op} onChange={(e) => updateCond(i, { op: e.target.value as FilterOperator })}
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                      {def?.ops.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
                    </select>
                    {def && FIELD_WITH_VALUE(c.op) && (
                      def.type === "enum" ? (
                        <select value={c.value ?? ""} onChange={(e) => updateCond(i, { value: e.target.value })} className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                          <option value="">—</option>{def.options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      ) : def.key === "pool" ? (
                        <select value={c.value ?? ""} onChange={(e) => updateCond(i, { value: e.target.value })} className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                          <option value="">—</option>{pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      ) : (
                        <input value={c.value ?? ""} onChange={(e) => updateCond(i, { value: e.target.value })} placeholder={def.type === "number" ? "broj" : "vrijednost"}
                          type={def.type === "number" ? "number" : "text"} className="w-40 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
                      )
                    )}
                    <button onClick={() => removeCond(i)} className="rounded-lg border border-border px-2 py-1.5 text-xs text-red-500">Ukloni</button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={addCond} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">+ Uvjet</button>
              <button onClick={applyFilter} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white">Primijeni</button>
              <button onClick={clearFilter} className="rounded-lg border border-border px-3 py-1.5 text-xs">Očisti</button>
              {conds.length > 0 && (
                <form action={saveCandidateView} className="ml-auto flex items-center gap-2">
                  <input type="hidden" name="filters" value={filterJson} />
                  <input name="name" placeholder="Naziv prikaza" required className="w-40 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
                  <label className="flex items-center gap-1 text-xs text-muted"><input type="checkbox" name="isShared" /> dijeli</label>
                  <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">Spremi prikaz</button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk + table */}
      <form action={bulkCandidateAction}>
        <input type="hidden" name="returnTo" value={returnTo} />
        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/5 px-3 py-2 text-sm">
            <span className="font-semibold">{selected.size} odabrano</span>
            <select name="action" value={action} onChange={(e) => setAction(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
              <option value="">Akcija…</option>
              <option value="setStatus">Postavi status</option>
              <option value="addTag">Dodaj tag</option>
              <option value="removeTag">Ukloni tag</option>
              <option value="addToPool">Dodaj u talent pool</option>
              <option value="archive">Arhiviraj</option>
            </select>
            {action === "setStatus" && (
              <select name="value" className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                {CANDIDATE_STATUS_VALUES.map((s) => <option key={s} value={s}>{CANDIDATE_STATUS_LABELS[s]}</option>)}
              </select>
            )}
            {(action === "addTag" || action === "removeTag") && (
              <input name="value" placeholder="tag" className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
            )}
            {action === "addToPool" && (
              <select name="value" className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
                <option value="">Odaberi pool…</option>{pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <button type="submit" disabled={!action} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Primijeni</button>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-10 px-3 py-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th className="px-3 py-2">Ime</th>
                <th className="px-3 py-2">Zanimanje</th>
                <th className="px-3 py-2">Grad</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tagovi</th>
                <th className="px-3 py-2">Unesen</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted">Nema kandidata za zadane uvjete.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-background/50">
                  <td className="px-3 py-2"><input type="checkbox" name="ids" value={r.id} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td className="px-3 py-2 font-medium"><Link href={`/bisneyscrm/candidates/${r.id}`} className="hover:text-indigo-500">{r.name}</Link></td>
                  <td className="px-3 py-2">{r.profession || "—"}</td>
                  <td className="px-3 py-2">{r.city || "—"}</td>
                  <td className="px-3 py-2">{r.statusLabel}</td>
                  <td className="px-3 py-2">{r.tags.length ? <span className="flex flex-wrap gap-1">{r.tags.map((t) => <span key={t} className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-xs text-indigo-500">{t}</span>)}</span> : "—"}</td>
                  <td className="px-3 py-2 text-muted">{r.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
