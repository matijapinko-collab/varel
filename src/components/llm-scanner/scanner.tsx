"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { COPY, PRICING, type Lang } from "@/lib/llm-scanner/data";

type Scores = {
  overall: number;
  technicalCrawlability: number;
  contentExtractability: number;
  schemaReadiness: number;
  crawlerPolicy: number;
  visualConsistency: number;
};
type Issue = { id: string; priority: "critical" | "high" | "medium" | "low"; text: string };
type RenderSignal = { available: boolean; status: string; jsDependencyLevel: string; staticWordCount: number; renderedWordCount: number; contentGainPercent: number; summary: string } | null;
type ScanResponse = { requestId: string | null; domain: string; url: string; scores: Scores; topIssues: Issue[]; render?: RenderSignal };

const ERR: Record<string, { en: string; hr: string }> = {
  invalid_url: { en: "That doesn't look like a valid website URL.", hr: "To ne izgleda kao ispravan URL web stranice." },
  blocked_host: { en: "This host can't be scanned (private or local address).", hr: "Ovaj host se ne može skenirati (privatna ili lokalna adresa)." },
  unreachable: { en: "We couldn't reach that website. Check the URL and try again.", hr: "Nismo mogli dohvatiti tu stranicu. Provjeri URL i pokušaj ponovno." },
  not_html: { en: "That URL didn't return a readable HTML page.", hr: "Taj URL nije vratio čitljivu HTML stranicu." },
  rate_limited: { en: "Too many scans right now — please wait a few minutes.", hr: "Previše skeniranja — pričekaj nekoliko minuta." },
  invalid_input: { en: "Please fill in a valid URL and email, and accept the confirmations.", hr: "Unesi ispravan URL i email te prihvati potvrde." },
};

export function Scanner({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const [phase, setPhase] = useState<"form" | "scanning" | "result">("form");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);

  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [reportLang, setReportLang] = useState<Lang>(lang);
  const [consent, setConsent] = useState(false);
  const [permission, setPermission] = useState(false);

  async function runScan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent || !permission) { setError(ERR.invalid_input[lang]); return; }
    setPhase("scanning");
    try {
      const res = await fetch("/api/llm-scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email, language: reportLang, consent, permission }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((ERR[data.error]?.[lang]) ?? ERR.unreachable[lang]);
        setPhase("form");
        return;
      }
      setResult(data);
      setPhase("result");
    } catch {
      setError(ERR.unreachable[lang]);
      setPhase("form");
    }
  }

  if (phase === "result" && result) {
    return <ScanResult lang={lang} result={result} reportLang={reportLang} email={email} />;
  }

  return (
    <div className="rounded-card border border-border bg-card p-6 sm:p-8">
      <form onSubmit={runScan} className="space-y-4">
        <Field label={t.urlLabel}>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="example.com" className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.emailLabel}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
          </Field>
          <Field label={t.langLabel}>
            <select value={reportLang} onChange={(e) => setReportLang(e.target.value as Lang)} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="en">English</option>
              <option value="hr">Hrvatski</option>
            </select>
          </Field>
        </div>
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          {t.consent}
        </label>
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} className="mt-0.5" />
          {t.permission}
        </label>
        {error && <p className="flex items-center gap-1.5 text-sm text-red-500"><AlertTriangle size={15} /> {error}</p>}
        <button type="submit" disabled={phase === "scanning"} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {phase === "scanning" ? <><Loader2 size={16} className="animate-spin" /> {t.scanning}</> : t.runScan}
        </button>
        <p className="text-xs text-muted">{t.freeNote}</p>
      </form>
    </div>
  );
}

