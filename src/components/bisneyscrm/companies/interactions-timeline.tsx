"use client";

import { useMemo, useState } from "react";
import { INTERACTION_TYPE_LABELS, MANUAL_INTERACTION_TYPES, INTERACTION_FILTERS } from "@/lib/bisneyscrm/interactions/labels";
import type { InteractionType } from "@/lib/bisneyscrm/interactions/parse";
import { addCompanyInteraction } from "@/server/actions/bisneys-interactions";

export type InteractionRow = {
  id: string; type: InteractionType; source: string; rawContent: string | null;
  title: string | null; actorName: string | null; parsedContactName: string | null;
  needsReview: boolean; edited: boolean; externalUrl: string | null; occurredAt: string;
};

const TONE: Partial<Record<InteractionType, string>> = {
  OUTBOUND_CALL: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  INBOUND_CALL: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  EMAIL: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  MEETING_NOTE: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  FOLLOW_UP: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  CLIENT_FEEDBACK: "bg-pink-500/10 text-pink-600 dark:text-pink-300",
  DEAL_NOTE: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("hr-HR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function InteractionsTimeline({ companyId, interactions }: { companyId: string; interactions: InteractionRow[] }) {
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const preset = INTERACTION_FILTERS.find((f) => f.key === filter);
  const shown = useMemo(
    () => (preset?.types ? interactions.filter((i) => preset.types!.includes(i.type)) : interactions),
    [interactions, preset],
  );
  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Interakcije <span className="text-sm font-normal text-muted">({interactions.length})</span></h2>
        <button onClick={() => setAdding((a) => !a)} className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
          {adding ? "Zatvori" : "+ Dodaj interakciju"}
        </button>
      </div>

      {adding && (
        <form action={addCompanyInteraction.bind(null, companyId)} className="mb-4 space-y-2 rounded-xl border border-border bg-background/50 p-3">
          <div className="flex flex-wrap gap-2">
            <select name="type" defaultValue="GENERAL_NOTE" className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
              {MANUAL_INTERACTION_TYPES.map((t) => <option key={t} value={t}>{INTERACTION_TYPE_LABELS[t]}</option>)}
            </select>
            <input type="datetime-local" name="occurredAt" className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
          </div>
          <textarea name="rawContent" required rows={3} placeholder="Bilješka, sadržaj poziva, dogovor…" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500" />
          <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white">Spremi</button>
        </form>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {INTERACTION_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.key ? "bg-indigo-500 text-white" : "border border-border text-muted hover:border-indigo-500/40"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nema interakcija za ovaj filter.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((i) => {
            const isOpen = expanded.has(i.id);
            const text = i.rawContent ?? "";
            const long = text.length > 160;
            return (
              <li key={i.id} className="border-l-2 border-border pl-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${TONE[i.type] ?? "bg-border/60 text-muted"}`}>{INTERACTION_TYPE_LABELS[i.type]}</span>
                  {i.parsedContactName && <span className="text-xs text-muted">→ {i.parsedContactName}</span>}
                  {i.needsReview && <span className="rounded bg-yellow-500/15 px-1.5 py-0.5 text-[10px] text-yellow-600" title="Niska pouzdanost parsiranja">za pregled</span>}
                  {i.edited && <span className="text-[10px] text-muted">(izmijenjeno)</span>}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{long && !isOpen ? text.slice(0, 160) + "…" : text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>{i.actorName ?? "Sustav"}</span><span>·</span><span>{fmt(i.occurredAt)}</span><span>·</span><span>{i.source === "TRELLO" ? "Trello" : "Bisneys CRM"}</span>
                  {long && <button onClick={() => toggle(i.id)} className="text-indigo-500 hover:underline">{isOpen ? "Sakrij" : "Prikaži cijelu bilješku"}</button>}
                  {i.externalUrl && <a href={i.externalUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Otvori Trello</a>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
