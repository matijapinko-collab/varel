import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { HvacNav } from "@/components/hvac/hvac-nav";
import { HvacFooter } from "@/components/hvac/hvac-footer";
import { HvacEarlyAccessForm } from "@/components/hvac/hvac-early-access-form";
import { HVAC_ROUTES } from "@/lib/hvac/content";
import { isHvacB2bEnabled, getHvacSession } from "@/lib/hvac/b2b-auth";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";

export const metadata: Metadata = {
  title: "Varel HVAC korisnička prijava | Varel HVAC",
  description: "Prijava za Varel HVAC korisnike bit će dostupna nakon pokretanja prve B2B verzije platforme.",
  alternates: { canonical: `${SITE}${HVAC_ROUTES.login}` },
  robots: { index: false, follow: true },
};

export default async function HvacB2bPage() {
  // When the B2B app is live, this route is the entry: route to app or login.
  if (isHvacB2bEnabled()) {
    const session = await getHvacSession();
    redirect(session ? `${HVAC_ROUTES.login}/nadzorna-ploca` : `${HVAC_ROUTES.login}/prijava`);
  }
  // Otherwise keep the polished "coming soon" page (gated launch).
  return (
    <>
      <HvacNav />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/5 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300">
              <Lock size={12} /> Uskoro dostupno
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Varel HVAC korisnička prijava</h1>
            <p className="mt-4 text-lg text-muted">
              Prijava za Varel HVAC korisnike bit će dostupna nakon pokretanja prve B2B verzije platforme.
            </p>

            {/* Inactive login preview (non-functional) */}
            <div aria-hidden className="mt-8 rounded-2xl border border-border bg-card p-6 opacity-60">
              <div className="text-sm font-semibold">Prijava</div>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 text-xs text-muted">Poslovni e-mail</div>
                  <div className="h-10 rounded-lg border border-border bg-background-secondary" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted">Lozinka</div>
                  <div className="h-10 rounded-lg border border-border bg-background-secondary" />
                </div>
                <button type="button" disabled className="w-full cursor-not-allowed rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 py-2.5 text-sm font-semibold text-white opacity-70">
                  Prijava (uskoro)
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={HVAC_ROUTES.landing} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:border-sky-500/50">
                <ArrowLeft size={16} /> Natrag na Varel HVAC
              </Link>
              <Link href={HVAC_ROUTES.demo} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:border-sky-500/50">
                Pogledajte demo
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background-secondary p-6 sm:p-8">
            <h2 className="text-xl font-bold">Prijavite se za rani pristup</h2>
            <p className="mt-2 text-sm text-muted">Obavijestit ćemo vas čim B2B prijava postane dostupna.</p>
            <div className="mt-6"><HvacEarlyAccessForm sourcePage="/hvac-b2b" /></div>
          </div>
        </div>
      </main>
      <HvacFooter />
    </>
  );
}
