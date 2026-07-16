import type { Metadata } from "next";
import { JsonLd, faqJsonLd } from "@/lib/seo";
import { hvacFaq, hvacPricing, HVAC_ROUTES } from "@/lib/hvac/content";
import { HvacNav } from "@/components/hvac/hvac-nav";
import { HvacFooter } from "@/components/hvac/hvac-footer";
import { HvacHero } from "@/components/hvac/hvac-hero";
import {
  HvacTargetAudience, HvacProblemSolution, HvacBenefits, HvacWorkflow,
  HvacRecurringRevenue, HvacBookingComparison, HvacWebsiteAddon, HvacFinalCta,
} from "@/components/hvac/hvac-sections";
import { HvacDemoPreview } from "@/components/hvac/hvac-demo-preview";
import { HvacPricing } from "@/components/hvac/hvac-pricing";
import { HvacFaq } from "@/components/hvac/hvac-faq";
import { HvacEarlyAccessForm } from "@/components/hvac/hvac-early-access-form";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://varel.io";
const URL = `${SITE}${HVAC_ROUTES.landing}`;

const TITLE = "Varel HVAC | Softver za servisere i montažere klima-uređaja";
const DESCRIPTION =
  "Organizirajte klijente, klima-uređaje, termine, majstore i radne naloge uz Varel HVAC. Online booking, servisni podsjetnici i upravljanje servisnim timom na jednom mjestu.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    type: "website",
    locale: "hr_HR",
    siteName: "Varel",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Varel HVAC",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "hr",
    url: URL,
    description: DESCRIPTION,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: hvacPricing.start.monthly,
      highPrice: hvacPricing.business.monthly,
      offerCount: 3,
    },
    provider: { "@type": "Organization", name: "Varel", url: SITE },
  };
}

function breadcrumbJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Varel", item: SITE },
      { "@type": "ListItem", position: 2, name: "Varel HVAC", item: URL },
    ],
  };
}

export default function HvacLandingPage() {
  return (
    <>
      <JsonLd data={softwareJsonLd()} />
      <JsonLd data={faqJsonLd(hvacFaq.map((f) => ({ question: f.q, answer: f.a })))} />
      <JsonLd data={breadcrumbJsonLd()} />

      <HvacNav />

      <main>
        <HvacHero />
        <HvacTargetAudience />
        <HvacProblemSolution />
        <HvacBenefits />
        <HvacWorkflow />
        <HvacRecurringRevenue />
        <HvacBookingComparison />
        <HvacDemoPreview />
        <HvacPricing />
        <HvacWebsiteAddon />

        {/* Section 12 — early access */}
        <section id="rani-pristup" className="scroll-mt-20 border-t border-border bg-background-secondary">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">Rani pristup</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Budite među prvim Varel HVAC korisnicima</h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted">
                Prijavite se za rani pristup, pokažite nam kako danas vodite servisno poslovanje i pomozite oblikovati proizvod prema stvarnim potrebama majstora.
              </p>
            </div>
            <div className="mt-8">
              <HvacEarlyAccessForm />
            </div>
          </div>
        </section>

        <HvacFaq />
        <HvacFinalCta />
      </main>

      <HvacFooter />
    </>
  );
}
