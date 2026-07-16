import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, FilterBar, Pagination, StatusPill, TextInput, SelectInput, LinkButton } from "@/components/bisneyscrm/shared/ui";
import { SALES_STATUS_LABELS, SALES_STATUS_VALUES } from "@/lib/bisneyscrm/trello/mapping";
import { money, shortDate } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function CompaniesList({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const where: Record<string, unknown> = { deletedAt: null };
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" } },
    { city: { contains: q, mode: "insensitive" } },
    { industry: { contains: q, mode: "insensitive" } },
  ];
  if (status && (SALES_STATUS_VALUES as string[]).includes(status)) where.status = status;

  const [total, rows] = await Promise.all([
    db.bisneysCompany.count({ where }),
    db.bisneysCompany.findMany({
      where, orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { _count: { select: { contacts: true } } },
    }),
  ]);
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;
  const filterParams = { ...(q ? { q } : {}), ...(status ? { status } : {}) };
  const exportHref = `/api/bisneyscrm/export/companies${Object.keys(filterParams).length ? `?${new URLSearchParams(filterParams)}` : ""}`;

  return (
    <div>
      <BisneysPageHeader title="Tvrtke" description={`${total} tvrtki u bazi`}>
        <LinkButton href="/bisneyscrm/companies/novi">Nova tvrtka</LinkButton>
      </BisneysPageHeader>

      <FilterBar exportHref={exportHref}>
        <div className="w-64"><label className="mb-1 block text-xs text-muted">Pretraga</label><TextInput name="q" defaultValue={q} placeholder="Naziv, grad, industrija" /></div>
        <div className="w-52"><label className="mb-1 block text-xs text-muted">Status</label>
          <SelectInput name="status" defaultValue={status}>
            <option value="">Svi statusi</option>
            {SALES_STATUS_VALUES.map((s) => <option key={s} value={s}>{SALES_STATUS_LABELS[s]}</option>)}
          </SelectInput>
        </div>
      </FilterBar>

      <DataTable
        headers={["Naziv", "Status", "Industrija", "Grad", "Kontakti", "Vrijednost", "Zadnja aktivnost"]}
        empty={total === 0 ? "Još nema tvrtki. Dodajte tvrtku ručno ili pokrenite Trello sinkronizaciju." : undefined}
      >
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-soft">
            <td className="px-4 py-3"><Link href={`/bisneyscrm/companies/${c.id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{c.name}</Link></td>
            <td className="px-4 py-3"><StatusPill status={c.status} label={SALES_STATUS_LABELS[c.status]} /></td>
            <td className="px-4 py-3">{c.industry ?? "—"}</td>
            <td className="px-4 py-3">{c.city ?? "—"}</td>
            <td className="px-4 py-3 tabular-nums">{c._count.contacts}</td>
            <td className="px-4 py-3 tabular-nums">{money(c.dealValue, c.currency ?? "EUR")}</td>
            <td className="px-4 py-3 text-muted">{shortDate(c.lastActivityAt)}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} pageCount={pageCount} params={filterParams} />
    </div>
  );
}
