import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { archivePerson } from "@/server/actions/bisneys-people";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink, DetailCard, DetailRow, LinkButton } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";

export default async function PersonProfile({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  const p = await db.bisneysPerson.findFirst({
    where: { id, deletedAt: null },
    include: {
      candidate: { select: { id: true, status: true } },
      contacts: { include: { company: true } },
      companyMemberships: { include: { company: true } },
      _count: { select: { relationsFrom: true, relationsTo: true, referralsGiven: true } },
    },
  });
  if (!p) notFound();

  return (
    <div className="max-w-4xl">
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
        <DetailCard title="Uloge i veze">
          <dl>
            <DetailRow label="Kandidat">{p.candidate ? "Da" : "Ne"}</DetailRow>
            <DetailRow label="Kontakt u tvrtkama">{p.contacts.length}</DetailRow>
            <DetailRow label="Odnosi">{p._count.relationsFrom + p._count.relationsTo}</DetailRow>
            <DetailRow label="Dane preporuke">{p._count.referralsGiven}</DetailRow>
          </dl>
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

      {p.notes && (
        <div className="mt-4"><DetailCard title="Bilješke"><p className="text-sm text-muted">{p.notes}</p></DetailCard></div>
      )}
    </div>
  );
}
