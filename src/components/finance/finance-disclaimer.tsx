/**
 * Reusable finance disclaimer blocks (brief §14). Shown on every finance page.
 * Variants: general, affiliate, trading, stock. EN/HR; other locales use EN.
 */

const TEXTS = {
  general: {
    en: "The content on this page is for informational and educational purposes only and does not constitute financial, investment, tax, or legal advice. Investing involves risk, including the possible loss of capital. Always do your own research and consider speaking with a qualified financial adviser before making investment decisions.",
    hr: "Sadržaj na ovoj stranici služi isključivo u informativne i edukativne svrhe i ne predstavlja financijski, investicijski, porezni ni pravni savjet. Ulaganje uključuje rizik, uključujući mogući gubitak kapitala. Uvijek napravite vlastito istraživanje i razmislite o razgovoru s kvalificiranim financijskim savjetnikom prije donošenja investicijskih odluka.",
  },
  affiliate: {
    en: "Some links on this page may be affiliate links. This means we may earn a commission if you click a link and sign up or make a purchase, at no additional cost to you. This does not influence our editorial analysis, ratings, or conclusions.",
    hr: "Neke poveznice na ovoj stranici mogu biti affiliate poveznice. To znači da možemo zaraditi proviziju ako kliknete i registrirate se ili kupite, bez dodatnog troška za vas. To ne utječe na našu uredničku analizu, ocjene ni zaključke.",
  },
  trading: {
    en: "Trading involves significant risk and may not be suitable for all users. Leveraged products can result in losses greater than the initial investment. Make sure you understand the risks before using trading platforms or financial products.",
    hr: "Trgovanje uključuje značajan rizik i možda nije prikladno za sve korisnike. Proizvodi s polugom mogu rezultirati gubicima većima od početnog ulaganja. Uvjerite se da razumijete rizike prije korištenja trading platformi ili financijskih proizvoda.",
  },
  stock: {
    en: "This stock analysis is an editorial opinion based on available information at the time of writing. It is not a personal recommendation to buy, sell, or hold any security.",
    hr: "Ova analiza dionice urednički je stav temeljen na dostupnim informacijama u trenutku pisanja. Nije osobna preporuka za kupnju, prodaju ili držanje bilo kojeg vrijednosnog papira.",
  },
} as const;

export type FinanceDisclaimerVariant = keyof typeof TEXTS;

export function FinanceDisclaimer({
  variant = "general",
  locale,
  className = "",
}: {
  variant?: FinanceDisclaimerVariant;
  locale: string;
  className?: string;
}) {
  const text = TEXTS[variant][locale === "hr" ? "hr" : "en"];
  const emphasized = variant === "general" || variant === "trading";
  return (
    <p
      role="note"
      className={`rounded-card border px-4 py-3 text-xs leading-relaxed ${
        emphasized
          ? "border-orange-500/30 bg-orange-500/5 text-muted"
          : "border-border bg-background-secondary text-muted"
      } ${className}`}
    >
      {text}
    </p>
  );
}
