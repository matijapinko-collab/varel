import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext, hasRole } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere, canManageProjects } from "@/lib/electro/project-access";
import { trialDaysRemaining } from "@/lib/electro/subscription";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = { TRIAL: "Probno razdoblje", ACTIVE: "Aktivna pretplata" };

/** Role-aware operational dashboard (brief §58). */
export default async function ElectroDashboard() {
  const ctx = await requireElectroContext();
  const trialDays = trialDaysRemaining(ctx.subscription.trialEndsAt);
  const isManager = canManageProjects(ctx);

  const projectIds = (await db.electroProject.findMany({ where: accessibleProjectsWhere(ctx), select: { id: true } })).map((p) => p.id);

  const [activeProjects, lateProjects, docsPending, openCriticalIssues, pendingConsumption, myTasks] = await Promise.all([
    db.electroProject.count({ where: { id: { in: projectIds }, status: "ACTIVE" } }),
    db.electroProject.count({ where: { id: { in: projectIds }, contractDeadline: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED", "ARCHIVED"] } } }),
    db.electroDocument.count({ where: { companyId: ctx.company.id, projectId: { in: projectIds }, status: "UNDER_REVIEW" } }),
    db.electroIssue.count({ where: { companyId: ctx.company.id, projectId: { in: projectIds }, priority: "CRITICAL", status: { notIn: ["CLOSED", "VERIFIED", "REJECTED"] } } }),
    db.electroMaterialConsumption.count({ where: { companyId: ctx.company.id, projectId: { in: projectIds }, status: "PENDING_CONFIRMATION" } }),
    db.electroTask.count({ where: { companyId: ctx.company.id, assigneeUserId: ctx.user.id, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
  ]);

  // Low-stock items (admin/manager only).
  let lowStock = 0;
  if (isManager || hasRole(ctx, "ADMIN")) {
    const items = await db.electroItem.findMany({ where: { companyId: ctx.company.id, isActive: true, minStock: { not: null } }, select: { id: true, minStock: true } });
    const balances = await db.electroStockMovement.groupBy({ by: ["itemId"], where: { companyId: ctx.company.id }, _sum: { qtyDelta: true } });
    const bal = new Map(balances.map((b) => [b.itemId, Number(b._sum.qtyDelta ?? 0)]));
    lowStock = items.filter((i) => (bal.get(i.id) ?? 0) < Number(i.minStock)).length;
  }

  const Tile = ({ label, value, href, alert }: { label: string; value: number | string; href?: string; alert?: boolean }) => {
    const inner = (
      <div className={`${electroCardCls} ${href ? "hover:border-emerald-400" : ""}`}>
        <p className="text-sm text-muted">{label}</p>
        <p className={`mt-1 text-2xl font-black ${alert && Number(value) > 0 ? "text-red-600 dark:text-red-400" : ""}`}>{value}</p>
      </div>
    );
    return href ? <Link href={href} className="block">{inner}</Link> : inner;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-black tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted">{ctx.company.name} · {STATUS_LABELS[ctx.status] ?? ctx.status}{ctx.status === "TRIAL" && ` · još ${trialDays} dana`}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile label="Aktivni projekti" value={activeProjects} href={`${ELECTRO_APP_BASE}/projekti`} />
        <Tile label="Projekti u kašnjenju" value={lateProjects} href={`${ELECTRO_APP_BASE}/projekti`} alert />
        <Tile label="Moji otvoreni zadaci" value={myTasks} href={`${ELECTRO_APP_BASE}/zadaci`} />
        {isManager && <Tile label="Dokumenti za odobrenje" value={docsPending} href={`${ELECTRO_APP_BASE}/dokumenti`} alert />}
        {isManager && <Tile label="Kritični problemi" value={openCriticalIssues} href={`${ELECTRO_APP_BASE}/problemi`} alert />}
        {isManager && <Tile label="Potrošnja za potvrdu" value={pendingConsumption} href={`${ELECTRO_APP_BASE}/potrosnja`} alert />}
        {(isManager || hasRole(ctx, "ADMIN")) && <Tile label="Artikli ispod minimuma" value={lowStock} href={`${ELECTRO_APP_BASE}/materijali`} alert />}
      </div>

      {!isManager && (
        <div className={electroCardCls}>
          <h2 className="font-bold">Vaš rad</h2>
          <p className="mt-1 text-sm text-muted">
            Pregledajte svoje <Link href={`${ELECTRO_APP_BASE}/zadaci`} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">zadatke</Link>,
            prijavite <Link href={`${ELECTRO_APP_BASE}/potrosnja`} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">potrošnju materijala</Link> i
            dodajte <Link href={`${ELECTRO_APP_BASE}/fotografije`} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">fotografije radova</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
