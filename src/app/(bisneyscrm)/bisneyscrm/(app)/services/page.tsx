import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { toggleService } from "@/server/actions/bisneys-services";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, LinkButton } from "@/components/bisneyscrm/shared/ui";
import { money } from "@/lib/bisneyscrm/format";

export const dynamic = "force-dynamic";

export default async function ServicesList() {
  await requireBisneysUser();
  const services = await db.bisneysService.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { companyServices: true, jobServices: true } } },
  });

  return (
    <div className="max-w-4xl">
      <BisneysPageHeader title="Usluge" description={`${services.length} usluga`}>
        <LinkButton href="/bisneyscrm/services/novi">Nova usluga</LinkButton>
      </BisneysPageHeader>
      <DataTable headers={["Naziv", "Cijena", "Billing", "Tvrtke", "Aktivna", ""]} empty={services.length === 0 ? "Još nema usluga." : undefined}>
        {services.map((s) => (
          <tr key={s.id} className="hover:bg-soft">
            <td className="px-4 py-3 font-medium">{s.name}</td>
            <td className="px-4 py-3 tabular-nums">{s.basePrice ? money(s.basePrice, s.currency ?? "EUR") : "—"}</td>
            <td className="px-4 py-3">{s.billingModel ?? "—"}</td>
            <td className="px-4 py-3 tabular-nums">{s._count.companyServices}</td>
            <td className="px-4 py-3">
              <form action={toggleService.bind(null, s.id)}>
                <button type="submit" className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.isActive ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-gray-500/10 text-gray-500"}`}>
                  {s.isActive ? "Aktivna" : "Neaktivna"}
                </button>
              </form>
            </td>
            <td className="px-4 py-3 text-right"><Link href={`/bisneyscrm/services/${s.id}/uredi`} className="text-sm text-indigo-600 hover:underline dark:text-indigo-300">Uredi</Link></td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
