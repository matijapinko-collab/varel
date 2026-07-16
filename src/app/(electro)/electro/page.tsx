import type { Metadata } from "next";
import Link from "next/link";
import { Zap, FolderKanban, FileCheck2, Camera, Package, BarChart3 } from "lucide-react";
import { ELECTRO_BASE } from "@/lib/electro/constants";

export const metadata: Metadata = {
  title: "Varel Electric — operativni sustav za elektroinstalacijske tvrtke",
  description:
    "Projekti, gradilišta, dokumentacija s odobrenjima, fotografije radova, skladišta i potrošnja materijala — sve na jednom mjestu, za tvrtke koje rade za investitore i glavne izvođače.",
};

const FEATURES = [
  { icon: FolderKanban, title: "Projekti i faze", text: "Gradilišta, zone, katovi i prostorije s fazama radova, zadacima i jasnim statusima — u svakom trenutku znate što se događa na svakom projektu." },
  { icon: FileCheck2, title: "Dokumentacija s odobrenjima", text: "Verzioniranje nacrta, obavezno odobrenje inženjera i uvijek jasna važeća verzija za izvođenje. Skeniranje papirnate dokumentacije u PDF." },
  { icon: Camera, title: "Fotografije radova", text: "Fotografiranje izravno iz aplikacije, povezano s projektom, prostorijom i zadatkom — dokazni materijal i izvještaji bez traženja po galerijama." },
  { icon: Package, title: "Skladišta i materijal", text: "Više skladišta, evidencija potrošnje s potvrdom voditelja, transferi, minimalne zalihe i uvoz iz ERP-a." },
  { icon: BarChart3, title: "Troškovi i napredak", text: "Planirano naspram stvarnog: potrošnja, budžet i napredak po projektu i fazi, s PDF izvještajima za investitore." },
  { icon: Zap, title: "Za tim na terenu", text: "Mobilno sučelje za elektroinstalatere i voditelje: zadaci, dnevnik gradilišta, prijava problema i potrošnje u par dodira." },
];

export default function ElectroLanding() {
  return (
    <main>
      <header className="border-b border-black/5 dark:border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 font-black tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Zap size={16} /></span>
            Varel <span className="text-emerald-600 dark:text-emerald-400">Electric</span>
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={`${ELECTRO_BASE}/funkcionalnosti`} className="hidden text-muted hover:text-foreground sm:inline">Funkcionalnosti</Link>
            <Link href={`${ELECTRO_BASE}/cijene`} className="hidden text-muted hover:text-foreground sm:inline">Cijene</Link>
            <Link href={`${ELECTRO_BASE}/kontakt`} className="hidden text-muted hover:text-foreground sm:inline">Kontakt</Link>
            <Link href={`${ELECTRO_BASE}/prijava`} className="rounded-lg border border-black/10 px-3 py-1.5 font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">Prijava</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
          Centralni operativni sustav za <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">elektroinstalacijske tvrtke</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
          Za tvrtke koje izvode radove na zgradama, hotelima, industrijskim pogonima i infrastrukturi —
          projekti, dokumentacija, fotografije, skladišta i troškovi na jednom mjestu.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={`${ELECTRO_BASE}/registracija`} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white hover:opacity-90">
            Zatražite probno razdoblje — 10 dana
          </Link>
          <Link href={`${ELECTRO_BASE}/funkcionalnosti`} className="rounded-xl border border-black/10 px-6 py-3 font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
            Pogledajte funkcionalnosti
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-black/10 p-6 dark:border-white/10">
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Icon size={20} /></span>
              <h2 className="font-bold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-muted dark:border-white/5">
        Varel Electric — dio Varel platforme
      </footer>
    </main>
  );
}
