import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { archivePerson } from "@/server/actions/bisneys-people";
import { removeRelationship } from "@/server/actions/bisneys-relationships";
import { ensureRelationshipTypes, buildGraph, referralStats, howWeReached } from "@/lib/bisneyscrm/relationships";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard, DetailRow, LinkButton } from "@/components/bisneyscrm/shared/ui";
import { RelationshipGraph } from "@/components/bisneyscrm/relationships/relationship-graph";
import { AddRelationshipForm } from "@/components/bisneyscrm/relationships/add-relationship-form";
import { money } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

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
    },
  });
  if (!p) notFound();

  const [graph, stats, reach, relations, people, types, companies] = await Promise.all([
    buildGraph(id, 2),
    referralStats(id),
    howWeReached(id),
    db.bisneysRelationship.findMany({ where: { OR: [{ sourcePersonId: id }, { targetPersonId: id }] }, include: { type: true, source: true, target: true }, orderBy: { createdAt: "desc" } }),
    db.bisneysPerson.findMany({ where: { deletedAt: null, id: { not: id } }, orderBy: { fullName: "asc" }, take: 500, select: { id: true, fullName: true } }),
    db.bisneysRelationshipType.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, name: true, category: true } }),
    db.bisneysCompany.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-5xl">
      <BackLink href="/bisneyscrm/people">Osobe</BackLink>
      <BisneysPageHeader title={p.fullName} description={p.city ?? undefined}>
        {p.candidate && <LinkButton href={`/bisneyscrm/candidates/${p.candidate.id}`} variant="ghost">Profil kandidata</LinkButton>}
        <LinkButton href={`/bisneyscrm/people/${p.id}/uredi`} variant="ghost">Uredi</LinkButton>
        <form action={archivePerson.bind(null, p.id)}>
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-red-500 hover:border-red-400">Arhiviraj</button>
        </form>
      </BisneysPageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailCard title="Kontakt">
          <dl>
            <DetailRow label="Email">{p.email ?? "—"}</DetailRow>
            <DetailRow label="Telefon">{p.phone ?? "—"}</DetailRow>
            <DetailRow label="Grad / država">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</DetailRow>
            <DetailRow label="Izvor">{p.source ?? "—"}</DetailRow>
          </dl>
        </DetailCard>
        <DetailCard title="Referral statistika">
          <dl>
            <DetailRow label="Preporučeni">{stats.total}</DetailRow>
            <DetailRow label="Kandidati">{stats.candidates}</DetailRow>
            <DetailRow label="Došli do intervjua">{stats.interviews}</DetailRow>
            <DetailRow label="Zaposleni">{stats.hires}</DetailRow>
            <DetailRow label="Success rate">{stats.successRate}%</DetailRow>
            <DetailRow label="Vrijednost iz preporuka">{money(stats.dealValue)}</DetailRow>
          </dl>
        </DetailCard>
      </div>

      {reach.length > 0 && (
        <div className="mt-4">
          <DetailCard title="Kako smo došli do ove osobe?">
            <ol className="space-y-1 text-sm">
              {reach.map((s, i) => (
                <li key={i}>
                  <Link href={`/bisneyscrm/people/${s.fromId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{s.fromName}</Link>
                  <span className="text-muted"> je preporučio → </span>
                  <Link href={`/bisneyscrm/people/${s.toId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{s.toName}</Link>
                </li>
              ))}
            </ol>
          </DetailCard>
        </div>
      )}

      <div className="mt-4">
        <h2 className="mb-3 text-sm font-semibold text-muted">Mreža odnosa</h2>
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
                    <span>
                      <span className="text-muted">{outgoing ? "" : "← "}{r.type.name}{outgoing ? " →" : ""} </span>
                      <Link href={`/bisneyscrm/people/${other.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{other.fullName}</Link>
                    </span>
                    <form action={removeRelationship.bind(null, r.id, id)}>
                      <button type="submit" className="text-xs text-red-500 hover:underline">ukloni</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </DetailCard>
      </div>

      {(p.contacts.length > 0 || p.companyMemberships.length > 0) && (
        <div className="mt-4">
          <DetailCard title="Tvrtke">
            <ul className="space-y-2 text-sm">
              {p.contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <Link href={`/bisneyscrm/companies/${c.companyId}`} className="text-indigo-600 hover:underline dark:text-indigo-300">{c.company.name}</Link>
                  <span className="text-muted">{c.title ?? "kontakt"}</span>
                </li>
              ))}
              {p.companyMemberships.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <Link href={`/bisneyscrm/companies/${m.companyId}`} className="text-indigo-600 hover:underline dark:text-indigo-300">{m.company.name}</Link>
                  <span className="text-muted">{m.role ?? "zaposlenik"}{m.current ? "" : " (bivši)"}</span>
                </li>
              ))}
            </ul>
          </DetailCard>
        </div>
      )}
    </div>
  );
}
