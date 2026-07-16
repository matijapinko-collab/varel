import Link from "next/link";

/** KPI card with value + comparison to the previous period (brief §21). */
export function KpiCard({
  label, value, deltaPct, href, hint,
}: {
  label: string; value: string | number; deltaPct?: number | null; href?: string; hint?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted" title={hint}>{label}</span>
        {deltaPct !== undefined && deltaPct !== null && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${deltaPct > 0 ? "bg-green-500/10 text-green-600 dark:text-green-400" : deltaPct < 0 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-soft text-muted"}`}>
            {deltaPct > 0 ? "▲" : deltaPct < 0 ? "▼" : "•"} {Math.abs(deltaPct)}%
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    </>
  );
  const cls = "block rounded-2xl border border-border bg-card p-4 transition-colors";
  return href ? <Link href={href} className={`${cls} hover:border-indigo-500/50`}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
