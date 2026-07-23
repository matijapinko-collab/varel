import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isElectroEnabled, ELECTRO_BASE } from "@/lib/electro/auth/session";
import { requireElectroContextAnyStatus } from "@/lib/electro/auth/guard";
import { ELECTRO_ROLE_NAMES } from "@/lib/electro/constants";
import { effectiveSubscriptionStatus } from "@/lib/electro/subscription";
import { electroLogout } from "@/server/actions/electro-auth";
import { visibleNav } from "@/components/electro/layout/nav";
import { ElectroSidebar, type SidebarBadges } from "@/components/electro/layout/sidebar";

/** The company-admin console is never indexed (brief §39). */
export const metadata: Metadata = {
  title: "Varel Electro — administracija",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  TRIAL: "Trial",
  ACTIVE: "Aktivno",
  PENDING_APPROVAL: "Čeka odobrenje",
  PAST_DUE: "Dospjelo",
  SUSPENDED: "Suspendirano",
  EXPIRED: "Isteklo",
  CANCELLED: "Otkazano",
};

export default async function ElectroAdminLayout({ children }: { children: React.ReactNode }) {
  if (!isElectroEnabled()) redirect(ELECTRO_BASE);
  const ctx = await requireElectroContextAnyStatus();
  const nav = visibleNav(ctx.roles);
  const companyId = ctx.company.id;

  // Sidebar badges (brief §6) + superadmin detection by matching email to an
  // active global superadmin (brief §4 — mpinko is both).
  const [lateTasks, docsPending, criticalIssues, pendingConsumption, lowItems, saMatch] = await Promise.all([
    db.electroTask.count({ where: { companyId, dueDate: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    db.electroDocument.count({ where: { companyId, status: "UNDER_REVIEW" } }),
    db.electroIssue.count({ where: { companyId, priority: "CRITICAL", status: { notIn: ["CLOSED", "VERIFIED", "REJECTED"] } } }),
    db.electroMaterialConsumption.count({ where: { companyId, status: "PENDING_CONFIRMATION" } }),
    db.electroItem.findMany({ where: { companyId, isActive: true, minStock: { not: null } }, select: { id: true, minStock: true } }),
    db.electroSuperadmin.findFirst({ where: { email: ctx.user.email.toLowerCase(), isActive: true }, select: { id: true } }),
  ]);

  let lowStock = 0;
  if (lowItems.length) {
    const balances = await db.electroStockMovement.groupBy({ by: ["itemId"], where: { companyId }, _sum: { qtyDelta: true } });
    const bal = new Map(balances.map((b) => [b.itemId, Number(b._sum.qtyDelta ?? 0)]));
    lowStock = lowItems.filter((i) => (bal.get(i.id) ?? 0) < Number(i.minStock)).length;
  }

  const badges: SidebarBadges = { lateTasks, docsPending, criticalIssues, pendingConsumption, lowStock };
  const isSuperadmin = Boolean(saMatch);

  // Company switcher list (superadmin only, backend-verified).
  const switcherCompanies = isSuperadmin
    ? (await db.electroCompany.findMany({
        where: { isArchived: false },
        include: { subscription: true },
        orderBy: { name: "asc" },
        take: 50,
      })).map((c) => ({
        id: c.id,
        name: c.name,
        plan: "",
        status: c.subscription ? STATUS_LABELS[effectiveSubscriptionStatus(c.subscription)] ?? "" : "",
      }))
    : [];

  return (
    <div className="flex min-h-screen bg-background-secondary">
      <ElectroSidebar
        nav={nav}
        badges={badges}
        company={ctx.company.name}
        companyPlan={ctx.subscription.plan.name}
        companyStatus={STATUS_LABELS[ctx.status] ?? ctx.status}
        userName={`${ctx.user.firstName} ${ctx.user.lastName}`}
        userRole={ctx.roles.map((r) => ELECTRO_ROLE_NAMES[r]).join(", ") || "Član tima"}
        isSuperadmin={isSuperadmin}
        switcherCompanies={switcherCompanies}
        logoutAction={electroLogout}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
