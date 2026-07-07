import { Star } from "lucide-react";

/** Public "Varel Verdict" box — practical recommendation, optional rating. */
export function VerdictBox({
  headline,
  summary,
  bestFor,
  skipIf,
  rating,
}: {
  headline?: string | null;
  summary?: string | null;
  bestFor?: string | null;
  skipIf?: string | null;
  rating?: number | null;
}) {
  return (
    <section className="mt-10 rounded-card border-2 border-primary/30 bg-primary/5 p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">Varel Verdict</span>
        {rating != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground">
            <Star size={13} className="fill-current" /> {rating.toFixed(1)}
          </span>
        )}
      </div>
      {headline && <h2 className="mt-2 text-xl font-bold">{headline}</h2>}
      {summary && <p className="mt-2 text-sm">{summary}</p>}
      {(bestFor || skipIf) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {bestFor && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-green-600">Use it if</div>
              <p className="mt-1 text-sm">{bestFor}</p>
            </div>
          )}
          {skipIf && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-500">Skip it if</div>
              <p className="mt-1 text-sm">{skipIf}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
