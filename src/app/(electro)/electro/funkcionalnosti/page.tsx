import type { Metadata } from "next";
import Link from "next/link";
import { ELECTRO_BASE } from "@/lib/electro/constants";

export const metadata: Metadata = {
  title: "Funkcionalnosti — Varel Electric",
  description: "Projekti i faze, dokumentacijski centar s odobrenjima, fotografije radova, dnevnik gradilišta, skladišta, potrošnja materijala i PDF izvještaji.",
};

const GROUPS: Array<{ title: string; items: string[] }> = [
  { title: "Projekti i gradilišta", items: ["Projekti s više investitora", "Podprojekti, objekti, zone, katovi i prostorije", "Faze radova s predlošcima i odobrenjima", "Zadaci s pregledom prije završetka", "Dnevnik gradilišta sa zaključavanjem"] },
  { title: "Dokumentacija", items: ["Dokumentacijski centar s kategorijama", "Verzioniranje — nova verzija nikad ne briše staru", "Obavezno odobrenje inženjera", "Skeniranje papirnate dokumentacije u PDF", "Pregled PDF, slika i Office dokumenata, DWG preuzimanje"] },
  { title: "Fotografije i problemi", items: ["Fotografiranje izravno iz aplikacije", "Povezivanje s projektom, prostorijom, fazom i zadatkom", "Vodeni žig na izvještajnim kopijama", "Centralna evidencija problema i nedostataka s rokovima"] },
  { title: "Skladišta i materijal", items: ["Više skladišta: centralno, gradilišno, mobilno", "Nepromjenjiva knjiga skladišnih transakcija", "Potrošnja s potvrdom voditelja gradilišta", "Minimalne zalihe i upozorenja", "CSV / XLSX uvoz iz ERP-a"] },
  { title: "Troškovi i izvještaji", items: ["Budžet projekta po kategorijama", "Planirana naspram stvarne potrošnje", "PDF izvještaji s fotografijama i napretkom po fazama", "Audit log svih ključnih akcija"] },
  { title: "Tvrtka i tim", items: ["Više podružnica i odjela", "Uloge: admin, inženjer, voditelj gradilišta, elektroinstalater", "Više uloga po osobi i pristup po projektu", "Investitori s više projekata"] },
];

export default function ElectroFeatures() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link href={ELECTRO_BASE} className="text-sm text-muted hover:text-foreground">← Varel Electric</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">Funkcionalnosti</h1>
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="font-bold text-emerald-600 dark:text-emerald-400">{g.title}</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-muted">
              {g.items.map((item) => (
                <li key={item} className="flex gap-2"><span aria-hidden>✓</span>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-14 text-center">
        <Link href={`${ELECTRO_BASE}/registracija`} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white hover:opacity-90">
          Zatražite probno razdoblje
        </Link>
      </div>
    </main>
  );
}
