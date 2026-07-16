import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { isElectroEnabled, ELECTRO_BASE } from "@/lib/electro/auth/session";

export const metadata: Metadata = {
  title: "Cijene — Varel Electric",
  description: "Paketi Varel Electrica: Basic, Professional, Business i Enterprise, s probnim razdobljem od 10 dana.",
};

export const dynamic = "force-dynamic";

/** Plans are data (brief §5) — this page renders whatever superadministration configured. */
export default async function ElectroPricing() {
  const plans = isElectroEnabled()
    ? await db.electroSubscriptionPlan
        .findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
        .catch(() => [])
    : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link href={ELECTRO_BASE} className="text-sm text-muted hover:text-foreground">← Varel Electric</Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">Cijene</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Pretplata se naplaćuje po tvrtki, ne po korisniku. Svaki paket uključuje probno razdoblje od 10 dana
        nakon odobrenja registracije.
      </p>

      {plans.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-black/10 p-6 dark:border-white/10">
              <h2 className="font-bold">{p.name}</h2>
              <p className="mt-2 text-2xl font-black">
                {p.isEnterprise || p.priceMonthlyEur === null ? "Na upit" : `${p.priceMonthlyEur} € / mj`}
              </p>
              {p.description && <p className="mt-2 text-sm text-muted">{p.description}</p>}
              <Link href={`${ELECTRO_BASE}/${p.isEnterprise ? "kontakt" : "registracija"}`} className="mt-auto pt-6 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                {p.isEnterprise ? "Kontaktirajte nas →" : "Zatražite pristup →"}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl border border-black/10 p-6 text-muted dark:border-white/10">
          Cjenik uskoro. Za ponudu nam se javite putem <Link href={`${ELECTRO_BASE}/kontakt`} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">kontakta</Link>.
        </p>
      )}
    </main>
  );
}
