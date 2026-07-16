import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { WORK_ORDER_STATUS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import type { HvacWorkOrderStatus, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export default async function WorkOrdersPage(props: PageProps<"/hvac-b2b/radni-nalozi">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const q = (typeof sp?.q === "string" ? sp.q : "").trim();
  const status = typeof sp?.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(typeof sp?.page === "string" ? sp.page : 1) || 1);

  const where: Prisma.HvacWorkOrderWhereInput = {
    tenantId: ctx.tenantId, deletedAt: null,
    ...(status ? { status: status as HvacWorkOrderStatus } : {}),
    ...(q ? { OR: [
      { number: { contains: q, mode: "insensitive" } },
      { customer: { companyName: { contains: q, mode: "insensitive" } } },
      { customer: { lastName: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };

  const [orders, total, openCount] = await Promise.all([
    db.hvacWorkOrder.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { customer: true, technician: { select: { name: true } } },
    }),
    db.hvacWorkOrder.count({ where }),
    db.hvacWorkOrder.count({ where: { tenantId: ctx.tenantId, deletedAt: null, status: { notIn: ["COMPLETED", "SENT", "CANCELLED"] } } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Radni nalozi">
        <Link href="/hvac-b2b/radni-nalozi/novi" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={16} /> Novi radni nalog
        </Link>
      </PageHeader>
      <p className="-mt-2 mb-4 text-sm text-muted">{openCount} otvorenih naloga.</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative min-w-[15rem] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Traži po broju ili klijentu…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-sky-500" />
          {status && <input type="hidden" name="status" value={status} />}
        </form>
        <div className="flex flex-wrap gap-1 text-xs">
          <Link href="/hvac-b2b/radni-nalozi" className={`rounded-full px-2.5 py-1 font-semibold ${!status ? "bg-sky-500 text-white" : "border border-border text-muted hover:text-foreground"}`}>Svi</Link>
          {(Object.keys(WORK_ORDER_STATUS) as HvacWorkOrderStatus[]).map((s) => (
            <Link key={s} href={`/hvac-b2b/radni-nalozi?status=${s}`} className={`rounded-full px-2.5 py-1 font-semibold ${status === s ? "bg-sky-500 text-white" : "border border-border text-muted hover:text-foreground"}`}>{WORK_ORDER_STATUS[s].label}</Link>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          {q || status ? "Nema naloga po ovom filtru." : "Još nema radnih naloga. Kreirajte nalog ručno ili iz termina u kalendaru."}
        </div>
      ) : (
        <AdminTable headers={["Broj", "Klijent", "Majstor", "Status", "Iznos", "Datum"]} empty={false}>
          {orders.map((wo) => {
            const st = WORK_ORDER_STATUS[wo.status];
            return (
              <tr key={wo.id}>
                <td className="px-3 py-2.5"><Link href={`/hvac-b2b/radni-nalozi/${wo.id}`} className="font-mono text-sm font-medium hover:text-sky-600 dark:hover:text-sky-300">{wo.number}</Link></td>
                <td className="px-3 py-2.5 text-sm">{customerDisplayName(wo.customer)}</td>
                <td className="px-3 py-2.5 text-sm text-muted">{wo.technician?.name ?? "—"}</td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span></td>
                <td className="px-3 py-2.5 text-sm tabular-nums">{wo.totalEur ? formatEur(Number(wo.totalEur)) : "—"}</td>
                <td className="px-3 py-2.5 text-xs text-muted">{wo.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            );
          })}
        </AdminTable>
      )}

      {pages > 1 && (
        <div className="mt-4 flex justify-end gap-2 text-sm">
          {page > 1 && <Link href={`/hvac-b2b/radni-nalozi?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page - 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Prethodna</Link>}
          {page < pages && <Link href={`/hvac-b2b/radni-nalozi?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page + 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Sljedeća</Link>}
        </div>
      )}
    </div>
  );
}
