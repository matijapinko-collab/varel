import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { COPY, type Lang } from "@/lib/llm-scanner/data";
import { PrintButton } from "@/components/llm-scanner/print-button";
import type { DetailedReport, FixTask, ReportPage } from "@/lib/llm-scanner/report";
import type { PageScores } from "@/lib/llm-scanner/scan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type FreeShape = { scores?: Record<string, number>; facts?: Record<string, unknown>; topIssues?: { id: string; priority: string; text: string }[] };

export default async function PrivateReportPage(props: PageProps<"/[locale]/report/private/[token]">) {
  const { locale, token } = await props.params;
  const lang: Lang = locale === "hr" ? "hr" : "en";
  const t = COPY[lang];

  const r = await db.llmScanRequest.findUnique({ where: { privateReportToken: token } }).catch(() => null);
  if (!r) notFound();

  const raw = (r.reportJson ?? r.freeScanJson ?? {}) as Record<string, unknown>;
  const isDetailed = raw.version === 1 && Array.isArray(raw.pages);
  const report = isDetailed ? (raw as unknown as DetailedReport) : null;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";

  const scoreColor = (v: number) => (v >= 70 ? "text-green-600" : v >= 45 ? "text-amber-600" : "text-red-600");
  const prioDot = (p: string) => (p === "critical" ? "bg-red-500" : p === "high" ? "bg-orange-500" : p === "medium" ? "bg-amber-500" : "bg-gray-400");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold tracking-tight"><span className="text-primary">V</span>arel</div>
        <PrintButton label={lang === "hr" ? "Preuzmi PDF" : "Download PDF"} />
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">{lang === "hr" ? "Varel LLM Visibility izvještaj" : "Varel LLM Visibility Report"}</h1>
      <div className="mt-2 text-sm text-muted">
        {r.normalizedDomain} · {r.createdAt.toISOString().slice(0, 10)} · {r.preferredLanguage.toUpperCase()}
        {report && <> · {report.pageCount} {lang === "hr" ? "stranica" : "pages"}</>}
      </div>

      {/* ---- Detailed report ---- */}
      {report ? (
        <>
          {/* Executive summary */}
          <section className="mt-8">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{lang === "hr" ? "Sažetak" : "Executive summary"}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${prioDot(report.priority)}`}>{report.priority}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{report.summaryText}</p>
            <ScoreGrid scores={report.siteScores} labels={t.scores} scoreColor={scoreColor} />
          </section>

          {/* Fix queue */}
          {report.fixQueue.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{lang === "hr" ? "Prioritetni popravci" : "Prioritized fix queue"}</h2>
              <div className="mt-3 space-y-2">
                {report.fixQueue.map((f: FixTask) => (
                  <div key={f.id} className="rounded-card border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold capitalize text-white ${prioDot(f.priority)}`}>{f.priority}</span>
                      <span className="rounded-full bg-soft px-2 py-0.5 text-primary">{f.module}</span>
                      <span className="text-muted">{lang === "hr" ? "utjecaj" : "impact"}: {f.estimatedImpact} · {lang === "hr" ? "težina" : "effort"}: {f.difficulty}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium">{f.problem}</div>
                    {f.whyItMatters && <div className="mt-1 text-xs text-muted">{f.whyItMatters}</div>}
                    {f.recommendedFix && <div className="mt-1 text-sm"><span className="font-semibold">{lang === "hr" ? "Popravak" : "Fix"}:</span> {f.recommendedFix}</div>}
                    <div className="mt-1 truncate text-[11px] text-muted">{f.pageUrl}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Static HTML vs Rendered DOM */}
          {report.renderAvailable && report.pages.some((p) => p.renderDelta) && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">Static HTML vs Rendered DOM</h2>
              <p className="mt-2 text-sm text-muted">
                {lang === "hr"
                  ? "Usporedba sadržaja koji je dostupan u sirovom HTML-u naspram onoga što se pojavljuje nakon što preglednik izvrši JavaScript."
                  : "A comparison of the content available in raw HTML versus what appears after a browser runs JavaScript."}
              </p>
              <div className="mt-3 space-y-3">
                {report.pages.filter((p) => p.renderDelta).map((p) => {
                  const d = p.renderDelta!;
                  return (
                    <div key={p.url} className="rounded-card border border-border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-sm font-medium">{p.url}</div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize text-white ${d.jsDependencyLevel === "critical" ? "bg-red-500" : d.jsDependencyLevel === "high" ? "bg-orange-500" : d.jsDependencyLevel === "medium" ? "bg-amber-500" : "bg-green-500"}`}>
                          JS: {d.jsDependencyLevel}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <Fact k={lang === "hr" ? "Statičke riječi" : "Static words"} v={d.staticWordCount} />
                        <Fact k={lang === "hr" ? "Renderirane riječi" : "Rendered words"} v={d.renderedWordCount} />
                        <Fact k={lang === "hr" ? "Dobitak" : "Gain"} v={`${d.renderedContentGainPercent}%`} />
                        <Fact k={lang === "hr" ? "Linkovi (S→R)" : "Links (S→R)"} v={`${d.staticLinkCount}→${d.renderedLinkCount}`} />
                      </div>
                      <p className="mt-2 text-sm text-muted">{d.summary}</p>
                      {p.rendered?.screenshotUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.rendered.screenshotUrl} alt="" loading="lazy" className="mt-3 w-full rounded-lg border border-border" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Per-page analysis */}
          <section className="mt-10">
            <h2 className="text-xl font-bold">{lang === "hr" ? "Analiza po stranici" : "Per-page analysis"}</h2>
            <div className="mt-3 space-y-4">
              {report.pages.map((p: ReportPage) => (
                <div key={p.url} className="rounded-card border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.url}</div>
                      <div className="text-xs uppercase text-muted">{p.pageType}{p.renderDelta ? ` · JS ${p.renderDelta.jsDependencyLevel}` : ""}</div>
                    </div>
                    <div className={`text-2xl font-bold ${scoreColor(p.scores.overall)}`}>{p.scores.overall}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <Fact k={lang === "hr" ? "Riječi" : "Words"} v={p.facts.wordCount} />
                    <Fact k="Title" v={p.facts.title ? "✓" : "missing"} />
                    <Fact k="Meta desc" v={p.facts.metaDescription ? "✓" : "missing"} />
                    <Fact k="H1" v={p.facts.h1 ? "✓" : "missing"} />
                    <Fact k="Schema" v={p.facts.schemaTypes.length ? p.facts.schemaTypes.slice(0, 2).join(", ") : "none"} />
                    <Fact k="FAQ" v={p.facts.faqPresent ? "✓" : "—"} />
                    <Fact k={lang === "hr" ? "Interni linkovi" : "Internal links"} v={p.facts.internalLinksCount} />
                    <Fact k={lang === "hr" ? "Slike bez alt" : "Images no-alt"} v={`${p.facts.imagesNoAlt}/${p.facts.imagesTotal}`} />
                    <Fact k="Canonical" v={p.facts.canonical ? "✓" : "—"} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Competitor */}
          {report.competitor && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{lang === "hr" ? "Usporedba s konkurentom" : "Competitor comparison"}</h2>
              <div className="mt-2 text-sm text-muted">{report.competitor.domain}</div>
              <ScoreGrid scores={report.competitor.scores} labels={t.scores} scoreColor={scoreColor} />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs font-semibold uppercase text-green-600">{lang === "hr" ? "Vi ste jači u" : "You are stronger in"}</div>
                  <ul className="mt-1 text-sm text-muted">{report.competitor.betterAt.length ? report.competitor.betterAt.map((x) => <li key={x}>• {x}</li>) : <li>—</li>}</ul>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs font-semibold uppercase text-red-500">{lang === "hr" ? "Konkurent je jači u" : "Competitor is stronger in"}</div>
                  <ul className="mt-1 text-sm text-muted">{report.competitor.worseAt.length ? report.competitor.worseAt.map((x) => <li key={x}>• {x}</li>) : <li>—</li>}</ul>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium">{report.competitor.note}</p>
            </section>
          )}

          {/* Social profiles */}
          {report.socialProfiles && report.socialProfiles.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">{lang === "hr" ? "Društveni/poslovni profili" : "Social & business profiles"}</h2>
              <div className="mt-3 space-y-2">
                {report.socialProfiles.map((s) => (
                  <div key={s.url} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.reachable ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <div className="font-medium">{s.platform}</div>
                      <div className="truncate text-xs text-muted">{s.url}</div>
                      <div className="text-xs text-muted">{s.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <FreeFallback data={raw as FreeShape} t={t} scoreColor={scoreColor} prioDot={prioDot} lang={lang} />
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

function ScoreGrid({ scores, labels, scoreColor }: { scores: PageScores; labels: Record<string, string>; scoreColor: (v: number) => string }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Object.entries(labels).map(([key, label]) => {
        const v = (scores as Record<string, number>)[key];
        if (v == null) return null;
        return (
          <div key={key} className="rounded-card border border-border bg-card p-4 text-center">
            <div className={`text-2xl font-bold ${scoreColor(v)}`}>{v}</div>
            <div className="mt-1 text-xs text-muted">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function FreeFallback({ data, t, scoreColor, prioDot, lang }: { data: FreeShape; t: (typeof COPY)["en"]; scoreColor: (v: number) => string; prioDot: (p: string) => string; lang: Lang }) {
  const scores = data.scores ?? {};
  const issues = data.topIssues ?? [];
  return (
    <>
      <ScoreGrid scores={scores as unknown as PageScores} labels={t.scores} scoreColor={scoreColor} />
      {issues.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold">{t.topIssues}</h2>
          <ul className="mt-3 space-y-2">
            {issues.map((i) => (
              <li key={i.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${prioDot(i.priority)}`} />
                <span><span className="font-medium capitalize">{i.priority}</span> · {i.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-6 text-xs text-muted">{lang === "hr" ? "Ovo je osnovni scan; detaljni izvještaj generira se nakon plaćanja." : "This is a basic scan; the detailed report is generated after payment."}</p>
    </>
  );
}

function Fact({ k, v }: { k: string; v: unknown }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 py-1">
      <dt className="text-muted">{k}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium">{String(v)}</dd>
    </div>
  );
}
