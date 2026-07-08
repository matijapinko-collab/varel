import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { isLocale } from "@/lib/i18n/config";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { AIToolFinder } from "@/components/quiz/ai-tool-finder";

const SEO = {
  title: "AI Tool Finder: Find the Best AI Tools for Your Work | Varel",
  description:
    "Take Varel's free AI Tool Finder quiz and discover the best AI tools for writing, SEO, coding, research, marketing, design, video, automation and productivity.",
};

export async function generateMetadata(props: PageProps<"/[locale]/ai-tool-finder">): Promise<Metadata> {
  const { locale } = await props.params;
  const path = `/${locale}/ai-tool-finder`;
  return {
    title: SEO.title,
    description: SEO.description,
    alternates: { canonical: path },
    openGraph: { title: SEO.title, description: SEO.description, url: path },
  };
}

const FAQ = [
  { question: "What is the AI Tool Finder?", answer: "The AI Tool Finder is a free quiz that helps you choose AI tools based on your goal, budget, skill level and workflow." },
  { question: "Does the quiz use AI?", answer: "No. The quiz uses Varel's curated tool database, scoring rules and premade recommendation templates. It does not call an AI API." },
  { question: "Is the quiz free?", answer: "Yes. The quiz is free to use." },
  { question: "Are the recommendations sponsored?", answer: "Some links may be affiliate links, but recommendations are based on fit, not commission. Sponsored placements are clearly marked." },
  { question: "How often are tools updated?", answer: "Tool data is reviewed regularly because pricing, features and plans change often." },
  { question: "Can I submit my AI tool?", answer: "Yes. You can submit your AI tool for review." },
];

export default async function AIToolFinderPage(props: PageProps<"/[locale]/ai-tool-finder">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <JsonLd data={faqJsonLd(FAQ)} />

      {/* Hero */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">AI Tool Finder</h1>
        <p className="mt-3 text-lg text-muted">
          Find the best AI tools for your work, budget and skill level in less than 2 minutes.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted">
          Stop guessing which AI tool you need. Answer a few simple questions and Varel will recommend the best AI tools
          for your exact use case — writing, coding, research, marketing, design, automation, video, productivity and
          more. No hype. No random list. Just practical recommendations.
        </p>
      </div>

      {/* Quiz */}
      <div className="mt-10">
        <AIToolFinder locale={locale} />
      </div>

      {/* SEO intro copy (keyword-rich, indexable) */}
      <section className="prose-varel mt-16 max-w-none text-sm text-muted">
        <h2 className="text-xl font-bold text-foreground">The fastest way to choose the best AI tools</h2>
        <p>
          The Varel AI Tool Finder is a free AI tool quiz built to help you pick the best AI tools for your exact
          workflow. Whether you need AI tools for business, AI tools for writing, AI tools for SEO, AI tools for coding,
          AI tools for marketing or AI productivity tools, the quiz matches your goal, budget and skill level against a
          curated database of trusted AI tools — and recommends a practical stack instead of one random name.
        </p>
        <p>
          Every recommendation is deterministic and comes from Varel's curated tool database and scoring rules, not from
          a live AI model. That means fast, consistent, transparent results you can trust.
        </p>
      </section>

      {/* Safety */}
      <section className="mt-10 grid gap-3 sm:grid-cols-2">
        {[
          "AI tools can help organize information, but they should not replace professional medical, legal or financial advice.",
          "Do not upload sensitive customer, legal, financial or personal data unless you understand the tool's privacy and data usage terms.",
          "Review and test AI-generated code before using it in production.",
          "Always verify important facts from primary sources.",
        ].map((note) => (
          <div key={note} className="rounded-lg border border-border bg-card p-3 text-xs text-muted">{note}</div>
        ))}
      </section>

      {/* FAQ */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-border rounded-card border border-border bg-card">
          {FAQ.map((f) => (
            <details key={f.question} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium">{f.question}</summary>
              <p className="mt-2 text-sm text-muted">
                {f.answer}
                {f.question.startsWith("Can I submit") && (
                  <> <Link href={`/${locale}/submit-tool`} className="text-primary hover:underline">Submit a tool →</Link></>
                )}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
