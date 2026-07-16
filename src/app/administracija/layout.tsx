import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "Varel Admin", template: "%s | Varel Admin" },
  // Layered with the X-Robots-Tag header (proxy.ts), robots.txt and sitemap
  // exclusion. Authorization remains the actual access control.
  robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true, nocache: true },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen bg-background-secondary text-foreground">
        {children}
      </body>
    </html>
  );
}
