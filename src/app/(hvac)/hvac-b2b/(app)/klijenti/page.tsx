import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { customerDisplayName, CUSTOMER_TYPE_LABELS, SOURCE_LABELS } from "@/lib/hvac/b2b-config";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import { CustomerImport } from "@/components/hvac/b2b/customer-import";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export default async function CustomersPage(props: PageProps<"/hvac-b2b/klijenti">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const q = (typeof sp?.q === "string" ? sp.q : "").trim();
  const page = Math.max(1, Number(typeof sp?.page === "string" ? sp.page : 1) || 1);
  const showArchived = sp?.arhiva === "1";

  const where: Prisma.HvacCustomerWhereInput = {
    tenantId: ctx.tenantId,
    archivedAt: showArchived ? { not: null } : null,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { oib: { contains: q } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    db.hvacCustomer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.hvacCustomer.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Klijenti">
        <Link href="/hvac-b2b/klijenti/novi" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={16} /> Dodaj klijenta
        </Link>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="relative flex-1 min-w-[16rem]">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Traži po imenu, e-mailu, telefonu, OIB-u…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-sky-500" />
          {showArchived && <input type="hidden" name="arhiva" value="1" />}
        </form>
        <Link href={showArchived ? "/hvac-b2b/klijenti" : "/hvac-b2b/klijenti?arhiva=1"} className="text-sm text-muted hover:text-foreground">
          {showArchived ? "Aktivni klijenti" : "Arhiva"}
        </Link>
      </div>

      {customers.length === 0 && !q ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-semibold">Još nemate nijednog klijenta.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">Dodajte prvog klijenta kako biste mogli povezati lokacije, uređaje i termine.</p>
          <Link href="/hvac-b2b/klijenti/novi" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white">
            <Plus size={16} /> Dodaj klijenta
          </Link>
        </div>
      ) : (
        <AdminTable headers={["Klijent", "Vrsta", "Kontakt", "Izvor", "Dodan"]} empty={customers.length === 0}>
          {customers.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2.5">
                <Link href={`/hvac-b2b/klijenti/${c.id}`} className="font-medium hover:text-sky-600 dark:hover:text-sky-300">{customerDisplayName(c)}</Link>
                {c.oib && <div className="text-xs text-muted">OIB {c.oib}</div>}
              </td>
              <td className="px-3 py-2.5 text-sm text-muted">{CUSTOMER_TYPE_LABELS[c.type]}</td>
              <td className="px-3 py-2.5 text-sm text-muted">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</td>
              <td className="px-3 py-2.5 text-xs text-muted">{SOURCE_LABELS[c.source]}</td>
              <td className="px-3 py-2.5 text-xs text-muted">{c.createdAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </AdminTable>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">{total} klijenata · stranica {page}/{pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/hvac-b2b/klijenti?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Prethodna</Link>}
            {page < pages && <Link href={`/hvac-b2b/klijenti?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Sljedeća</Link>}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <a href="/api/hvac-b2b/export/klijenti" className="rounded-lg border border-border px-4 py-2 text-sm hover:border-sky-500/50">Izvoz u CSV</a>
      </div>
      <div className="mt-3"><CustomerImport /></div>
    </div>
  );
}
