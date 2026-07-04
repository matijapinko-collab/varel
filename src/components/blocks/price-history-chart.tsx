import { db } from "@/lib/db";
import { toNum, formatPrice } from "@/lib/deals";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

/**
 * Lightweight server-rendered SVG price chart (Phase 3) — no client JS, no
 * charting library. Plots the lowest recorded price per day across all offers
 * of a product for the last 90 days. Renders nothing with fewer than 2 points.
 */
export async function PriceHistoryChart({
  toolId,
  locale,
}: {
  toolId: string;
  locale: Locale;
}) {
  const t = getDictionary(locale);
  const since = new Date(Date.now() - 90 * 86_400_000);
  const history = await db.priceHistory.findMany({
    where: { toolId, checkedAt: { gte: since }, price: { not: null } },
    orderBy: { checkedAt: "asc" },
    select: { price: true, currency: true, checkedAt: true },
  });

  // Lowest price per calendar day.
  const byDay = new Map<string, number>();
  let currency = "EUR";
  for (const h of history) {
    const p = toNum(h.price);
    if (p == null) continue;
    currency = h.currency;
    const day = h.checkedAt.toISOString().slice(0, 10);
    const prev = byDay.get(day);
    if (prev == null || p < prev) byDay.set(day, p);
  }
  const points = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, price]) => ({ day, price }));
  if (points.length < 2) return null;

  const W = 640;
  const H = 160;
  const PAD = { top: 12, right: 12, bottom: 24, left: 56 };
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const span = max - min || 1;
  const x = (i: number) =>
    PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (price: number) =>
    PAD.top + (1 - (price - min) / span) * (H - PAD.top - PAD.bottom);

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.price).toFixed(1)}`).join(" ");
  const area = `${PAD.left},${H - PAD.bottom} ${line} ${x(points.length - 1).toFixed(1)},${H - PAD.bottom}`;
  const first = points[0];
  const last = points[points.length - 1];
  const fmtDay = (day: string) =>
    new Date(day + "T00:00:00Z").toLocaleDateString(locale, { day: "numeric", month: "short" });

  return (
    <div className="mt-4 rounded-card border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{t.price_history}</h3>
        <span className="text-xs text-muted">
          {t.lowest_30d.replace("30", "90")}: {formatPrice(min, currency)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`${t.price_history}: ${formatPrice(first.price, currency)} → ${formatPrice(last.price, currency)}`}
      >
        {/* grid lines at min / mid / max */}
        {[min, (min + max) / 2, max].map((v) => (
          <g key={v}>
            <line
              x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)}
              stroke="var(--border)" strokeWidth="1" strokeDasharray="3 4"
            />
            <text
              x={PAD.left - 8} y={y(v) + 3.5} textAnchor="end"
              fontSize="10" fill="var(--muted-foreground)"
            >
              {formatPrice(v, currency)}
            </text>
          </g>
        ))}
        <polygon points={area} fill="var(--primary)" opacity="0.08" />
        <polyline
          points={line} fill="none" stroke="var(--primary)"
          strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        />
        <circle cx={x(points.length - 1)} cy={y(last.price)} r="3.5" fill="var(--primary)" />
        <text x={PAD.left} y={H - 8} fontSize="10" fill="var(--muted-foreground)">
          {fmtDay(first.day)}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">
          {fmtDay(last.day)}
        </text>
      </svg>
    </div>
  );
}
