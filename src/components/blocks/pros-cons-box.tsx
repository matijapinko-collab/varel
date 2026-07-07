import { Check, Minus } from "lucide-react";

/** Public Pros / Cons box — structured, two-column on desktop, stacked on mobile. */
export function ProsConsBox({
  heading,
  intro,
  pros,
  cons,
}: {
  heading?: string | null;
  intro?: string | null;
  pros: string[];
  cons: string[];
}) {
  if (pros.length === 0 && cons.length === 0) return null;
  return (
    <section className="mt-10 rounded-card border border-border bg-card p-6">
      <h2 className="text-xl font-bold">{heading || "Pros and Cons"}</h2>
      {intro && <p className="mt-1 text-sm text-muted">{intro}</p>}
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-600">Pros</h3>
          <ul className="space-y-2">
            {pros.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check size={16} className="mt-0.5 shrink-0 text-green-600" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-500">Cons</h3>
          <ul className="space-y-2">
            {cons.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Minus size={16} className="mt-0.5 shrink-0 text-red-500" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
