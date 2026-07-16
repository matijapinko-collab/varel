import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, FilterBar, Pagination, TextInput, LinkButton } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function JobsList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const like = { contains: q, mode: "insensitive" as const };
  const where: Record<string, unknown> = { deletedAt: null };
  if (q) where.OR = [{ title: like }, { location: like }, { profession: { name: like } }];

  const [total, rows] = await Promise.all([
    db.bisneysJob.count({ where }),
    db.bisneysJob.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { profession: true, client: true, _count: { select: { candidateJobs: true } } } }),
  ]);
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div>
      <BisneysPageHeader title="Poslovi" description={`${total} radnih mjesta`}>
        <LinkButton href="/bisneyscrm/jobs/profesije" variant="ghost">Profesije</LinkButton>
        <LinkButton href="/bisneyscrm/jobs/novi">Novi posao</LinkButton>
      </BisneysPageHeader>

      <FilterBar exportHref="/api/bisneyscrm/export/jobs">
        <div className="w-64"><label className="mb-1 block text-xs text-muted">Pretraga</label><TextInput name="q" defaultValue={q} placeholder="Naziv, lokacija, profesija" /></div>
      </FilterBar>

      <DataTable headers={["Naziv", "Profesija", "Klijent", "Lokacija", "Radnika", "Kandidati"]} empty={total === 0 ? "Još nema poslova. Poslovi će se pojaviti nakon Trello sinkronizacije ili ručnog unosa." : undefined}>
        {rows.map((j) => (
          <tr key={j.id} className="hover:bg-soft">
            <td className="px-4 py-3"><Link href={`/bisneyscrm/jobs/${j.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{j.title}</Link></td>
            <td className="px-4 py-3">{j.profession?.name ?? "—"}</td>
            <td className="px-4 py-3">{j.client?.name ?? "—"}</td>
            <td className="px-4 py-3">{j.location ?? "—"}</td>
            <td className="px-4 py-3 tabular-nums">{j.headcount ?? "—"}</td>
            <td className="px-4 py-3 tabular-nums">{j._count.candidateJobs}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} pageCount={pageCount} params={q ? { q } : {}} />
    </div>
  );
}
