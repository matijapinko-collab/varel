import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  SUPPORTED_LOCALES,
  THEME_COOKIE,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import { getBranding } from "@/lib/settings";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { TrackView } from "@/components/analytics/track-view";
import { GoogleScripts } from "@/components/analytics/google-scripts";
import { CookieConsent } from "@/components/consent/cookie-consent";
import { getSetting } from "@/lib/settings";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata(
  props: LayoutProps<"/[locale]">
): Promise<Metadata> {
  const branding = await getBranding().catch(() => null);
  const siteName = branding?.siteName ?? "Varel";
  return {
    title: {
      default: `${siteName} — ${branding?.tagline ?? "Find the right tools for modern work"}`,
      template: `%s | ${siteName}`,
    },
    description:
      branding?.tagline ??
      "Discover, compare and understand the best AI, software and productivity tools in one place.",
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
    ),
    icons: branding?.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

export default async function LocaleLayout(props: LayoutProps<"/[locale]">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();

  const [cookieStore, branding, cookieBannerEnabled] = await Promise.all([
    cookies(),
    getBranding().catch(() => null),
    getSetting<boolean>("cookie_banner_enabled").catch(() => true),
  ]);

  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const defaultTheme = branding?.defaultTheme === "DARK" ? "dark" : "light";
  const theme =
    themeCookie === "dark" || themeCookie === "light" ? themeCookie : defaultTheme;

  const brandVars: Record<string, string> = {};
  if (branding?.primaryColor) brandVars["--primary"] = branding.primaryColor;
  if (branding?.accentColor) brandVars["--accent"] = branding.accentColor;
  if (branding?.borderRadius) brandVars["--radius"] = branding.borderRadius;

  return (
    <html
      lang={locale}
      className={`${inter.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
      style={brandVars as React.CSSProperties}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <GoogleScripts />
        <TrackView type="PAGE_VIEW" locale={locale} />
        <SiteHeader locale={locale as Locale} />
        <main className="flex-1">{props.children}</main>
        <SiteFooter locale={locale as Locale} />
        <CookieConsent locale={locale} enabled={cookieBannerEnabled ?? true} />
      </body>
    </html>
  );
}
