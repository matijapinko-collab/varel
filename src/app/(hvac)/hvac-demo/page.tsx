import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Crown, Settings, Wrench } from "lucide-react";
import { HvacNav } from "@/components/hvac/hvac-nav";
import { HvacFooter } from "@/components/hvac/hvac-footer";
import { HvacEarlyAccessForm } from "@/components/hvac/hvac-early-access-form";
import { hvacDemoRoles, HVAC_ROUTES } from "@/lib/hvac/content";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://varel.io";

export const metadata: Metadata = {
  title: "Varel HVAC demo — u pripremi | Varel HVAC",
  description: "Interaktivno demo okruženje za upravljanje klijentima, klima-uređajima, terminima, majstorima i radnim nalozima. Uskoro dostupno.",
  alternates: { canonical: `${SITE}${HVAC_ROUTES.demo}` },
  robots: { index: false, follow: true },
};

const ROLE_ICON = [Crown, Settings, Wrench];

export default function HvacDemoPage() {
  return (
    <>
      <HvacNav />
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/5 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" /> Demo u pripremi
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Varel HVAC demo je u pripremi</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          Pripremamo interaktivno sandbox okruženje u kojem ćete moći isprobati upravljanje klijentima, uređajima, terminima, majstorima i radnim nalozima.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {hvacDemoRoles.map((r, i) => {
            const Icon = ROLE_ICON[i] ?? Wrench;
            return (
              <div key={r.role} className="rounded-card border border-border bg-card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-sky-500/15 to-cyan-400/10 text-sky-600 dark:text-sky-300"><Icon size={20} /></span>
                <div className="mt-3 text-sm font-bold text-sky-600 dark:text-sky-300">{r.role}</div>
                <h2 className="mt-0.5 font-semibold">{r.title}</h2>
                <p className="mt-1 text-sm text-muted">{r.text}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-background-secondary p-6 sm:p-8">
          <h2 className="text-xl font-bold">Javit ćemo vam kada demo bude spreman</h2>
          <p className="mt-2 text-muted">Prijavite se i obavijestit ćemo vas čim interaktivni demo postane dostupan.</p>
          <div className="mt-6"><HvacEarlyAccessForm sourcePage="/hvac-demo" /></div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={HVAC_ROUTES.landing} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:border-sky-500/50">
            <ArrowLeft size={16} /> Natrag na Varel HVAC
          </Link>
        </div>
      </main>
      <HvacFooter />
    </>
  );
}