function ScanResult({ lang, result, reportLang, email }: { lang: Lang; result: ScanResponse; reportLang: Lang; email: string }) {
  const t = COPY[lang];
  const s = result.scores;
  const subs: [keyof typeof t.scores, number][] = [
    ["technicalCrawlability", s.technicalCrawlability],
    ["contentExtractability", s.contentExtractability],
    ["schemaReadiness", s.schemaReadiness],
    ["crawlerPolicy", s.crawlerPolicy],
    ["visualConsistency", s.visualConsistency],
  ];
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted">{result.domain}</div>
            <div className="text-lg font-semibold">{t.scores.overall}</div>
          </div>
          <ScoreRing value={s.overall} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {subs.map(([key, val]) => (
            <div key={key} className="rounded-lg border border-border bg-background p-3 text-center">
              <div className={`text-xl font-bold ${scoreColor(val)}`}>{val}</div>
              <div className="mt-1 text-[11px] leading-tight text-muted">{t.scores[key]}</div>
            </div>
          ))}
        </div>
      </div>

      {result.render && result.render.available && (
        <div className="rounded-card border border-border bg-card p-6">
          <h3 className="text-lg font-bold">Static HTML vs Rendered DOM</h3>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-lg border border-border bg-background px-3 py-1.5">{lang === "hr" ? "Statičke riječi" : "Static words"}: <b>{result.render.staticWordCount}</b></span>
            <span className="rounded-lg border border-border bg-background px-3 py-1.5">{lang === "hr" ? "Renderirane riječi" : "Rendered words"}: <b>{result.render.renderedWordCount}</b></span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize text-white ${result.render.jsDependencyLevel === "critical" ? "bg-red-500" : result.render.jsDependencyLevel === "high" ? "bg-orange-500" : result.render.jsDependencyLevel === "medium" ? "bg-amber-500" : "bg-green-500"}`}>JS dependency: {result.render.jsDependencyLevel}</span>
          </div>
          <p className="mt-3 text-sm text-muted">{result.render.summary}</p>
        </div>
      )}

      <div className="rounded-card border border-border bg-card p-6">
        <h3 className="text-lg font-bold">{t.topIssues}</h3>
        <ul className="mt-3 space-y-2">
          {result.topIssues.map((i) => (
            <li key={i.id} className="flex items-start gap-2 text-sm">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${priorityColor(i.priority)}`} />
              <span><span className="font-medium capitalize">{i.priority}</span> · {i.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">{t.disclaimer}</p>
      </div>

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
          {t.requestDetailed}
        </button>
      ) : (
        <DetailedRequestForm lang={lang} requestId={result.requestId} websiteUrl={result.url} defaultEmail={email} defaultReportLang={reportLang} />
      )}
    </div>
  );
}

