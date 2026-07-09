import type { Lang } from "./data";

/**
 * Premade email templates for the LLM Visibility Scanner flow (EN + HR).
 * Plain-text with {{variable}} interpolation — no AI-generated content.
 */

export type OfferVars = {
  name: string;
  websiteUrl: string;
  packageSummary: string;
  totalPrice: number;
  manualPaymentInstructions: string;
};

export type ReportVars = {
  name: string;
  privateReportUrl: string;
  publicShareUrl: string;
  implementationOfferUrl: string;
};

export type AdminVars = {
  domain: string;
  name: string;
  email: string;
  company: string;
  websiteUrl: string;
  language: string;
  socialAddon: boolean;
  competitorAddon: boolean;
  totalPrice: number;
  freeScore: number;
  adminUrl: string;
};

const yn = (b: boolean) => (b ? "yes" : "no");

export function adminNotificationEmail(v: AdminVars): { subject: string; text: string } {
  return {
    subject: `New Varel LLM Report Request: ${v.domain}`,
    text: `New detailed LLM Visibility Report request received.

Client: ${v.name || "—"}
Email: ${v.email}
Company: ${v.company || "—"}
Website: ${v.websiteUrl}
Language: ${v.language}
Base report: 20 €
Social/Profile add-on: ${yn(v.socialAddon)}
Competitor add-on: ${yn(v.competitorAddon)}
Estimated total: ${v.totalPrice} €

Free scan score: ${v.freeScore}/100

Open admin request:
${v.adminUrl}`,
  };
}

export function offerEmail(lang: Lang, v: OfferVars): { subject: string; text: string } {
  if (lang === "hr") {
    return {
      subject: "Ponuda za Varel LLM Visibility izvještaj",
      text: `Pozdrav ${v.name || ""},

pregledali smo tvoj zahtjev za LLM Visibility izvještaj za:

${v.websiteUrl}

Izvještaj uključuje crawlability web stranice, AI crawler policy, jasnoću sadržaja, strukturu entiteta, answer-readiness, schema markup, vizualnu konzistentnost i prioritetne preporuke za popravke.

Odabrani paket:
${v.packageSummary}

Ukupna cijena:
${v.totalPrice} €

Način plaćanja:
${v.manualPaymentInstructions}

Nakon potvrde plaćanja pripremamo izvještaj i šaljemo privatni link. Izvještaj će biti dostupan i kao PDF export.

Važno: ovaj izvještaj ne garantira vidljivost ili citiranje u AI/search sustavima. Analizira spremnost web stranice na temelju javno dostupnih podataka.

Varel`,
    };
  }
  return {
    subject: "Your Varel LLM Visibility Report offer",
    text: `Hi ${v.name || ""},

we reviewed your request for an LLM Visibility Report for:

${v.websiteUrl}

The report includes website crawlability, AI crawler policy, content clarity, entity structure, answer-readiness, schema, visual consistency and prioritized fixes.

Selected package:
${v.packageSummary}

Total price:
${v.totalPrice} €

Payment method:
${v.manualPaymentInstructions}

After payment confirmation, we will prepare your report and send you a private report link. The report will also be available as a PDF export.

Important: this report does not guarantee visibility or citations in AI/search systems. It analyzes your website's readiness based on publicly available data.

Best,
Varel`,
  };
}

export function reportReadyEmail(lang: Lang, v: ReportVars): { subject: string; text: string } {
  if (lang === "hr") {
    return {
      subject: "Tvoj Varel LLM Visibility izvještaj je spreman",
      text: `Pozdrav ${v.name || ""},

tvoj Varel LLM Visibility izvještaj je spreman.

Privatni link:
${v.privateReportUrl}

Javni score link:
${v.publicShareUrl}

PDF možeš preuzeti na privatnoj stranici izvještaja.

Ako želiš pomoć oko implementacije preporučenih popravaka, možeš zatražiti ponudu ovdje:
${v.implementationOfferUrl}

Varel`,
    };
  }
  return {
    subject: "Your Varel LLM Visibility Report is ready",
    text: `Hi ${v.name || ""},

your Varel LLM Visibility Report is ready.

Private report link:
${v.privateReportUrl}

Public score link:
${v.publicShareUrl}

You can also download the PDF from the private report page.

If you want help implementing the recommended fixes, you can request an implementation offer here:
${v.implementationOfferUrl}

Best,
Varel`,
  };
}

/** Builds a human package summary line from the add-on flags. */
export function packageSummary(lang: Lang, social: boolean, competitor: boolean): string {
  const base = lang === "hr" ? "Detaljni LLM Visibility izvještaj (20 €)" : "Detailed LLM Visibility Report (20 €)";
  const addons: string[] = [];
  if (social) addons.push(lang === "hr" ? "Analiza društvenih/poslovnih profila (+10 €)" : "Social & Business Profile Analysis (+10 €)");
  if (competitor) addons.push(lang === "hr" ? "Usporedba s konkurentom (+10 €)" : "Competitor Comparison (+10 €)");
  return [base, ...addons].join("\n");
}
