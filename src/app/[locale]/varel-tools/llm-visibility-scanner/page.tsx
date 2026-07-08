import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { Scanner } from "@/components/llm-scanner/scanner";
import { COPY, PRICING, type Lang } from "@/lib/llm-scanner/data";

function lang(locale: string): Lang {
  return locale === "hr" ? "hr" : "en";
}

export async function generateMetadata(props: PageProps<"/[locale]/varel-tools/llm-visibility-scanner">): Promise<Metadata> {
  const { locale } = await props.params;
  const l = lang(locale);
  const title = l === "hr" ? "LLM Visibility Scanner | Varel" : "LLM Visibility Scanner | Varel";
  const description = COPY[l].subtitle;
  const path = `/${locale}/varel-tools/llm-visibility-scanner`;
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path } };
}

const FAQ: Record<Lang, { q: string; a: string }[]> = {
  en: [
    { q: "Does this tool use an LLM API?", a: "No. The scanner uses crawling, parsing, local rules and premade report templates. It does not call OpenAI, Claude, Gemini or any other LLM API." },
    { q: "Does the report guarantee visibility in ChatGPT or Google AI Search?", a: "No. The report does not guarantee visibility, ranking or citation. It analyzes your website's readiness and gives practical recommendations." },
    { q: "What does the free scan include?", a: "The free scan checks your homepage and gives a basic LLM readiness score with key issues." },
    { q: "What does the paid report include?", a: "The paid report analyzes your homepage plus four additional pages and includes per-page scores, technical checks, content clarity, schema, AI crawler policy, visual analysis and prioritized fixes." },
    { q: "Can I add social profiles?", a: "Yes. Social and business profile analysis is available as a 10 € add-on." },
    { q: "Can I compare a competitor?", a: "Yes. One competitor comparison is available as a 10 € add-on." },
  ],
  hr: [
    { q: "Koristi li ovaj alat LLM API?", a: "Ne. Scanner koristi crawling, rendering, parsing, lokalna pravila i unaprijed definirane report templateove. Ne koristi OpenAI, Claude, Gemini ni bilo koji drugi LLM API." },
    { q: "Garantira li izvještaj vidljivost u ChatGPT-u ili Google AI Searchu?", a: "Ne. Izvještaj ne garantira vidljivost, rangiranje ili citiranje. Analizira spremnost web stranice i daje praktične preporuke." },
    { q: "Što uključuje besplatni scan?", a: "Besplatni scan provjerava homepage i daje osnovni LLM readiness score s ključnim problemima." },
    { q: "Što uključuje plaćeni izvještaj?", a: "Plaćeni izvještaj analizira homepage plus četiri dodatne stranice i uključuje score po stranici, tehničke provjere, jasnoću sadržaja, schema markup, AI crawler policy, vizualnu analizu i prioritetne popravke." },
    { q: "Mogu li dodati društvene profile?", a: "Da. Analiza Google Business Profilea, LinkedIna i društvenih profila dostupna je kao dodatak od 10 €." },
    { q: "Mogu li usporediti konkurenta?", a: "Da. Usporedba s jednim konkurentom dostupna je kao dodatak od 10 €." },
  ],
};

const INCLUDES: Record<Lang, { free: string[]; detailed: string[] }> = {
  en: {
    free: ["Overall LLM Readiness Score", "Technical Crawlability", "Content Extractability", "Schema Readiness", "AI Crawler Policy", "Visual Consistency", "Top 3 issues"],
    detailed: ["Homepage + 4 additional pages", "Per-page analysis & scores", "AI crawler policy breakdown", "Content clarity & entity structure", "Answer-readiness & schema", "Visual & brand analysis", "Prioritized fix queue", "HTML report + PDF export", "Private report link + public share score"],
  },
  hr: {
    free: ["Ukupni LLM Readiness Score", "Tehnička crawlability", "Izvučivost sadržaja", "Schema spremnost", "AI crawler policy", "Vizualna konzistentnost", "Top 3 problema"],
    detailed: ["Homepage + 4 dodatne stranice", "Analiza i score po stranici", "Detaljan AI crawler policy", "Jasnoća sadržaja i struktura entiteta", "Answer-readiness i schema", "Vizualna i brand analiza", "Prioritetni popis popravaka", "HTML izvještaj + PDF export", "Privatni link + javni score link"],
  },
};

export default async function LlmScannerPage(props: PageProps<"/[locale]/varel-tools/llm-visibility-scanner">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const l = lang(locale);
  const t = COPY[l];
  const inc = INCLUDES[l];
  const faq = FAQ[l];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <JsonLd data={faqJsonLd(faq.map((f) => ({ question: f.q, answer: f.a })))} />

      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t.h1}</h1>
        <p className="mt-3 text-lg text-muted">{t.subtitle}</p>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted">{t.heroBody}</p>
      </div>

      {/* Scanner */}
      <div className="mt-10">
        <Scanner lang={l} />
      </div>

      {/* What's included */}
      <div className="mt-14 grid gap-6 md:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-6">
          <h2 className="text-lg font-bold">{l === "hr" ? "Besplatni scan" : "Free scan"}</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            {inc.free.map((x) => <li key={x} className="flex gap-2"><span className="text-primary">✓</span>{x}</li>)}
          </ul>
        </div>
        <div className="rounded-card border-2 border-primary/30 bg-primary/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{l === "hr" ? "Detaljni izvještaj" : "Detailed report"}</h2>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-sm font-bold text-primary-foreground">{PRICING.base} €</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            {inc.detailed.map((x) => <li key={x} className="flex gap-2"><span className="text-primary">✓</span>{x}</li>)}
          </ul>
          <div className="mt-4 space-y-1 text-xs text-muted">
            <div>+{PRICING.socialAddon} € — {l === "hr" ? "Analiza društvenih/poslovnih profila" : "Social & Business Profile Analysis"}</div>
            <div>+{PRICING.competitorAddon} € — {l === "hr" ? "Usporedba s konkurentom" : "Competitor Comparison"}</div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold">{l === "hr" ? "Česta pitanja" : "Frequently asked questions"}</h2>
        <div className="mt-4 divide-y divide-border rounded-card border border-border bg-card">
          {faq.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-muted">{t.disclaimer}</p>
    </div>
  );
}
