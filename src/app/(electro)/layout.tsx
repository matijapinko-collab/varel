import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/i18n/config";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });

/**
 * Varel Electric route-group layout — served under /electro with its own
 * <html lang="hr"> shell (Varel has no root layout; each top-level segment
 * provides one). Croatian-only UI, excluded from locale routing in proxy.ts.
 * NOTE: no global noindex here — the public marketing pages (/electro,
 * /electro/cijene, …) are indexable; only /electro/app and
 * /electro/superadministracija are noindexed (their own layouts + proxy).
 */
export default async function ElectroLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "";

  return (
    <html lang="hr" className={`${inter.variable} h-full antialiased ${theme}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
