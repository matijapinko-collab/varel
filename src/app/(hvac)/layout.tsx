import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/i18n/config";
import { getBranding, getSetting } from "@/lib/settings";
import { GoogleScripts } from "@/components/analytics/google-scripts";
import { CookieConsent } from "@/components/consent/cookie-consent";
import { PublicAdminBar } from "@/components/admin/public-admin-bar";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });

/**
 * Varel HVAC route-group layout. Croatian-only product on unprefixed routes
 * (/hvac, /hvac-demo, /hvac-b2b) — its own <html lang="hr"> shell (there is no
 * root layout; each top-level segment provides one). Reuses the global font,
 * theme, analytics and cookie-consent so it stays part of the Varel ecosystem.
 */
export default async function HvacLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, branding, cookieBannerEnabled] = await Promise.all([
    cookies(),
    getBranding().catch(() => null),
    getSetting<boolean>("cookie_banner_enabled").catch(() => true),
  ]);

  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const defaultTheme = branding?.defaultTheme === "DARK" ? "dark" : "light";
  const theme = themeCookie === "dark" || themeCookie === "light" ? themeCookie : defaultTheme;

  return (
    <html
      lang="hr"
      className={`${inter.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <GoogleScripts />
        <PublicAdminBar />
        {children}
        <CookieConsent locale="hr" enabled={cookieBannerEnabled ?? true} />
      </body>
    </html>
  );
}
