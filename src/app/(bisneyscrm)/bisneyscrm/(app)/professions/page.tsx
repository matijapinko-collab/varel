import { requireBisneysUser, getBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { createProfession, addProfessionAlias } from "@/server/actions/bisneys-jobs";
import { seedProfessionCatalogue } from "@/server/actions/bisneys-professions";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DetailCard, TextInput, SelectInput } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";

export default async function ProfessionsPage() {
  await requireBisneysUser();
  const user = await getBisneysUser();
  const isSuper = user?.role === "SUPERADMIN";

  const [categories, professions, totalAliases] = await Promise.all([
    db.bisneysProfessionCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.bisneysProfession.findMany({
      orderBy: { name: "asc" },
      include: { aliases: true, _count: { select: { candidateProfessions: true, jobs: true } } },
    }),
    db.bisneysProfessionAlias.count(),
  ]);
  const byCat = new Map<string | null, typeof professions>();
  for (const p of professions) { const k = p.categoryId; (byCat.get(k) ?? byCat.set(k, []).get(k)!).push(p); }

  return (
    <div className="max-w-5xl">
      <BisneysPageHeader title="Zanimanja" description={`${professions.length} zanimanja · ${categories.length} kategorija · ${totalAliases} aliasa`}>
        {isSuper && <form action={seedProfessionCatalogue}><button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Seedaj katalog</button></form>}
      </BisneysPageHeader>

      {professions.length === 0 && (
        <div className="mb-6 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted">
          Katalog zanimanja je prazan. {isSuper ? "Kliknite Seedaj katalog da učitate zadana Bisneys zanimanja, kategorije i aliase." : "Superadmin treba učitati katalog."}
        </div>
      )}

      {isSuper && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <DetailCard title="Novo zanimanje">
            <form action={createProfession} className="flex gap-2"><TextInput name="name" placeholder="npr. HVAC serviser" required /><button className="rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white hover:opacity-90">Dodaj</button></form>
          </DetailCard>
          <DetailCard title="Novi alias">
            <form action={addProfessionAlias} className="space-y-2">
              <SelectInput name="professionId" required><option value="">Odaberi zanimanje…</option>{professions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</SelectInput>
              <div className="flex gap-2"><TextInput name="alias" placeholder="npr. serviser klima" required /><button className="rounded-lg border border-border px-4 text-sm font-semibold hover:border-indigo-500/50">Dodaj</button></div>
            </form>
          </DetailCard>
        </div>
      )}

      <div className="space-y-4">
        {[...byCat.entries()].map(([catId, list]) => {
          const cat = categories.find((c) => c.id === catId);
          return (
            <DetailCard key={catId ?? "none"} title={`${cat?.name ?? "Bez kategorije"} (${list.length})`}>
              <ul className="divide-y divide-border">
                {list.map((p) => (
                  <li key={p.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}{!p.isActive && <span className="ml-2 text-xs text-muted">(neaktivno)</span>}</span>
                      <span className="text-xs text-muted">{p._count.candidateProfessions} kandidata · {p._count.jobs} poslova</span>
                    </div>
                    {p.aliases.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{p.aliases.map((a) => <span key={a.id} className="rounded-full bg-soft px-2 py-0.5 text-xs text-muted">{a.alias}</span>)}</div>}
                  </li>
                ))}
              </ul>
            </DetailCard>
          );
        })}
      </div>
    </div>
  );
}
