import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { COPY, type Lang } from "@/lib/llm-scanner/data";
import { PrintButton } from "@/components/llm-scanner/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type ScanJson = {
  scores?: Record<string, number>;
  facts?: Record<string, unknown>;
  topIssues?: { id: string; priority: string; text: string }[];
};

export default async function PrivateReportPage(props: PageProps<"/[locale]/report/private/[token]">) {
  const { locale, token } = await props.params;
  const lang: Lang = locale === "hr" ? "hr" : "en";
  const t = COPY[lang];

  const r = await db.llmScanRequest.findUnique({ where: { privateReportToken: token } }).catch(() => null);
  if (!r) notFound();

  const data = ((r.reportJson ?? r.freeScanJson) ?? {}) as ScanJson;
  const scores = data.scores ?? {};
  const issues = data.topIssues ?? [];
  const facts = (data.facts ?? {}) as Record<string, unknown>;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold tracking-tight"><span className="text-primary">V</span>arel</div>
        <PrintButton label={lang === "hr" ? "Preuzmi PDF" : "Download PDF"} />
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">{lang === "hr" ? "Varel LLM Visibility izvještaj" : "Varel LLM Visibility Report"}</h1>
      <div className="mt-2 text-sm text-muted">
        {r.normalizedDomain} · {r.createdAt.toISOString().slice(0, 10)} · {r.preferredLanguage.toUpperCase()}
      </div>

      {/* Scores */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(t.scores).map(([key, label]) => {
          const v = scores[key];
          if (v == null) return null;
          return (
            <div key={key} className="rounded-card border border-border bg-card p-4 text-center">
              <div className={`text-2xl font-bold ${v >= 70 ? "text-green-600" : v >= 45 ? "text-amber-600" : "text-red-600"}`}>{v}</div>
              <div className="mt-1 text-xs text-muted">{label as string}</div>
            </div>
          );
        })}
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">{t.topIssues}</h2>
          <ul className="mt-3 space-y-2">
            {issues.map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i.priority === "critical" ? "bg-red-500" : i.priority === "high" ? "bg-orange-500" : i.priority === "medium" ? "bg-amber-500" : "bg-gray-400"}`} />
                <span><span className="font-medium capitalize">{i.priority}</span> · {i.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Facts */}
      {Object.keys(facts).length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">{lang === "hr" ? "Što AI može pročitati" : "What AI can read"}</h2>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Fact k="Title" v={facts.title} />
            <Fact k="Meta description" v={facts.metaDescription} />
            <Fact k="H1" v={facts.h1} />
            <Fact k="Word count" v={facts.wordCount} />
            <Fact k="Schema types" v={Array.isArray(facts.schemaTypes) ? (facts.schemaTypes as string[]).join(", ") || "none" : undefined} />
            <Fact k="Images without alt" v={`${facts.imagesNoAlt} / ${facts.imagesTotal}`} />
            <Fact k="FAQ present" v={facts.faqPresent ? "yes" : "no"} />
            <Fact k="Canonical" v={facts.canonical} />
            <Fact k="robots.txt" v={facts.hasRobots ? "found" : "missing"} />
            <Fact k="Blocked AI crawlers" v={Array.isArray(facts.blockedAiBots) ? (facts.blockedAiBots as string[]).join(", ") || "none" : undefined} />
          </dl>
        </section>
      )}

      {/* Implementation CTA */}
      <div className="mt-10 rounded-card border-2 border-primary/30 bg-primary/5 p-6 text-center print:hidden">
        <h3 className="text-lg font-bold">{lang === "hr" ? "Želiš da ti pomognemo popraviti ove probleme?" : "Want us to help fix these issues?"}</h3>
        <Link href={`/${lang}/varel-tools/llm-visibility-scanner`} className="mt-3 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {lang === "hr" ? "Zatraži ponudu za implementaciju" : "Request implementation offer"}
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted">{t.disclaimer}</p>
      <p className="mt-2 text-xs text-muted">Varel · {site.replace(/^https?:\/\//, "")} · matija@pinko.hr</p>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: unknown }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 py-1">
      <dt className="text-muted">{k}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium">{String(v)}</dd>
    </div>
  );
}
