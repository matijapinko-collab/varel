import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/i18n/config";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });

/**
 * Bisneys CRM route-group layout — an isolated internal tool served under
 * /bisneyscrm with its own <html lang="hr"> shell (Varel has no root layout;
 * each top-level segment provides one). Croatian-only UI. Completely excluded
 * from indexing at the metadata layer (brief §12); proxy.ts adds the
 * X-Robots-Tag header and robots.ts adds the disallow rule.
 */
export const metadata: Metadata = {
  title: "Bisneys CRM",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default async function BisneysLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "";

  return (
    <html lang="hr" className={`${inter.variable} h-full antialiased ${theme}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
