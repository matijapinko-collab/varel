import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { INVOICE_STATUS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import type { HvacInvoiceStatus, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export default async function InvoicesPage(props: PageProps<"/hvac-b2b/racuni">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const q = (typeof sp?.q === "string" ? sp.q : "").trim();
  const status = typeof sp?.status === "string" ? sp.status : "";
  const page = Math.max(1, Number(typeof sp?.page === "string" ? sp.page : 1) || 1);

  const where: Prisma.HvacInvoiceWhereInput = {
    tenantId: ctx.tenantId,
    ...(status ? { status: status as HvacInvoiceStatus } : {}),
    ...(q ? { OR: [
      { number: { contains: q, mode: "insensitive" } },
      { customer: { companyName: { contains: q, mode: "insensitive" } } },
      { customer: { lastName: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };

  const [rows, total, unpaid] = await Promise.all([
    db.hvacInvoice.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { customer: true } }),
    db.hvacInvoice.count({ where }),
    db.hvacInvoice.aggregate({ where: { tenantId: ctx.tenantId, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } }, _sum: { totalEur: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Računi">
        <Link href="/hvac-b2b/racuni/novi" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={16} /> Novi račun
        </Link>
      </PageHeader>
      <p className="-mt-2 mb-4 text-sm text-muted">Otvorena potraživanja: <span className="font-semibold text-foreground">{formatEur(Number(unpaid._sum.totalEur ?? 0))}</span></p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative min-w-[15rem] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Traži po broju ili klijentu…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-sky-500" />
          {status && <input type="hidden" name="status" value={status} />}
        </form>
        <div className="flex flex-wrap gap-1 text-xs">
          <Link href="/hvac-b2b/racuni" className={`rounded-full px-2.5 py-1 font-semibold ${!status ? "bg-sky-500 text-white" : "border border-border text-muted hover:text-foreground"}`}>Svi</Link>
          {(Object.keys(INVOICE_STATUS) as HvacInvoiceStatus[]).map((s) => (
            <Link key={s} href={`/hvac-b2b/racuni?status=${s}`} className={`rounded-full px-2.5 py-1 font-semibold ${status === s ? "bg-sky-500 text-white" : "border border-border text-muted hover:text-foreground"}`}>{INVOICE_STATUS[s].label}</Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          {q || status ? "Nema računa po ovom filtru." : "Još nema računa. Kreirajte račun ručno ili iz radnog naloga / ponude."}
        </div>
      ) : (
        <AdminTable headers={["Broj", "Klijent", "Status", "Iznos", "Dospijeće", "Datum"]} empty={false}>
          {rows.map((row) => {
            const st = INVOICE_STATUS[row.status];
            return (
              <tr key={row.id}>
                <td className="px-3 py-2.5"><Link href={`/hvac-b2b/racuni/${row.id}`} className="font-mono text-sm font-medium hover:text-sky-600 dark:hover:text-sky-300">{row.number}</Link></td>
                <td className="px-3 py-2.5 text-sm">{customerDisplayName(row.customer)}</td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span></td>
                <td className="px-3 py-2.5 text-sm tabular-nums">{formatEur(Number(row.totalEur))}</td>
                <td className="px-3 py-2.5 text-xs text-muted">{row.dueDate ? row.dueDate.toISOString().slice(0, 10) : "—"}</td>
                <td className="px-3 py-2.5 text-xs text-muted">{row.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            );
          })}
        </AdminTable>
      )}

      {pages > 1 && (
        <div className="mt-4 flex justify-end gap-2 text-sm">
          {page > 1 && <Link href={`/hvac-b2b/racuni?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page - 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Prethodna</Link>}
          {page < pages && <Link href={`/hvac-b2b/racuni?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page + 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Sljedeća</Link>}
        </div>
      )}
    </div>
  );
}
