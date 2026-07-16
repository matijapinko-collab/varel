import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { customerDisplayName } from "@/lib/hvac/b2b-config";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

export default async function LocationsPage(props: PageProps<"/hvac-b2b/lokacije">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const q = (typeof sp?.q === "string" ? sp.q : "").trim();
  const page = Math.max(1, Number(typeof sp?.page === "string" ? sp.page : 1) || 1);

  const where: Prisma.HvacLocationWhereInput = {
    tenantId: ctx.tenantId, deletedAt: null,
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };

  const [locations, total] = await Promise.all([
    db.hvacLocation.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { customer: true, _count: { select: { units: true } } } }),
    db.hvacLocation.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Lokacije" />
      <form className="relative mb-4 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Traži po nazivu, adresi, gradu…" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-sky-500" />
      </form>

      {locations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          {q ? "Nema rezultata." : "Još nema lokacija. Lokacije dodajete kroz profil klijenta."}
        </div>
      ) : (
        <AdminTable headers={["Lokacija", "Klijent", "Adresa", "Uređaji"]} empty={false}>
          {locations.map((l) => (
            <tr key={l.id}>
              <td className="px-3 py-2.5 font-medium">{l.name}</td>
              <td className="px-3 py-2.5 text-sm"><Link href={`/hvac-b2b/klijenti/${l.customerId}`} className="hover:text-sky-600 dark:hover:text-sky-300">{customerDisplayName(l.customer)}</Link></td>
              <td className="px-3 py-2.5 text-sm text-muted">{[l.address, l.postalCode, l.city].filter(Boolean).join(", ") || "—"}</td>
              <td className="px-3 py-2.5 text-sm text-muted">{l._count.units}</td>
            </tr>
          ))}
        </AdminTable>
      )}

      {pages > 1 && (
        <div className="mt-4 flex justify-end gap-2 text-sm">
          {page > 1 && <Link href={`/hvac-b2b/lokacije?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Prethodna</Link>}
          {page < pages && <Link href={`/hvac-b2b/lokacije?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`} className="rounded-lg border border-border px-3 py-1.5">Sljedeća</Link>}
        </div>
      )}
    </div>
  );
}
