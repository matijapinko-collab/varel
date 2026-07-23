import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_INVESTOR_TYPE_LABELS } from "@/lib/electro/investor-labels";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroInvestorsPage() {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) redirect(`${ELECTRO_APP_BASE}/403`);

  const investors = await db.electroInvestor.findMany({
    where: { companyId: ctx.company.id, isArchived: false },
    include: { _count: { select: { projects: true, contacts: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight">Investitori</h1>
        <Link href={`${ELECTRO_APP_BASE}/investitori/novi`} className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          + Novi investitor
        </Link>
      </div>
      <div className="space-y-2">
        {investors.map((inv) => (
          <Link key={inv.id} href={`${ELECTRO_APP_BASE}/investitori/${inv.id}`} className={`${electroCardCls} !p-4 block hover:border-emerald-400`}>
            <p className="font-bold">{inv.name} <span className="ml-1 text-xs font-normal text-muted">{ELECTRO_INVESTOR_TYPE_LABELS[inv.type]}</span></p>
            <p className="mt-0.5 text-sm text-muted">
              {[inv.oib && `OIB ${inv.oib}`, inv.city, inv.email].filter(Boolean).join(" · ")}
            </p>
            <p className="text-xs text-muted">{inv._count.projects} projekata · {inv._count.contacts} kontakata</p>
          </Link>
        ))}
        {investors.length === 0 && <p className="text-sm text-muted">Još nema investitora.</p>}
      </div>
    </div>
  );
}
