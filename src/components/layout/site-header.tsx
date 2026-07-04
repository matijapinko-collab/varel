import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { getMenu, getEnabledLanguages } from "@/lib/content";
import { getBranding } from "@/lib/settings";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { ThemeToggle } from "./theme-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { StickyHeader } from "./sticky-header";

type NavItem = { label: string; url: string; children: { label: string; url: string }[] };

export async function SiteHeader({ locale }: { locale: Locale }) {
  const [menu, languages, branding] = await Promise.all([
    getMenu(locale, "HEADER").catch(() => null),
    getEnabledLanguages().catch(() => []),
    getBranding().catch(() => null),
  ]);
  const t = getDictionary(locale);

  // Fallback navigation until menus are seeded/edited in admin.
  const items: NavItem[] =
    menu?.items?.map((i) => ({
      label: i.label,
      url: i.url,
      children: i.childItems?.map((c) => ({ label: c.label, url: c.url })) ?? [],
    })) ?? [
      { label: "Home", url: `/${locale}`, children: [] },
      { label: "AI Tools", url: `/${locale}/tools?category=ai-tools`, children: [] },
      {
        label: "Gadget Reviews",
        url: `/${locale}/tools?category=gadget-reviews`,
        children: [
          { label: "All Gadget Reviews", url: `/${locale}/tools?category=gadget-reviews` },
          { label: "Smart Home", url: `/${locale}/tools?category=smart-home` },
          { label: "Kitchen Appliances", url: `/${locale}/tools?category=kitchen-appliances` },
          { label: "Coffee Machines", url: `/${locale}/tools?category=coffee-machines` },
          { label: "Robot Vacuums", url: `/${locale}/tools?category=robot-vacuums` },
          { label: "Air Purifiers", url: `/${locale}/tools?category=air-purifiers` },
          { label: "Air Conditioners", url: `/${locale}/tools?category=air-conditioners` },
          { label: "TVs", url: `/${locale}/tools?category=tvs` },
          { label: "Audio", url: `/${locale}/tools?category=audio` },
          { label: "Phones & Tablets", url: `/${locale}/tools?category=phones-tablets` },
          { label: "Computers & Accessories", url: `/${locale}/tools?category=computers-accessories` },
          { label: "Home Appliances", url: `/${locale}/tools?category=home-appliances` },
        ],
      },
      { label: "Best Deals", url: `/${locale}/best-deals`, children: [] },
      { label: t.nav_guides, url: `/${locale}/guides`, children: [] },
      { label: t.nav_compare, url: `/${locale}/compare`, children: [] },
      { label: "Blog", url: `/${locale}/editorial`, children: [] },
      { label: "About Us", url: `/${locale}/about`, children: [] },
    ];

  const logoUrl = branding?.lightLogoUrl;
  const darkLogoUrl = branding?.darkLogoUrl ?? logoUrl;
  const siteName = branding?.siteName ?? "Varel";

  return (
    <StickyHeader>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 transition-transform duration-200 will-change-transform hover:scale-[1.03] active:scale-[0.98]"
          aria-label={siteName}
        >
          {logoUrl ? (
            <>
              <Image
                src={logoUrl}
                alt={siteName}
                width={176}
                height={48}
                className="h-8 w-auto sm:h-10 dark:hidden"
                priority
              />
              <Image
                src={darkLogoUrl ?? logoUrl}
                alt={siteName}
                width={176}
                height={48}
                className="hidden h-8 w-auto sm:h-10 dark:block"
                priority
              />
            </>
          ) : (
            <span className="text-[26px] font-extrabold tracking-[-0.03em] sm:text-[30px]">
              <span className="text-primary">V</span>
              {siteName.slice(1) || "arel"}
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {items.map((item) =>
            item.children.length > 0 ? (
              <div key={item.url + item.label} className="group relative">
                <Link
                  href={item.url}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-primary group-focus-within:text-primary"
                >
                  {item.label}
                  <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
                </Link>
                <div className="invisible absolute left-0 top-full z-50 min-w-56 translate-y-1 rounded-card border border-border bg-card p-1.5 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  {item.children.map((child) => (
                    <Link
                      key={child.url + child.label}
                      href={child.url}
                      className="block rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-soft hover:text-primary"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={item.url + item.label}
                href={item.url}
                className="group relative rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-primary"
              >
                {item.label}
                <span className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform duration-200 ease-out group-hover:scale-x-100" />
              </Link>
            )
          )}
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
    </StickyHeader>
  );
}
