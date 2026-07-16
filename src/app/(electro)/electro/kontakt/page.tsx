import type { Metadata } from "next";
import Link from "next/link";
import { ELECTRO_BASE } from "@/lib/electro/constants";

export const metadata: Metadata = {
  title: "Kontakt — Varel Electric",
  description: "Javite nam se za demonstraciju, Enterprise ponudu ili pitanja o Varel Electricu.",
};

export default function ElectroContact() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href={ELECTRO_BASE} className="text-sm text-muted hover:text-foreground">← Varel Electric</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">Kontakt</h1>
      <p className="mt-4 text-muted">
        Za demonstraciju proizvoda, Enterprise ponudu s prilagođenim limitima i integracijama ili bilo koje
        pitanje, javite nam se e-mailom — odgovaramo unutar jednog radnog dana.
      </p>
      <p className="mt-6">
        <a href="mailto:info@varel.io?subject=Varel%20Electric" className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white hover:opacity-90">
          info@varel.io
        </a>
      </p>
      <p className="mt-10 text-sm text-muted">
        Želite odmah isprobati? <Link href={`${ELECTRO_BASE}/registracija`} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Zatražite probno razdoblje od 10 dana.</Link>
      </p>
    </main>
  );
}
