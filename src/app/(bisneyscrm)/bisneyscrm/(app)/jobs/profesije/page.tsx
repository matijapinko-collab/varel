import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { createProfession, addProfessionAlias } from "@/server/actions/bisneys-jobs";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard, TextInput, SelectInput } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";

export default async function Professions() {
  await requireBisneysUser();
  const professions = await db.bisneysProfession.findMany({
    orderBy: { name: "asc" },
    include: { aliases: true, _count: { select: { jobs: true } } },
  });

  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/jobs">Poslovi</BackLink>
      <BisneysPageHeader title="Profesije" description="Normalizacija zanimanja (brief §39). Aliasi se automatski mapiraju na profesiju." />

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailCard title="Nova profesija">
          <form action={createProfession} className="flex gap-2">
            <TextInput name="name" placeholder="npr. HVAC serviser" required />
            <button type="submit" className="rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white hover:opacity-90">Dodaj</button>
          </form>
        </DetailCard>
        <DetailCard title="Novi alias">
          <form action={addProfessionAlias} className="space-y-2">
            <SelectInput name="professionId" required>
              <option value="">Odaberi profesiju…</option>
              {professions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </SelectInput>
            <div className="flex gap-2">
              <TextInput name="alias" placeholder="npr. Serviser klima" required />
              <button type="submit" className="rounded-lg border border-border px-4 text-sm font-semibold hover:border-indigo-500/50">Dodaj</button>
            </div>
          </form>
        </DetailCard>
      </div>

      <div className="mt-4">
        <DetailCard title={`Sve profesije (${professions.length})`}>
          {professions.length === 0 ? (
            <p className="text-sm text-muted">Još nema profesija. Kreiraju se automatski pri unosu posla.</p>
          ) : (
            <ul className="divide-y divide-border">
              {professions.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted">{p._count.jobs} poslova</span>
                  </div>
                  {p.aliases.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.aliases.map((a) => <span key={a.id} className="rounded-full bg-soft px-2 py-0.5 text-xs text-muted">{a.alias}</span>)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
