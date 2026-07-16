import type { Metadata } from "next";

/**
 * Superadministration (brief §4): never indexed (metadata + X-Robots-Tag in
 * proxy.ts + robots.txt disallow), never linked from public navigation. The
 * real control is requireElectroSuperadmin in every page and action.
 */
export const metadata: Metadata = {
  title: "Varel Electric — superadministracija",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
};
export const dynamic = "force-dynamic";

export default function ElectroSuperadminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background-secondary">{children}</div>;
}
