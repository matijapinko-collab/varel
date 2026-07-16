import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, FilterBar, Pagination, TextInput, LinkButton } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function PeopleList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const like = { contains: q, mode: "insensitive" as const };
  const where: Record<string, unknown> = { deletedAt: null };
  if (q) where.OR = [{ fullName: like }, { email: like }, { phone: like }];

  const [total, rows] = await Promise.all([
    db.bisneysPerson.count({ where }),
    db.bisneysPerson.findMany({ where, orderBy: { fullName: "asc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { candidate: { select: { id: true } }, _count: { select: { contacts: true, relationsFrom: true, relationsTo: true } } } }),
  ]);
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div>
      <BisneysPageHeader title="Osobe i odnosi" description={`${total} osoba u bazi`}>
        <LinkButton href="/bisneyscrm/relationships" variant="ghost">Mreža odnosa</LinkButton>
        <LinkButton href="/bisneyscrm/people/novi">Nova osoba</LinkButton>
      </BisneysPageHeader>

      <FilterBar exportHref="/api/bisneyscrm/export/people">
        <div className="w-64"><label className="mb-1 block text-xs text-muted">Pretraga</label><TextInput name="q" defaultValue={q} placeholder="Ime, email, telefon" /></div>
      </FilterBar>

      <DataTable headers={["Ime", "Email", "Telefon", "Grad", "Uloga", "Odnosi"]} empty={total === 0 ? "Još nema osoba." : undefined}>
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-soft">
            <td className="px-4 py-3"><Link href={`/bisneyscrm/people/${p.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{p.fullName}</Link></td>
            <td className="px-4 py-3">{p.email ?? "—"}</td>
            <td className="px-4 py-3">{p.phone ?? "—"}</td>
            <td className="px-4 py-3">{p.city ?? "—"}</td>
            <td className="px-4 py-3">{p.candidate ? "Kandidat" : p._count.contacts > 0 ? "Kontakt" : "—"}</td>
            <td className="px-4 py-3 tabular-nums">{p._count.relationsFrom + p._count.relationsTo}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} pageCount={pageCount} params={q ? { q } : {}} />
    </div>
  );
}
