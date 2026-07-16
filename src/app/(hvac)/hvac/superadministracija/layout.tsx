import type { Metadata } from "next";

/**
 * Superadministration subtree. Indexing is blocked in depth:
 *  1. authorization (no content is rendered to unauthorized users at all)
 *  2. this HTML metadata
 *  3. the X-Robots-Tag response header (proxy.ts)
 *  4. robots.txt disallow
 *  5. sitemap exclusion
 * A hidden URL is never treated as access control.
 */
export const metadata: Metadata = {
  title: "Varel HVAC — superadministracija",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true, nocache: true },
};

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background-secondary">{children}</div>;
}
