import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { dataQualityOverview } from "@/lib/bisneyscrm/candidates/data-quality";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DetailCard } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";

function Stat({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: string }) {
  const body = (
    <div className={`rounded-2xl border border-border bg-card p-4 ${href ? "hover:border-indigo-500/50" : ""}`}>
      <div className={`text-2xl font-bold tabular-nums ${tone ?? ""}`}>{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function DataQualityPage() {
  await requireBisneysUser();
  const o = await dataQualityOverview();
  const maxBucket = Math.max(1, ...o.buckets.map((b) => b.count));

  return (
    <div className="max-w-4xl">
      <BisneysPageHeader title="Centar kvalitete podataka" description={`${o.total} aktivnih kandidata`} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Bez kontakta (email+tel)" value={o.missingContact} tone="text-red-500" href="/bisneyscrm/candidates" />
        <Stat label="Bez zanimanja" value={o.noProfession} tone="text-amber-500" />
        <Stat label="Popunjenost < 50%" value={o.lowCompleteness} tone="text-amber-500" />
        <Stat label="Neaktivni > 90 dana" value={o.stale} tone="text-amber-500" />
        <Stat label="Mogući duplikati" value={o.possibleDuplicates} tone="text-red-500" href="/bisneyscrm/settings/duplicates" />
        <Stat label="Ukupno kandidata" value={o.total} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailCard title="Distribucija popunjenosti">
          <ul className="space-y-2">
            {o.buckets.map((b) => (
              <li key={b.label} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-muted">{b.label}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-border">
                  <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                </span>
                <span className="w-8 text-right tabular-nums">{b.count}</span>
              </li>
            ))}
          </ul>
        </DetailCard>

        <DetailCard title="Najnepotpuniji profili">
          {o.worst.length === 0 ? <p className="text-sm text-muted">Nema podataka.</p> : (
            <ul className="divide-y divide-border">
              {o.worst.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/bisneyscrm/candidates/${w.id}`} className="font-medium hover:text-indigo-500">{w.name}</Link>
                  <span className="text-xs text-muted">{w.percent}% · nedostaje: {w.missing.slice(0, 3).join(", ")}{w.missing.length > 3 ? "…" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
