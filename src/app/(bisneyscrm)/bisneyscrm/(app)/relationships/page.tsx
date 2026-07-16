import Link from "next/link";
import { requireBisneysUser, getBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { ensureRelationshipTypes } from "@/lib/bisneyscrm/relationships";
import { companiesWithoutContact } from "@/lib/bisneyscrm/relationships/suggestions";
import { createRelationshipType } from "@/server/actions/bisneys-relationships";
import { runSuggestions, confirmSuggestion, rejectSuggestion } from "@/server/actions/bisneys-rel-engine";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DetailCard, LinkButton, TextInput, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { money, dateTime } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";
const CONF_TONE: Record<string, string> = { HIGH: "text-green-600 dark:text-green-400", MEDIUM: "text-amber-600 dark:text-amber-300", LOW: "text-gray-500", NEEDS_CHECK: "text-red-500" };
const CONF_LABEL: Record<string, string> = { HIGH: "Visoka pouzdanost", MEDIUM: "Srednja pouzdanost", LOW: "Niska pouzdanost", NEEDS_CHECK: "Potrebna provjera" };

export default async function RelationshipsPage() {
  await requireBisneysUser();
  await ensureRelationshipTypes();
  const user = await getBisneysUser();
  const isSuper = user?.role === "SUPERADMIN";

  const [people, relations, referrals, companiesWithContact, noContact, pendingSug, recent, types, sugList, suggestionCount, personNames] = await Promise.all([
    db.bisneysPerson.count({ where: { deletedAt: null } }),
    db.bisneysRelationship.count({ where: { deletedAt: null } }),
    db.bisneysReferral.count(),
    db.bisneysCompany.count({ where: { deletedAt: null, OR: [{ contacts: { some: {} } }, { memberships: { some: {} } }] } }),
    companiesWithoutContact(6),
    db.bisneysRelationshipSuggestion.count({ where: { status: "PENDING" } }),
    db.bisneysRelationship.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8, include: { type: true, source: true, target: true } }),
    db.bisneysRelationshipType.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.bisneysRelationshipSuggestion.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 8 }),
    db.bisneysRelationshipSuggestion.count({ where: { status: "PENDING" } }),
    db.bisneysPerson.findMany({ where: { deletedAt: null }, select: { id: true, fullName: true }, take: 2000 }),
  ]);
  const nameOf = (id: string) => personNames.find((p) => p.id === id)?.fullName ?? "—";

  const kpis = [
    { label: "Osobe", value: people },
    { label: "Odnosi", value: relations },
    { label: "Povezane tvrtke", value: companiesWithContact },
    { label: "Referral veze", value: referrals },
    { label: "Tvrtke bez kontakta", value: noContact.length },
    { label: "Prijedlozi odnosa", value: suggestionCount },
  ];
  const CATEGORY_LABELS: Record<string, string> = { business: "Poslovni", work: "Radni", referral: "Referral", personal: "Osobni" };
  const byCat = types.reduce<Record<string, typeof types>>((acc, t) => { (acc[t.category ?? "business"] ??= []).push(t); return acc; }, {});

  return (
    <div className="max-w-6xl">
      <BisneysPageHeader title="Osobe i odnosi" description="Pregledajte osobe, poslovne veze, preporuke i najkraće puteve do novih tvrtki.">
        <LinkButton href="/bisneyscrm/relationships/network" variant="ghost">Mreža odnosa</LinkButton>
        <LinkButton href="/bisneyscrm/relationships/company-entry" variant="ghost">Pronađi ulaz u tvrtku</LinkButton>
        <LinkButton href="/bisneyscrm/people/novi">Nova osoba</LinkButton>
      </BisneysPageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => <div key={k.label} className="rounded-2xl border border-border bg-card p-4"><div className="text-xs text-muted">{k.label}</div><div className="mt-1 text-2xl font-bold tabular-nums">{k.value}</div></div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title={`Prijedlozi odnosa (${pendingSug})`} action={<form action={runSuggestions}><button className="rounded-lg border border-border px-3 py-1 text-xs font-semibold hover:border-indigo-500/50">Osvježi prijedloge</button></form>}>
          {sugList.length === 0 ? <p className="text-sm text-muted">Nema novih prijedloga. Kliknite „Osvježi prijedloge" da sustav analizira zajednička zaposlenja.</p> : (
            <ul className="space-y-3">
              {sugList.map((s) => (
                <li key={s.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{nameOf(s.sourcePersonId)} ↔ {nameOf(s.targetPersonId)}</span>
                    <span className={`text-xs font-semibold ${CONF_TONE[s.confidence] ?? ""}`}>{CONF_LABEL[s.confidence] ?? s.confidence}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{s.reason}</p>
                  <div className="mt-2 flex gap-2">
                    <form action={confirmSuggestion.bind(null, s.id)}><button className="rounded-lg bg-indigo-500 px-3 py-1 text-xs font-semibold text-white hover:opacity-90">Potvrdi</button></form>
                    <form action={rejectSuggestion.bind(null, s.id)}><button className="rounded-lg border border-border px-3 py-1 text-xs hover:border-red-400">Odbaci</button></form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        <DetailCard title="Tvrtke bez direktnog kontakta" action={<Link href="/bisneyscrm/relationships/company-entry" className="text-xs text-indigo-600 hover:underline dark:text-indigo-300">Pronađi ulaz →</Link>}>
          {noContact.length === 0 ? <p className="text-sm text-muted">Sve tvrtke imaju barem jedan kontakt.</p> : (
            <ul className="space-y-2 text-sm">
              {noContact.map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <Link href={`/bisneyscrm/relationships/company-entry?companyId=${c.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{c.name}</Link>
                  <span className="text-muted">{c.dealValue ? money(c.dealValue, c.currency ?? "EUR") : c.industry ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>
      </div>

      <div className="mt-4">
        <DetailCard title="Nedavni odnosi">
          {recent.length === 0 ? <p className="text-sm text-muted">Još nema odnosa.</p> : (
            <ul className="space-y-2 text-sm">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/bisneyscrm/people/${r.sourcePersonId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{r.source.fullName}</Link>
                  <span className="text-muted"> — {r.type.name} → </span>
                  <Link href={`/bisneyscrm/people/${r.targetPersonId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{r.target.fullName}</Link>
                  <span className="text-xs text-muted"> · {dateTime(r.createdAt)}</span>
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
                  {list.map((t) => <li key={t.id} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: t.color ?? "#6366f1" }} />{t.name}{t.symmetric && <span className="text-muted"> ↔</span>}</li>)}
                </ul>
              </div>
            ))}
          </div>
          {isSuper && (
            <form action={createRelationshipType} className="mt-5 flex flex-wrap items-end gap-2 border-t border-border pt-4">
              <TextInput name="name" placeholder="Nova vrsta odnosa" required className="w-56" />
              <SelectInput name="category" defaultValue="business" className="w-40"><option value="business">Poslovni</option><option value="work">Radni</option><option value="referral">Referral</option><option value="personal">Osobni</option></SelectInput>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="symmetric" className="h-4 w-4 accent-[var(--primary)]" /> Simetričan</label>
              <button type="submit" className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Dodaj vrstu</button>
            </form>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
