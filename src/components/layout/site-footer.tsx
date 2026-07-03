import Link from "next/link";
import { getMenu } from "@/lib/content";
import { getBranding } from "@/lib/settings";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { NewsletterForm } from "@/components/blocks/newsletter-form";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const [menu, branding] = await Promise.all([
    getMenu(locale, "FOOTER").catch(() => null),
    getBranding().catch(() => null),
  ]);
  const t = getDictionary(locale);
  const siteName = branding?.siteName ?? "Varel";

  const items =
    menu?.items?.map((i) => ({ label: i.label, url: i.url })) ?? [
      { label: "About", url: `/${locale}/about` },
      { label: "Contact", url: `/${locale}/contact` },
      { label: "Advertise", url: `/${locale}/advertise` },
      { label: "Submit Tool", url: `/${locale}/submit-tool` },
      { label: "Affiliate Disclosure", url: `/${locale}/affiliate-disclosure` },
      { label: "Privacy Policy", url: `/${locale}/privacy-policy` },
      { label: "Terms", url: `/${locale}/terms` },
      { label: "Cookie Policy", url: `/${locale}/cookie-policy` },
    ];

  return (
    <footer className="mt-auto border-t border-border bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="text-lg font-bold tracking-tight">
              <span className="text-primary">V</span>
              {siteName.slice(1) || "arel"}
            </div>
            <p className="mt-2 max-w-xs text-sm text-muted">
              {branding?.tagline ?? t.hero_subtitle}
            </p>
          </div>
          <nav
            className="grid grid-cols-2 content-start gap-x-6 gap-y-2"
            aria-label="Footer"
          >
            {items.map((item) => (
              <Link
                key={item.url + item.label}
                href={item.url}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div>
            <div className="text-sm font-semibold">{t.newsletter_title}</div>
            <p className="mt-1 text-sm text-muted">{t.newsletter_subtitle}</p>
            <div className="mt-3">
              <NewsletterForm locale={locale} compact />
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border pt-6 text-xs text-muted sm:flex-row">
          <span>
            © {new Date().getFullYear()} {siteName}. {t.footer_rights}
          </span>
          <span>{t.affiliate_disclosure_short}</span>
        </div>
      </div>
    </footer>
  );
}
