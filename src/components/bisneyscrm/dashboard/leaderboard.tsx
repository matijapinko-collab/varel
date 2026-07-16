import type { BisneysActivityType } from "@/generated/prisma/client";
import type { LeaderRow } from "@/lib/bisneyscrm/dashboard";

export type LeaderColumn = { label: string; types: BisneysActivityType[] };

/** Employee leaderboard (brief §24/§33). Columns sum activity counts per actor. */
export function Leaderboard({ rows, columns }: { rows: LeaderRow[]; columns: LeaderColumn[] }) {
  if (rows.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted">Nema aktivnosti zaposlenika u ovom razdoblju.</div>;
  }
  const cell = (row: LeaderRow, types: BisneysActivityType[]) => types.reduce((a, t) => a + (row.counts[t] ?? 0), 0);
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background-secondary text-left">
            <th className="px-4 py-3 font-semibold">Zaposlenik</th>
            {columns.map((c) => <th key={c.label} className="whitespace-nowrap px-4 py-3 text-right font-semibold">{c.label}</th>)}
            <th className="px-4 py-3 text-right font-semibold">Ukupno</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.actor} className="hover:bg-soft">
              <td className="px-4 py-3 font-medium">{r.actor}</td>
              {columns.map((c) => <td key={c.label} className="px-4 py-3 text-right tabular-nums">{cell(r, c.types)}</td>)}
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
