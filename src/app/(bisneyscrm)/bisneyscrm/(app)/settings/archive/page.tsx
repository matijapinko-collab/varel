import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { restoreEntity } from "@/server/actions/bisneys-archive";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard } from "@/components/bisneyscrm/shared/ui";
import { shortDate } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  await requireBisneysSuperadmin();
  const [companies, candidates, people, jobs] = await Promise.all([
    db.bisneysCompany.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, take: 50, select: { id: true, name: true, deletedAt: true } }),
    db.bisneysCandidate.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, take: 50, select: { id: true, deletedAt: true, person: { select: { fullName: true } } } }),
    db.bisneysPerson.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, take: 50, select: { id: true, fullName: true, deletedAt: true } }),
    db.bisneysJob.findMany({ where: { deletedAt: { not: null } }, orderBy: { deletedAt: "desc" }, take: 50, select: { id: true, title: true, deletedAt: true } }),
  ]);

  const Section = ({ title, items }: { title: string; items: { id: string; label: string; deletedAt: Date | null; entity: "company" | "candidate" | "person" | "job" }[] }) => (
    <DetailCard title={`${title} (${items.length})`}>
      {items.length === 0 ? <p className="text-sm text-muted">Prazno.</p> : (
        <ul className="space-y-1.5 text-sm">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between">
              <span>{it.label} <span className="text-xs text-muted">· {shortDate(it.deletedAt)}</span></span>
              <form action={restoreEntity.bind(null, it.entity, it.id)}><button className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-indigo-500/50">Vrati</button></form>
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );

  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/settings">Postavke</BackLink>
      <BisneysPageHeader title="Arhiva" description="Soft-deleted zapisi. Ništa se ne briše trajno (brief §56)." />
      <div className="grid gap-4">
        <Section title="Tvrtke" items={companies.map((c) => ({ id: c.id, label: c.name, deletedAt: c.deletedAt, entity: "company" }))} />
        <Section title="Kandidati" items={candidates.map((c) => ({ id: c.id, label: c.person.fullName, deletedAt: c.deletedAt, entity: "candidate" }))} />
        <Section title="Osobe" items={people.map((c) => ({ id: c.id, label: c.fullName, deletedAt: c.deletedAt, entity: "person" }))} />
        <Section title="Poslovi" items={jobs.map((c) => ({ id: c.id, label: c.title, deletedAt: c.deletedAt, entity: "job" }))} />
      </div>
    </div>
  );
}
