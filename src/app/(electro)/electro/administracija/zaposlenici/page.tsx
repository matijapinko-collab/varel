import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroAdmin } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE, ELECTRO_ROLE_NAMES, type ElectroRoleKey } from "@/lib/electro/constants";
import { countBillableUsers } from "@/lib/electro/team";
import { getIntLimit } from "@/lib/electro/limits";
import { ElectroEmployeeRowActions } from "@/components/electro/team/employee-row-actions";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  INVITED: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  INACTIVE: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  SUSPENDED: "bg-red-500/15 text-red-700 dark:text-red-300",
  ARCHIVED: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
};
const STATUS_LABEL: Record<string, string> = {
  INVITED: "Pozvan",
  ACTIVE: "Aktivan",
  INACTIVE: "Neaktivan",
  SUSPENDED: "Suspendiran",
  ARCHIVED: "Arhiviran",
};

export default async function ElectroEmployeesPage() {
  const ctx = await requireElectroAdmin();

  const [users, billable, maxUsers] = await Promise.all([
    db.electroUser.findMany({
      where: { companyId: ctx.company.id },
      include: { roles: { include: { role: true } } },
      orderBy: [{ status: "asc" }, { lastName: "asc" }],
    }),
    countBillableUsers(ctx.company.id),
    getIntLimit(ctx.subscription.planId, "maxUsers"),
  ]);

  const atLimit = maxUsers !== null && billable >= maxUsers;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Zaposlenici</h1>
          <p className="text-sm text-muted">
            {billable} {maxUsers !== null && `/ ${maxUsers}`} korisnika · paket {ctx.subscription.plan.name}
          </p>
        </div>
        {atLimit ? (
          <span className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
            Dosegnut limit korisnika za paket
          </span>
        ) : (
          <Link href={`${ELECTRO_APP_BASE}/zaposlenici/novi`} className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            + Novi zaposlenik
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {users.map((u) => {
          const roleNames = u.roles.map((r) => ELECTRO_ROLE_NAMES[r.role.key as ElectroRoleKey]).filter(Boolean);
          return (
            <div key={u.id} className={`${electroCardCls} !p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-bold">
                    {u.firstName} {u.lastName}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[u.status]}`}>{STATUS_LABEL[u.status]}</span>
                    {u.id === ctx.user.id && <span className="ml-1 text-xs text-muted">(vi)</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{u.email}{u.jobTitle && ` · ${u.jobTitle}`}</p>
                  <p className="text-xs text-muted">{roleNames.join(", ") || "Bez uloge"}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {u.status !== "ARCHIVED" && (
                    <Link href={`${ELECTRO_APP_BASE}/zaposlenici/${u.id}`} className="text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                      Uredi
                    </Link>
                  )}
                  <ElectroEmployeeRowActions userId={u.id} status={u.status} isSelf={u.id === ctx.user.id} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
