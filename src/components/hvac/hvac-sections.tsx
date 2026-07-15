import {
  Users, AirVent, CalendarDays, ClipboardList, Globe, BellRing, ReceiptText, BarChart3,
  Check, X, ArrowRight, Wrench, Store, Building2, Users2,
} from "lucide-react";
import {
  hvacAudience, hvacBefore, hvacAfter, hvacBenefits, hvacWorkflow, hvacBooking,
  hvacWebsiteFeatures, hvacWebsitePricing, HVAC_ROUTES,
} from "@/lib/hvac/content";
import { formatEur } from "@/lib/hvac/format";
import { TrackedLink } from "./tracked-link";

const BENEFIT_ICON: Record<string, typeof Users> = {
  users: Users, airvent: AirVent, calendar: CalendarDays, clipboard: ClipboardList,
  globe: Globe, bell: BellRing, receipt: ReceiptText, chart: BarChart3,
};
const AUDIENCE_ICON = [Wrench, Users2, Store, Building2];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">{children}</p>;
}

/* ---------------- Section 2: target audience ---------------- */
export function HvacTargetAudience() {
  return (
    <section className="border-y border-border bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Eyebrow>Napravljeno za stvarni rad na terenu</Eyebrow>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hvacAudience.map((a, i) => {
            const Icon = AUDIENCE_ICON[i] ?? Wrench;
            return (
              <div key={a.title} className="rounded-card border border-border bg-card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300"><Icon size={20} /></span>
                <h3 className="mt-3 font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-muted">{a.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section 3: problem / solution ---------------- */
export function HvacProblemSolution() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
        Posao vam ne bi trebao biti razbacan između poziva, poruka i papira.
      </h2>
      <p className="mt-4 max-w-2xl text-muted">
        Mnoge servisne tvrtke danas vode posao kroz WhatsApp poruke, osobne kalendare, bilježnice, Excel tablice, fotografije na privatnim mobitelima, ručno izrađene ponude i nepovezane podatke o klijentima.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 font-semibold text-muted">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500/10 text-red-500"><X size={14} /></span>
            Bez Varel HVAC-a
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {hvacBefore.map((b) => (
              <li key={b} className="flex items-start gap-2 text-muted">
                <X size={16} className="mt-0.5 shrink-0 text-red-400" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-card border border-sky-500/30 bg-gradient-to-br from-sky-500/[0.07] to-cyan-400/[0.05] p-6">
          <h3 className="flex items-center gap-2 font-semibold text-sky-600 dark:text-sky-300">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-500/15 text-sky-500"><Check size={14} /></span>
            Uz Varel HVAC
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {hvacAfter.map((a) => (
              <li key={a} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-sky-500" /> {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-lg font-medium">
        Varel HVAC povezuje sve dijelove servisnog poslovanja u jedan jednostavan sustav.
      </p>
    </section>
  );
}

/* ---------------- Section 4: benefits ---------------- */
export function HvacBenefits() {
  return (
    <section id="funkcionalnosti" className="scroll-mt-20 border-t border-border bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Eyebrow>Funkcionalnosti</Eyebrow>
        <h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Sve što servisna tvrtka treba za organiziraniji posao
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hvacBenefits.map((b) => {
            const Icon = BENEFIT_ICON[b.icon] ?? Wrench;
            return (
              <div key={b.title} className="group rounded-card border border-border bg-card p-5 transition-colors hover:border-sky-500/40">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-400/10 text-sky-600 dark:text-sky-300"><Icon size={22} /></span>
                <h3 className="mt-4 font-semibold">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{b.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section 5: workflow ---------------- */
export function HvacWorkflow() {
  return (
    <section id="kako-funkcionira" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Eyebrow>Kako funkcionira</Eyebrow>
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Od prvog upita do sljedećeg servisa</h2>

        <ol className="mt-10 grid gap-6 lg:grid-cols-5">
          {hvacWorkflow.map((s, i) => (
            <li key={s.title} className="relative">
              <div className="flex items-center gap-3 lg:block">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 font-bold text-white">{i + 1}</span>
                {i < hvacWorkflow.length - 1 && (
                  <span aria-hidden className="hidden h-px flex-1 bg-gradient-to-r from-sky-500/40 to-transparent lg:absolute lg:left-12 lg:top-5 lg:block lg:w-full" />
                )}
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Section 6: recurring revenue ---------------- */
export function HvacRecurringRevenue() {
  return (
    <section className="border-y border-border bg-gradient-to-br from-sky-950 to-slate-900 text-white dark:from-sky-950 dark:to-slate-950">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Ponovljeni servisi</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Vaša postojeća baza klijenata već skriva buduće poslove.
          </h2>
          <p className="mt-4 text-white/70">
            Varel HVAC prati kada je svaki uređaj montiran ili posljednji put servisiran. Kada se približi vrijeme novog servisa, sustav vas upozorava i pomaže klijentu ponovno rezervirati termin.
          </p>
          <p className="mt-5 inline-block rounded-lg bg-white/10 px-4 py-2 font-semibold text-cyan-200">
            Ne čekajte da se klijent sam sjeti servisa.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="space-y-4">
            {[
              { n: "500", l: "aktivnih klijenata" },
              { n: "30%", l: "rezervira novi godišnji servis" },
              { n: "150", l: "dodatnih servisnih termina" },
            ].map((r, i) => (
              <div key={r.l} className="flex items-center gap-4">
                <span className="w-16 shrink-0 text-3xl font-bold text-cyan-300">{r.n}</span>
                <span className="text-white/80">{r.l}</span>
                {i < 2 && <ArrowRight aria-hidden className="ml-auto text-white/30" size={18} />}
              </div>
            ))}
          </div>
          <p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/50">
            Ilustrativni primjer, a ne garantirani poslovni rezultat.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section 7: booking comparison ---------------- */
export function HvacBookingComparison() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <Eyebrow>Online booking</Eyebrow>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        Online booking prilagođen veličini vašeg poslovanja
      </h2>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {hvacBooking.map((b) => (
          <div key={b.plan} className="flex flex-col rounded-card border border-border bg-card p-6">
            <div className="text-sm font-bold text-sky-600 dark:text-sky-300">{b.plan}</div>
            <h3 className="mt-1 font-semibold">{b.heading}</h3>
            <ul className="mt-4 flex-1 space-y-2 text-sm">
              {b.points.map((p) => (
                <li key={p} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-sky-500" /> {p}</li>
              ))}
            </ul>
            {b.note && (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">{b.note}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Section 11: website add-on ---------------- */
export function HvacWebsiteAddon() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <Eyebrow>Dodatak za Business</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Trebate i profesionalnu web-stranicu?</h2>
            <p className="mt-3 text-muted">
              Business korisnici mogu naručiti Next.js poslovnu web-stranicu izravno povezanu s Varel HVAC-om.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-card border border-border p-4">
                <div className="text-xs text-muted">Jednokratno</div>
                <div className="mt-1 text-2xl font-bold">{formatEur(hvacWebsitePricing.oneTime)}</div>
              </div>
              <div className="rounded-card border border-sky-500/40 bg-sky-500/5 p-4">
                <div className="text-xs text-muted">Na rate</div>
                <div className="mt-1 text-2xl font-bold">{hvacWebsitePricing.installments} × {formatEur(hvacWebsitePricing.monthlyInstallment)}</div>
                <div className="mt-1 text-xs text-muted">Ukupno {formatEur(hvacWebsitePricing.installmentTotal)}</div>
              </div>
            </div>

            <p className="mt-4 text-sm font-medium">
              Kod plaćanja na rate ukupna cijena web-stranice iznosi {formatEur(hvacWebsitePricing.installmentTotal)}.
            </p>
            <div className="mt-4 space-y-2 text-xs text-muted">
              <p>Točan opseg i sadržaj web-stranice definiraju se prije početka izrade. Dodatne funkcionalnosti naplaćuju se zasebno.</p>
              <p>Obročna otplata web-stranice predstavlja zasebnu obvezu od Varel HVAC pretplate.</p>
            </div>
            <TrackedLink
              href="#rani-pristup"
              event="hvac_website_addon_interest_click"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-sky-500/50 px-5 py-2.5 text-sm font-semibold text-sky-600 hover:bg-sky-500/5 dark:text-sky-300"
            >
              Zatražite web-stranicu <ArrowRight size={15} />
            </TrackedLink>
          </div>

          <div className="rounded-card border border-border bg-background-secondary p-5">
            <div className="text-sm font-semibold">Uključeno u web-stranicu</div>
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {hvacWebsiteFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-sky-500" /> {f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Section 14: final CTA ---------------- */
export function HvacFinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-border">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-sky-500/10 to-cyan-400/5" />
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Manje administracije. Više vremena za posao.</h2>
        <p className="mt-4 text-muted">
          Povežite klijente, uređaje, termine i majstore u jedan sustav napravljen za HVAC servisno poslovanje.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <TrackedLink href={HVAC_ROUTES.demo} event="hvac_final_cta_demo_click" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-sky-500/20 hover:opacity-90">
            Isprobajte demo
          </TrackedLink>
          <TrackedLink href="#rani-pristup" event="hvac_final_cta_signup_click" className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-6 py-3 font-semibold hover:border-sky-500/50">
            Prijavite se za rani pristup
          </TrackedLink>
        </div>
        <p className="mt-5 text-sm text-muted">
          Već imate račun?{" "}
          <TrackedLink href={HVAC_ROUTES.login} event="hvac_login_link_click" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">
            Prijavite se.
          </TrackedLink>
        </p>
      </div>
    </section>
  );
}
