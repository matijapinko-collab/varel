import { PERIOD_OPTIONS } from "@/lib/bisneyscrm/dashboard";

/** Time-window selector (brief §20). A GET form — no client JS needed. */
export function PeriodFilter({ period, from, to }: { period: string; from?: string; to?: string }) {
  const inputCls = "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-indigo-500";
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <select name="period" defaultValue={period} className={`${inputCls} cursor-pointer`}>
        {PERIOD_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
      <input type="date" name="from" defaultValue={from ?? ""} className={inputCls} aria-label="Od" />
      <input type="date" name="to" defaultValue={to ?? ""} className={inputCls} aria-label="Do" />
      <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Primijeni</button>
    </form>
  );
}
