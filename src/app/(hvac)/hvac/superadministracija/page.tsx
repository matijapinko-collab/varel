import { LogOut, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireSuperadmin } from "@/lib/hvac/superadmin";
import { superadminLogout } from "@/server/actions/hvac-superadmin";
import { PLAN_CONFIG, TENANT_STATUS_LABELS } from "@/lib/hvac/b2b-config";
import { AdminTable } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function startOfMonth() { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
function mb(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export default async function SuperadminDashboard() {
  const sa = await requireSuperadmin();

  const [tenants, totalUsers, totalWO, woThisMonth, storage, failedEmails, failedJobs, securityEvents] = await Promise.all([
    db.hvacTenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        subscription: true,
        _count: { select: { members: true } },
        members: { where: { role: "OWNER" }, take: 1, include: { user: { select: { name: true, email: true } } } },
      },
    }),
    db.hvacUser.count({ where: { deletedAt: null } }),
    db.hvacWorkOrder.count({ where: { deletedAt: null } }),
    db.hvacWorkOrder.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth() } } }),
    db.hvacFileAsset.aggregate({ _sum: { size: true } }),
    db.hvacEmailLog.count({ where: { status: { not: "sent" } } }),
    db.hvacImportJob.count({ where: { status: "failed" } }),
    db.hvacAuditLog.findMany({
      where: { entityType: "SUPERADMIN", action: { in: ["superadmin_login_failed", "superadmin_login_rate_limited"] } },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
  ]);

  const byStatus = (s: string) => tenants.filter((t) => t.status === s).length;
  const byPlan = (p: keyof typeof PLAN_CONFIG) => tenants.filter((t) => t.plan === p).length;

  const stats = [
    { label: "Ukupno tvrtki", value: tenants.length },
    { label: "Aktivne", value: byStatus("ACTIVE") },
    { label: "Probne", value: byStatus("TRIAL") },
    { label: "Suspendirane", value: byStatus("SUSPENDED") },
    { label: "Korisnici", value: totalUsers },
    { label: "Radni nalozi", value: totalWO },
    { label: "Nalozi ovaj mjesec", value: woThisMonth },
    { label: "Zauzeće pohrane", value: mb(storage._sum.size ?? 0) },
    { label: "Neuspjeli e-mailovi", value: failedEmails },
    { label: "Neuspjeli poslovi", value: failedJobs },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 text-white"><ShieldCheck size={18} /></span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Varel HVAC — superadministracija</h1>
            <p className="text-xs text-muted">Prijavljeni ste kao {sa.username}</p>
          </div>
        </div>
        <form action={superadminLogout}>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm hover:border-red-400 hover:text-red-500">
            <LogOut size={15} /> Odjava
          </button>
        </form>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold tabular-nums">{s.value}</div>
            <div className="mt-1 text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {(Object.keys(PLAN_CONFIG) as (keyof typeof PLAN_CONFIG)[]).map((p) => (
          <div key={p} className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-semibold">{PLAN_CONFIG[p].name}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{byPlan(p)}</div>
            <div className="text-xs text-muted">tvrtki na paketu</div>
          </div>
        ))}
      </section>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">HVAC tvrtke</h2>
      <div className="mt-3">
        <AdminTable headers={["Tvrtka", "OIB", "Vlasnik", "Paket", "Korisnici", "Status", "Onboarding", "Kreirano"]} empty={tenants.length === 0}>
          {tenants.map((t) => (
            <tr key={t.id}>
              <td className="px-3 py-2.5 font-medium"><a href={`/hvac/superadministracija/tvrtke/${t.id}`} className="hover:text-sky-600 dark:hover:text-sky-300">{t.name}</a><div className="text-xs text-muted">/{t.slug}</div></td>
              <td className="px-3 py-2.5 text-sm text-muted">{t.oib ?? "—"}</td>
              <td className="px-3 py-2.5 text-sm text-muted">{t.members[0]?.user.email ?? "—"}</td>
              <td className="px-3 py-2.5 text-sm">{PLAN_CONFIG[t.plan].name.replace("Varel ", "")}</td>
              <td className="px-3 py-2.5 text-sm tabular-nums">{t._count.members}</td>
              <td className="px-3 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" : t.status === "SUSPENDED" ? "bg-red-500/10 text-red-600" : "bg-sky-500/10 text-sky-600"}`}>
                  {TENANT_STATUS_LABELS[t.status] ?? t.status}
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs text-muted">{t.onboardingCompleted ? "Dovršen" : `Korak ${t.onboardingStep}/7`}</td>
              <td className="px-3 py-2.5 text-xs text-muted">{t.createdAt.toISOString().slice(0, 10)}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Sigurnosni događaji</h2>
      <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm">
        {securityEvents.length === 0 ? (
          <p className="text-muted">Nema nedavnih neuspjelih prijava.</p>
        ) : (
          <ul className="space-y-1.5">
            {securityEvents.map((e) => (
              <li key={e.id} className="flex justify-between gap-3 text-muted">
                <span>{e.action === "superadmin_login_rate_limited" ? "Ograničenje pokušaja prijave" : "Neuspjela prijava"}</span>
                <span className="text-xs">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-8 text-xs text-muted">
        Ovo sučelje odvojeno je od <code>/administracija</code> (uređivanje javnog sadržaja varel.io). Svaka radnja u superadministraciji bilježi se u revizijski zapis.
      </p>
    </div>
  );
}
