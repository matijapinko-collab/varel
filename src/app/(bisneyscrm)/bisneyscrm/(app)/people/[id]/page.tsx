import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { archivePerson } from "@/server/actions/bisneys-people";
import { removeRelationship } from "@/server/actions/bisneys-relationships";
import { addPersonRole, removePersonRole, addEmployment, deleteEmployment } from "@/server/actions/bisneys-rel-engine";
import { ensureRelationshipTypes, howWeReached, referralStats, PERSON_ROLES, PERSON_ROLE_LABELS } from "@/lib/bisneyscrm/relationships";
import { buildGraph } from "@/lib/bisneyscrm/relationships";
import { computePersonScores } from "@/lib/bisneyscrm/relationships/score";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard, DetailRow, LinkButton, TextInput, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { RelationshipGraph } from "@/components/bisneyscrm/relationships/relationship-graph";
import { AddRelationshipForm } from "@/components/bisneyscrm/relationships/add-relationship-form";
import { money, shortDate } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

function ScorePill({ label, value, breakdown }: { label: string; value: number; breakdown: { label: string; value: number }[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3" title={breakdown.map((b) => `${b.label}: ${b.value}`).join(" · ")}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-lg font-bold tabular-nums">{value}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${value}%` }} /></div>
      </div>
    </div>
  );
}

export default async function PersonProfile({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  await ensureRelationshipTypes();

  const p = await db.bisneysPerson.findFirst({
    where: { id, deletedAt: null },
    include: {
      candidate: { select: { id: true, status: true } },
      contacts: { include: { company: true } },
      companyMemberships: { include: { company: true } },
      roles: true,
      employments: { where: { deletedAt: null }, include: { company: { select: { id: true, name: true } } }, orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }] },
    },
  });
  if (!p) notFound();

  const [scores, stats, reach, graph, relations, people, types, companies] = await Promise.all([
    computePersonScores(id),
    referralStats(id),
    howWeReached(id),
    buildGraph(id, 2),
    db.bisneysRelationship.findMany({ where: { deletedAt: null, OR: [{ sourcePersonId: id }, { targetPersonId: id }] }, include: { type: true, source: true, target: true }, orderBy: { createdAt: "desc" } }),
    db.bisneysPerson.findMany({ where: { deletedAt: null, id: { not: id } }, orderBy: { fullName: "asc" }, take: 500, select: { id: true, fullName: true } }),
    db.bisneysRelationshipType.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, name: true, category: true } }),
    db.bisneysCompany.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 300, select: { id: true, name: true } }),
  ]);

  const availableRoles = PERSON_ROLES.filter((r) => !p.roles.some((pr) => pr.role === r));

  return (
    <div className="max-w-5xl">
      <BackLink href="/bisneyscrm/people">Osobe</BackLink>
      <BisneysPageHeader title={p.fullName} description={p.headline ?? p.city ?? undefined}>
        {p.candidate && <LinkButton href={`/bisneyscrm/candidates/${p.candidate.id}`} variant="ghost">Profil kandidata</LinkButton>}
        <LinkButton href={`/bisneyscrm/relationships/network?personId=${p.id}`} variant="ghost">Puna mreža</LinkButton>
        <LinkButton href={`/bisneyscrm/people/${p.id}/uredi`} variant="ghost">Uredi</LinkButton>
        <form action={archivePerson.bind(null, p.id)}><button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-red-500 hover:border-red-400">Arhiviraj</button></form>
      </BisneysPageHeader>

      {/* Scores */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ScorePill label="Network score" value={scores.network} breakdown={scores.networkBreakdown} />
        <ScorePill label="Referral score" value={scores.referral} breakdown={scores.referralBreakdown} />
        <ScorePill label="Company access" value={scores.companyAccess} breakdown={scores.companyBreakdown} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Kontakt">
          <dl>
            <DetailRow label="Email">{p.email ?? "—"}</DetailRow>
            <DetailRow label="Telefon">{p.phone ?? "—"}</DetailRow>
            <DetailRow label="LinkedIn">{p.linkedinUrl ? <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-300">profil</a> : "—"}</DetailRow>
            <DetailRow label="Grad / država">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</DetailRow>
            <DetailRow label="Izvor">{p.source ?? "—"}</DetailRow>
          </dl>
        </DetailCard>
        <DetailCard title="Referral statistika">
          <dl>
            <DetailRow label="Preporučeni">{stats.total}</DetailRow>
            <DetailRow label="Došli do intervjua">{stats.interviews}</DetailRow>
            <DetailRow label="Zaposleni">{stats.hires}</DetailRow>
            <DetailRow label="Success rate">{stats.successRate}%</DetailRow>
            <DetailRow label="Vrijednost iz preporuka">{money(stats.dealValue)}</DetailRow>
          </dl>
        </DetailCard>
      </div>

      {/* Roles */}
      <div className="mt-4">
        <DetailCard title="Uloge">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {p.roles.length === 0 && <span className="text-sm text-muted">Nema dodijeljenih uloga.</span>}
            {p.roles.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-soft px-2.5 py-1 text-xs font-medium">
                {PERSON_ROLE_LABELS[r.role] ?? r.role}
                <form action={removePersonRole.bind(null, r.id, p.id)}><button className="text-muted hover:text-red-500">✕</button></form>
              </span>
            ))}
          </div>
          {availableRoles.length > 0 && (
            <form action={addPersonRole.bind(null, p.id)} className="flex gap-2">
              <SelectInput name="role" className="w-56" defaultValue="">{<option value="">Dodaj ulogu…</option>}{availableRoles.map((r) => <option key={r} value={r}>{PERSON_ROLE_LABELS[r]}</option>)}</SelectInput>
              <button className="rounded-lg border border-border px-4 text-sm font-semibold hover:border-indigo-500/50">Dodaj</button>
            </form>
          )}
        </DetailCard>
      </div>

      {reach.length > 0 && (
        <div className="mt-4">
          <DetailCard title="Kako smo došli do ove osobe?">
            <ol className="space-y-1 text-sm">
              {reach.map((s, i) => (
                <li key={i}><Link href={`/bisneyscrm/people/${s.fromId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{s.fromName}</Link><span className="text-muted"> je preporučio → </span><Link href={`/bisneyscrm/people/${s.toId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{s.toName}</Link></li>
              ))}
            </ol>
          </DetailCard>
        </div>
      )}

      {/* Employment history */}
      <div className="mt-4">
        <DetailCard title="Povijest zaposlenja">
          {p.employments.length > 0 && (
            <ul className="mb-4 space-y-2 text-sm">
              {p.employments.map((e) => (
                <li key={e.id} className="flex items-center justify-between">
                  <span>
                    <b>{e.company?.name ?? e.companyName ?? "—"}</b>{e.title ? ` · ${e.title}` : ""}
                    <span className="text-xs text-muted"> · {shortDate(e.startDate)} – {e.isCurrent ? "danas" : shortDate(e.endDate)}</span>
                  </span>
                  <form action={deleteEmployment.bind(null, e.id, p.id)}><button className="text-xs text-red-500 hover:underline">ukloni</button></form>
                </li>
              ))}
            </ul>
          )}
          <form action={addEmployment.bind(null, p.id)} className="grid gap-2 sm:grid-cols-2">
            <SelectInput name="companyId" defaultValue=""><option value="">Tvrtka iz baze…</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectInput>
            <TextInput name="companyName" placeholder="ili upiši naziv tvrtke" />
            <TextInput name="title" placeholder="Funkcija" />
            <TextInput name="department" placeholder="Odjel" />
            <TextInput name="startDate" type="date" />
            <TextInput name="endDate" type="date" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isCurrent" className="h-4 w-4 accent-[var(--primary)]" /> Trenutačno zaposlenje</label>
            <div className="sm:col-span-2"><button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">Dodaj zaposlenje</button></div>
          </form>
        </DetailCard>
      </div>

      {/* Network */}
      <div className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Mreža odnosa</h2>
          <Link href={`/bisneyscrm/relationships/network?personId=${p.id}`} className="text-xs text-indigo-600 hover:underline dark:text-indigo-300">Otvori punu mrežu →</Link>
        </div>
        <RelationshipGraph graph={graph} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DetailCard title="Dodaj odnos">
          <AddRelationshipForm sourcePersonId={p.id} sourceName={p.fullName} people={people.map((x) => ({ id: x.id, name: x.fullName }))} types={types} companies={companies.map((c) => ({ id: c.id, name: c.name }))} />
        </DetailCard>
        <DetailCard title={`Odnosi (${relations.length})`}>
          {relations.length === 0 ? <p className="text-sm text-muted">Nema odnosa.</p> : (
            <ul className="space-y-2 text-sm">
              {relations.map((r) => {
                const outgoing = r.sourcePersonId === id;
                const other = outgoing ? r.target : r.source;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span><span className="text-muted">{outgoing ? "" : "← "}{r.type.name}{outgoing ? " →" : ""} </span><Link href={`/bisneyscrm/people/${other.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{other.fullName}</Link>{!r.confirmed && <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(nepotvrđeno)</span>}</span>
                    <form action={removeRelationship.bind(null, r.id, id)}><button type="submit" className="text-xs text-red-500 hover:underline">ukloni</button></form>
                  </li>
                );
              })}
            </ul>
          )}
        </DetailCard>
      </div>
    </div>
  );
}
