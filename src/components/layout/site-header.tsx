import Link from "next/link";
import Image from "next/image";
import { getMenu, getEnabledLanguages } from "@/lib/content";
import { getBranding } from "@/lib/settings";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [menu, languages, branding] = await Promise.all([
    getMenu(locale, "HEADER").catch(() => null),
    getEnabledLanguages().catch(() => []),
    getBranding().catch(() => null),
  ]);
  const t = getDictionary(locale);

  // Fallback navigation until menus are seeded/edited in admin.
  const items =
    menu?.items?.map((i) => ({ label: i.label, url: i.url })) ?? [
      { label: t.nav_discover, url: `/${locale}/tools` },
      { label: t.nav_compare, url: `/${locale}/compare` },
      { label: t.nav_guides, url: `/${locale}/guides` },
      { label: t.nav_editorial, url: `/${locale}/editorial` },
      { label: t.nav_news, url: `/${locale}/news` },
      { label: t.nav_prompts, url: `/${locale}/prompts` },
      { label: t.nav_deals, url: `/${locale}/deals` },
    ];

  const logoUrl = branding?.lightLogoUrl;
  const darkLogoUrl = branding?.darkLogoUrl ?? logoUrl;
  const siteName = branding?.siteName ?? "Varel";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2" aria-label={siteName}>
          {logoUrl ? (
            <>
              <Image
                src={logoUrl}
                alt={siteName}
                width={120}
                height={32}
                className="h-8 w-auto dark:hidden"
                priority
              />
              <Image
                src={darkLogoUrl ?? logoUrl}
                alt={siteName}
                width={120}
                height={32}
                className="hidden h-8 w-auto dark:block"
                priority
              />
            </>
          ) : (
            <span className="text-xl font-bold tracking-tight">
              <span className="text-primary">V</span>
              {siteName.slice(1) || "arel"}
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {items.map((item) => (
            <Link
              key={item.url + item.label}
              href={item.url}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher
            current={locale}
            languages={
              languages.length
                ? languages.map((l) => ({ code: l.code, nativeName: l.nativeName }))
                : [{ code: locale, nativeName: locale.toUpperCase() }]
            }
          />
          {(branding?.enableThemeToggle ?? true) && <ThemeToggle />}
          <MobileNav items={items} />
        </div>
      </div>
    </header>
  );
}