function DetailedRequestForm({ lang, requestId, websiteUrl, defaultEmail, defaultReportLang }: { lang: Lang; requestId: string | null; websiteUrl: string; defaultEmail: string; defaultReportLang: Lang }) {
  const t = COPY[lang];
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [reportLang, setReportLang] = useState<Lang>(defaultReportLang);
  const [method, setMethod] = useState<"auto_detect" | "manual">("auto_detect");
  const [urls, setUrls] = useState(["", "", "", ""]);
  const [social, setSocial] = useState(false);
  const [socialUrls, setSocialUrls] = useState("");
  const [competitor, setCompetitor] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [permission, setPermission] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const total = PRICING.base + (social ? PRICING.socialAddon : 0) + (competitor ? PRICING.competitorAddon : 0);

  const manualLabel = lang === "hr"
    ? "Odaberi do 4 dodatne stranice ručno ili dopusti da Varel automatski pronađe važne stranice s tvog weba."
    : "Choose up to 4 additional pages manually or let Varel automatically detect important pages from your website.";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent || !permission) { setError(ERR.invalid_input[lang]); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/llm-scanner/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId ?? undefined,
          name, companyName: company, email, websiteUrl, language: reportLang,
          pageSelectionMethod: method,
          additionalUrls: method === "manual" ? urls.filter((u) => u.trim()) : [],
          socialProfileAddon: social,
          socialProfileUrls: social ? socialUrls.split(/[\n,]/).map((s) => s.trim()).filter(Boolean) : [],
          competitorAddon: competitor,
          competitorUrl: competitor ? competitorUrl : undefined,
          notes, consent, permission,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError((ERR[data.error]?.[lang]) ?? ERR.invalid_input[lang]); setBusy(false); return; }
      setDone(true);
    } catch {
      setError(ERR.unreachable[lang]);
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-card border border-green-500/30 bg-green-500/5 p-6 text-center text-sm font-medium text-green-700">
        {t.requestReceived}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-card border border-border bg-card p-6">
      <h3 className="text-lg font-bold">{t.requestDetailed}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={lang === "hr" ? "Ime" : "Name"}><input value={name} onChange={(e) => setName(e.target.value)} className="scan-input" /></Field>
        <Field label={lang === "hr" ? "Tvrtka" : "Company"}><input value={company} onChange={(e) => setCompany(e.target.value)} className="scan-input" /></Field>
        <Field label={t.emailLabel}><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="scan-input" /></Field>
        <Field label={t.langLabel}>
          <select value={reportLang} onChange={(e) => setReportLang(e.target.value as Lang)} className="scan-input">
            <option value="en">English</option><option value="hr">Hrvatski</option>
          </select>
        </Field>
      </div>

      <p className="text-xs text-muted">{manualLabel}</p>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="radio" checked={method === "auto_detect"} onChange={() => setMethod("auto_detect")} /> {lang === "hr" ? "Automatski" : "Auto-detect"}</label>
        <label className="flex items-center gap-2"><input type="radio" checked={method === "manual"} onChange={() => setMethod("manual")} /> {lang === "hr" ? "Ručno" : "Manual URLs"}</label>
      </div>
      {method === "manual" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {urls.map((u, i) => (
            <input key={i} value={u} onChange={(e) => setUrls(urls.map((x, idx) => idx === i ? e.target.value : x))} placeholder={`${lang === "hr" ? "Dodatna stranica" : "Additional page"} ${i + 1}`} className="scan-input" />
          ))}
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-border p-3">
        <label className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2"><input type="checkbox" checked={social} onChange={(e) => setSocial(e.target.checked)} /> {lang === "hr" ? "Analiza društvenih/poslovnih profila" : "Social & Business Profile Analysis"}</span>
          <span className="text-primary">+{PRICING.socialAddon} €</span>
        </label>
        {social && <textarea value={socialUrls} onChange={(e) => setSocialUrls(e.target.value)} rows={2} placeholder={lang === "hr" ? "Profili (jedan po retku)" : "Profile URLs (one per line)"} className="scan-input" />}
      </div>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <label className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2"><input type="checkbox" checked={competitor} onChange={(e) => setCompetitor(e.target.checked)} /> {lang === "hr" ? "Usporedba s konkurentom" : "Competitor Comparison"}</span>
          <span className="text-primary">+{PRICING.competitorAddon} €</span>
        </label>
        {competitor && <input value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} placeholder={lang === "hr" ? "URL konkurenta" : "Competitor URL"} className="scan-input" />}
      </div>

      <Field label={lang === "hr" ? "Napomene" : "Notes"}><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="scan-input" /></Field>

      <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" /> {t.consent}</label>
      <label className="flex items-start gap-2 text-xs text-muted"><input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} className="mt-0.5" /> {t.permission}</label>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{lang === "hr" ? "Ukupno" : "Total"}: {total} €</span>
        <button type="submit" disabled={busy} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? "…" : (lang === "hr" ? "Pošalji zahtjev" : "Send request")}
        </button>
      </div>
      <p className="text-[11px] text-muted">{t.disclaimer}</p>
      <style>{`.scan-input{width:100%;border:1px solid var(--color-border,#e5e7eb);background:var(--color-background,#fff);border-radius:0.5rem;padding:0.5rem 0.7rem;font-size:0.875rem;outline:none}.scan-input:focus{border-color:var(--color-primary,#2563eb)}`}</style>
    </form>
  );
}

function ScoreRing({ value }: { value: number }) {
  const color = value >= 70 ? "#16a34a" : value >= 45 ? "#d97706" : "#dc2626";
  return (
    <div className="relative h-24 w-24">
      <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${value} 100`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{value}</div>
    </div>
  );
}

function scoreColor(v: number) {
  return v >= 70 ? "text-green-600" : v >= 45 ? "text-amber-600" : "text-red-600";
}
function priorityColor(p: string) {
  return p === "critical" ? "bg-red-500" : p === "high" ? "bg-orange-500" : p === "medium" ? "bg-amber-500" : "bg-gray-400";
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted">{label}</span>{children}</label>;
}
