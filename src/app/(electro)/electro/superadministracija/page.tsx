import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isElectroEnabled, ELECTRO_BASE, ELECTRO_SUPERADMIN_BASE } from "@/lib/electro/auth/session";
import { requireElectroSuperadmin } from "@/lib/electro/auth/guard";
import { effectiveSubscriptionStatus, trialDaysRemaining } from "@/lib/electro/subscription";
import { electroSuperadminLogout } from "@/server/actions/electro-auth";
import { ElectroCompanyActions } from "@/components/electro/superadmin/company-actions";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  TRIAL: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  PAST_DUE: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  SUSPENDED: "bg-red-500/15 text-red-700 dark:text-red-300",
  CANCELLED: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
  EXPIRED: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Čeka odobrenje",
  TRIAL: "Trial",
  ACTIVE: "Aktivna",
  PAST_DUE: "Dospjela uplata",
  SUSPENDED: "Suspendirana",
  CANCELLED: "Odbijena / otkazana",
  EXPIRED: "Trial istekao",
};

export default async function ElectroSuperadminDashboard() {
  if (!isElectroEnabled()) redirect(ELECTRO_BASE);
  const sa = await requireElectroSuperadmin();

  const [companies, plans] = await Promise.all([
    db.electroCompany.findMany({
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.electroSubscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const withStatus = companies
    .filter((c) => c.subscription)
    .map((c) => ({ ...c, status: effectiveSubscriptionStatus(c.subscription!) }));
  const pending = withStatus.filter((c) => c.status === "PENDING_APPROVAL");
  const planOptions = plans.map((p) => ({ key: p.key, name: p.name }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Superadministracija</h1>
          <p className="text-sm text-muted">Prijavljeni kao {sa.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`${ELECTRO_SUPERADMIN_BASE}/paketi`} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
            Paketi i limiti
          </Link>
          <Link href={`${ELECTRO_SUPERADMIN_BASE}/promjena-lozinke`} className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
            Promjena lozinke
          </Link>
          <form action={electroSuperadminLogout}>
            <button type="submit" className="rounded-lg border border-black/10 px-3 py-1.5 text-sm font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
              Odjava
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className={electroCardCls}>
          <p className="text-sm text-muted">Tvrtke ukupno</p>
          <p className="text-2xl font-black">{withStatus.length}</p>
        </div>
        <div className={electroCardCls}>
          <p className="text-sm text-muted">Čekaju odobrenje</p>
          <p className="text-2xl font-black">{pending.length}</p>
        </div>
        <div className={electroCardCls}>
          <p className="text-sm text-muted">Trial / aktivne</p>
          <p className="text-2xl font-black">{withStatus.filter((c) => c.status === "TRIAL" || c.status === "ACTIVE").length}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-bold">Tvrtke</h2>
        {withStatus.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Još nema registriranih tvrtki.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {withStatus.map((c) => {
              const sub = c.subscription!;
              const days = c.status === "TRIAL" ? trialDaysRemaining(sub.trialEndsAt) : null;
              return (
                <div key={c.id} className={`${electroCardCls} !p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">
                        {c.name}{" "}
                        <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[c.status]}`}>
                          {STATUS_LABEL[c.status]}{days !== null && ` · ${days} d`}
                        </span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        {[c.oib && `OIB ${c.oib}`, c.city, c.contactEmail].filter(Boolean).join(" · ")}
                      </p>
                      <p className="text-xs text-muted">
                        Paket: {sub.plan.name} · Korisnika: {c._count.users} · Zahtjev: {sub.requestedAt.toLocaleDateString("hr-HR")}
                        {sub.rejectionReason && ` · Razlog odbijanja: ${sub.rejectionReason}`}
                      </p>
                    </div>
                    <ElectroCompanyActions
                      companyId={c.id}
                      status={c.status}
                      plans={planOptions}
                      currentPlanKey={sub.plan.key}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
