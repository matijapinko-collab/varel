import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { COPY, type Lang } from "@/lib/llm-scanner/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type ScanJson = { scores?: Record<string, number>; topIssues?: { id: string; priority: string; text: string }[] };

export default async function PublicSharePage(props: PageProps<"/[locale]/report/share/[slug]">) {
  const { locale, slug } = await props.params;
  const lang: Lang = locale === "hr" ? "hr" : "en";
  const t = COPY[lang];

  const r = await db.llmScanRequest.findUnique({ where: { publicShareSlug: slug } }).catch(() => null);
  if (!r || !r.publicShareEnabled) notFound();

  const data = ((r.reportJson ?? r.freeScanJson) ?? {}) as ScanJson;
  const scores = data.scores ?? {};
  const overall = scores.overall ?? r.freeScanScore ?? 0;
  const issues = (data.topIssues ?? []).slice(0, 3);

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="rounded-card border border-border bg-card p-8 text-center">
        <div className="text-lg font-bold tracking-tight"><span className="text-primary">V</span>arel</div>
        <div className="mt-4 text-sm uppercase tracking-wide text-muted">{r.normalizedDomain} · {r.createdAt.toISOString().slice(0, 10)}</div>
        <div className={`mt-2 text-6xl font-bold ${overall >= 70 ? "text-green-600" : overall >= 45 ? "text-amber-600" : "text-red-600"}`}>{overall}</div>
        <div className="text-sm text-muted">{t.scores.overall} / 100</div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(t.scores).filter(([k]) => k !== "overall").map(([key, label]) => {
            const v = scores[key];
            if (v == null) return null;
            return (
              <div key={key} className="rounded-lg border border-border bg-background p-2">
                <div className="text-lg font-bold">{v}</div>
                <div className="text-[10px] text-muted">{label as string}</div>
              </div>
            );
          })}
        </div>

        {issues.length > 0 && (
          <ul className="mt-6 space-y-1.5 text-left text-sm">
            {issues.map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-muted">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{i.text}
              </li>
            ))}
          </ul>
        )}

        <Link href={`/${lang}/varel-tools/llm-visibility-scanner`} className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {lang === "hr" ? "Pokreni vlastiti scan" : "Request your own scan"}
        </Link>
      </div>
      <p className="mt-4 text-center text-xs text-muted">{t.disclaimer}</p>
    </div>
  );
}
