import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { customerDisplayName, UNIT_TYPE_LABELS, UNIT_STATUS, TONE_CLASS } from "@/lib/hvac/b2b-config";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

export default async function UnitsPage(props: PageProps<"/hvac-b2b/uredaji">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const q = (typeof sp?.q === "string" ? sp.q : "").trim();
  const page = Math.max(1, Number(typeof sp?.page === "string" ? sp.page : 1) || 1);

  const where: Prisma.HvacUnitWhereInput = {
    tenantId: ctx.tenantId, deletedAt: null,
    ...(q ? { OR: [
      { manufacturer: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { serialNumber: { contains: q, mode: "insensitive" } },
      { internalName: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  const [units, total] = await Promise.all([
    db.hvacUnit.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { customer: true, location: { select: { name: true } } } }),
    db.hvacUnit.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Klima-uređaji" />
      <form className="relative mb-4 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Traži po proizvođaču, modelu, serijskom broju…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-sky-500" />
      </form>

      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          {q ? "Nema rezultata." : "Još nemate evidentiranih klima-uređaja. Dodajte uređaj kroz profil klijenta."}
        </div>
      ) : (
        <AdminTable headers={["Uređaj", "Klijent", "Lokacija", "Vrsta", "Status", "Sljedeći servis"]} empty={false}>
          {units.map((u) => (
            <tr key={u.id}>
              <td className="px-3 py-2.5">
                <Link href={`/hvac-b2b/uredaji/${u.id}`} className="font-medium hover:text-sky-600 dark:hover:text-sky-300">{[u.manufacturer, u.model].filter(Boolean).join(" ") || u.internalName || "Uređaj"}</Link>
                {u.serialNumber && <div className="text-xs text-muted">S/N {u.serialNumber}</div>}
              </td>
              <td className="px-3 py-2.5 text-sm">
                <Link href={`/hvac-b2b/klijenti/${u.customerId}`} className="hover:text-sky-600 dark:hover:text-sky-300">{customerDisplayName(u.customer)}</Link>
              </td>
              <td className="px-3 py-2.5 text-sm text-muted">{u.location?.name ?? "—"}</td>
              <td className="px-3 py-2.5 text-sm text-muted">{UNIT_TYPE_LABELS[u.unitType]}</td>
              <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE_CLASS[UNIT_STATUS[u.status].tone]}`}>{UNIT_STATUS[u.status].label}</span></td>
              <td className="px-3 py-2.5 text-xs text-muted">{u.nextServiceDate ? u.nextServiceDate.toISOString().slice(0, 10) : "—"}</td>
            </tr>
          ))}
        </AdminTable>
      )}

      {pages > 1 && (
        <div className="mt-4 flex justify-end gap-2 text-sm">
          {page > 1 && <Link href={`/hvac-b2b/uredaji?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Prethodna</Link>}
          {page < pages && <Link href={`/hvac-b2b/uredaji?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Sljedeća</Link>}
        </div>
      )}

      <div className="mt-6"><a href="/api/hvac-b2b/export/uredaji" className="rounded-lg border border-border px-4 py-2 text-sm hover:border-sky-500/50">Izvoz u CSV</a></div>
    </div>
  );
}
