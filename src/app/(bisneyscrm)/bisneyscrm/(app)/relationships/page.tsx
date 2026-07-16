import Link from "next/link";
import { requireBisneysUser, getBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { ensureRelationshipTypes } from "@/lib/bisneyscrm/relationships";
import { createRelationshipType } from "@/server/actions/bisneys-relationships";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DetailCard, TextInput, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { dateTime } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = { business: "Poslovni", work: "Radni", referral: "Referral", personal: "Osobni" };

export default async function RelationshipsPage() {
  await requireBisneysUser();
  await ensureRelationshipTypes();
  const user = await getBisneysUser();
  const isSuper = user?.role === "SUPERADMIN";

  const [recent, types, connectorsRaw] = await Promise.all([
    db.bisneysRelationship.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { type: true, source: true, target: true } }),
    db.bisneysRelationshipType.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.bisneysPerson.findMany({
      where: { deletedAt: null, OR: [{ relationsFrom: { some: {} } }, { relationsTo: { some: {} } }] },
      select: { id: true, fullName: true, _count: { select: { relationsFrom: true, relationsTo: true } } },
      take: 50,
    }),
  ]);
  const connectors = connectorsRaw
    .map((p) => ({ id: p.id, fullName: p.fullName, total: p._count.relationsFrom + p._count.relationsTo }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const byCat = types.reduce<Record<string, typeof types>>((acc, t) => { (acc[t.category ?? "business"] ??= []).push(t); return acc; }, {});

  return (
    <div className="max-w-5xl">
      <BisneysPageHeader title="Osobe i odnosi" description="Mreža poslovnih odnosa i preporuka. Odnose dodajete s profila osobe." />

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Najviše povezane osobe">
          {connectors.length === 0 ? <p className="text-sm text-muted">Još nema odnosa. Otvorite profil osobe i dodajte odnos.</p> : (
            <ul className="space-y-2 text-sm">
              {connectors.map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <Link href={`/bisneyscrm/people/${c.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{c.fullName}</Link>
                  <span className="text-muted">{c.total} odnosa</span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        <DetailCard title="Nedavni odnosi">
          {recent.length === 0 ? <p className="text-sm text-muted">Još nema odnosa.</p> : (
            <ul className="space-y-2 text-sm">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/bisneyscrm/people/${r.sourcePersonId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{r.source.fullName}</Link>
                  <span className="text-muted"> — {r.type.name} → </span>
                  <Link href={`/bisneyscrm/people/${r.targetPersonId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{r.target.fullName}</Link>
                  <div className="text-xs text-muted">{dateTime(r.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>

      <div className="mt-4">
        <DetailCard title="Vrste odnosa">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(byCat).map(([cat, list]) => (
              <div key={cat}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{CATEGORY_LABELS[cat] ?? cat}</div>
                <ul className="space-y-0.5 text-sm">
                  {list.map((t) => <li key={t.id}>{t.name}{t.symmetric && <span className="text-muted"> ↔</span>}</li>)}
                </ul>
              </div>
            ))}
          </div>
          {isSuper && (
            <form action={createRelationshipType} className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-4">
              <TextInput name="name" placeholder="Nova vrsta odnosa" required className="w-56" />
              <SelectInput name="category" defaultValue="business" className="w-40">
                <option value="business">Poslovni</option><option value="work">Radni</option><option value="referral">Referral</option><option value="personal">Osobni</option>
              </SelectInput>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="symmetric" className="h-4 w-4 accent-[var(--primary)]" /> Simetričan</label>
              <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Dodaj vrstu</button>
            </form>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
