import { requireBisneysSuperadmin } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, FilterBar, Pagination, TextInput } from "@/components/bisneyscrm/shared/ui";
import { dateTime } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 40;

export default async function AuditLog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysSuperadmin();
  const sp = await searchParams;
  const action = typeof sp.action === "string" ? sp.action : "";
  const entityType = typeof sp.entityType === "string" ? sp.entityType : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (entityType) where.entityType = { contains: entityType, mode: "insensitive" };

  const [total, rows] = await Promise.all([
    db.bisneysAuditLog.count({ where }),
    db.bisneysAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { user: { select: { username: true } } } }),
  ]);
  const pageCount = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div>
      <BisneysPageHeader title="Audit log" description={`${total} zapisa — samo za čitanje`} />
      <FilterBar>
        <div className="w-52"><label className="mb-1 block text-xs text-muted">Radnja</label><TextInput name="action" defaultValue={action} placeholder="npr. login, company_updated" /></div>
        <div className="w-44"><label className="mb-1 block text-xs text-muted">Entitet</label><TextInput name="entityType" defaultValue={entityType} placeholder="company, candidate…" /></div>
      </FilterBar>
      <DataTable headers={["Vrijeme", "Korisnik", "Radnja", "Entitet", "ID", "IP"]} empty={total === 0 ? "Nema zapisa." : undefined}>
        {rows.map((a) => (
          <tr key={a.id} className="hover:bg-soft">
            <td className="whitespace-nowrap px-4 py-2 text-muted">{dateTime(a.createdAt)}</td>
            <td className="px-4 py-2">{a.user?.username ?? a.userId?.slice(0, 8) ?? "—"}</td>
            <td className="px-4 py-2 font-medium">{a.action}</td>
            <td className="px-4 py-2">{a.entityType ?? "—"}</td>
            <td className="px-4 py-2 text-muted">{a.entityId?.slice(0, 10) ?? "—"}</td>
            <td className="px-4 py-2 text-muted">{a.ipHash ? a.ipHash.slice(0, 8) : "—"}</td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} pageCount={pageCount} params={{ ...(action ? { action } : {}), ...(entityType ? { entityType } : {}) }} />
    </div>
  );
}
