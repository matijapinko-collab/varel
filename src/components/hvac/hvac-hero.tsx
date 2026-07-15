import { HVAC_ROUTES } from "@/lib/hvac/content";
import { DashboardMockup } from "./dashboard-mockup";
import { TrackedLink } from "./tracked-link";

export function HvacHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle airflow / temperature gradient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-sky-500/[0.07] via-transparent to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -top-32 right-0 -z-10 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/5 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Poslovni softver za servis klima-uređaja
          </span>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Vodite cijeli servis klima-uređaja na <span className="bg-gradient-to-r from-sky-500 to-cyan-500 bg-clip-text text-transparent">jednom mjestu</span>.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-muted">
            Organizirajte klijente, klima-uređaje, termine, radne naloge i majstore. Automatizirajte servisne podsjetnike i pretvorite postojeće klijente u nove poslove.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <TrackedLink
              href={HVAC_ROUTES.demo}
              event="hvac_hero_demo_click"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition-opacity hover:opacity-90"
            >
              Isprobajte besplatni demo
            </TrackedLink>
            <TrackedLink
              href="#paketi"
              event="hvac_hero_pricing_click"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-base font-semibold hover:border-sky-500/50"
            >
              Pogledajte pakete
            </TrackedLink>
          </div>

          <p className="mt-4 text-sm text-muted">Bez instalacije. Prilagođeno mobitelu, tabletu i računalu.</p>
        </div>

        <div className="relative">
          <DashboardMockup />
          <p className="mt-9 text-center text-xs text-muted sm:mt-8">Prikaz planiranog Varel HVAC sučelja</p>
        </div>
      </div>
    </section>
  );
}
