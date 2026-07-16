import Link from "next/link";
import { TrendingUp, FileText, Wallet, Bell, ClipboardCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext, FINANCIAL_ROLES } from "@/lib/hvac/tenant";
import { formatEur } from "@/lib/hvac/format";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function startOfMonth() { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
function startOfYear() { const d = new Date(); d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d; }

export default async function ReportsPage() {
  const ctx = await requireTenantContext();
  const t = ctx.tenantId;
  const canSeeMoney = FINANCIAL_ROLES.includes(ctx.role);
  const som = startOfMonth();
  const soy = startOfYear();

  const [
    payMonth, payYear, issuedMonth, unpaidInvoices,
    woCompletedMonth, woOpen, quotesTotal, quotesAccepted, remindersReady,
    topServices,
  ] = await Promise.all([
    db.hvacPayment.aggregate({ where: { tenantId: t, paidAt: { gte: som } }, _sum: { amountEur: true } }),
    db.hvacPayment.aggregate({ where: { tenantId: t, paidAt: { gte: soy } }, _sum: { amountEur: true } }),
    db.hvacInvoice.aggregate({ where: { tenantId: t, issueDate: { gte: som }, status: { not: "DRAFT" } }, _sum: { totalEur: true }, _count: true }),
    db.hvacInvoice.findMany({ where: { tenantId: t, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } }, select: { totalEur: true, payments: { select: { amountEur: true } } } }),
    db.hvacWorkOrder.count({ where: { tenantId: t, deletedAt: null, status: { in: ["COMPLETED", "SENT"] }, completedAt: { gte: som } } }),
    db.hvacWorkOrder.count({ where: { tenantId: t, deletedAt: null, status: { notIn: ["COMPLETED", "SENT", "CANCELLED"] } } }),
    db.hvacQuotation.count({ where: { tenantId: t, status: { in: ["SENT", "VIEWED", "ACCEPTED", "REJECTED", "CONVERTED_WORKORDER", "CONVERTED_INVOICE"] } } }),
    db.hvacQuotation.count({ where: { tenantId: t, status: { in: ["ACCEPTED", "CONVERTED_WORKORDER", "CONVERTED_INVOICE"] } } }),
    db.hvacServiceReminder.count({ where: { tenantId: t, status: "READY" } }),
    db.hvacWorkOrder.groupBy({ by: ["serviceId"], where: { tenantId: t, deletedAt: null, serviceId: { not: null }, createdAt: { gte: soy } }, _count: { _all: true } }),
  ]);

  const outstanding = unpaidInvoices.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amountEur), 0);
    return sum + Math.max(0, Number(inv.totalEur) - paid);
  }, 0);
  const acceptRate = quotesTotal > 0 ? Math.round((quotesAccepted / quotesTotal) * 100) : 0;

  // Resolve top-service names.
  const svcIds = topServices.map((s) => s.serviceId).filter((x): x is string => Boolean(x));
  const services = svcIds.length ? await db.hvacService.findMany({ where: { tenantId: t, id: { in: svcIds } }, select: { id: true, name: true } }) : [];
  const topRanked = topServices
    .map((s) => ({ name: services.find((x) => x.id === s.serviceId)?.name ?? "—", count: s._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const topMax = Math.max(1, ...topRanked.map((s) => s.count));

  return (
    <div>
      <PageHeader title="Izvještaji" />

      {canSeeMoney && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Wallet size={16} />} label="Naplaćeno ovaj mjesec" value={formatEur(Number(payMonth._sum.amountEur ?? 0))} tone="emerald" />
          <Stat icon={<TrendingUp size={16} />} label="Naplaćeno ove godine" value={formatEur(Number(payYear._sum.amountEur ?? 0))} />
          <Stat icon={<FileText size={16} />} label="Izdano ovaj mjesec" value={formatEur(Number(issuedMonth._sum.totalEur ?? 0))} sub={`${issuedMonth._count} računa`} />
          <Stat icon={<Wallet size={16} />} label="Otvorena potraživanja" value={formatEur(outstanding)} tone={outstanding > 0 ? "amber" : undefined} />
        </section>
      )}

      <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<ClipboardCheck size={16} />} label="Naloga završeno (mjesec)" value={String(woCompletedMonth)} />
        <Stat icon={<ClipboardCheck size={16} />} label="Otvoreni nalozi" value={String(woOpen)} />
        <Stat icon={<FileText size={16} />} label="Prihvaćene ponude" value={`${acceptRate}%`} sub={`${quotesAccepted}/${quotesTotal}`} />
        <Stat icon={<Bell size={16} />} label="Podsjetnici za kontakt" value={String(remindersReady)} tone={remindersReady > 0 ? "amber" : undefined} />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Najčešće usluge (ova godina)</h2>
        {topRanked.length === 0 ? (
          <p className="text-sm text-muted">Još nema dovoljno podataka.</p>
        ) : (
          <div className="space-y-2">
            {topRanked.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <div className="w-40 shrink-0 truncate text-sm">{s.name}</div>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-background-secondary">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${(s.count / topMax) * 100}%` }} />
                </div>
                <div className="w-8 text-right text-sm tabular-nums text-muted">{s.count}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/hvac-b2b/racuni" className="rounded-lg border border-border px-3 py-1.5 hover:border-sky-500/50">Računi →</Link>
        <Link href="/hvac-b2b/radni-nalozi" className="rounded-lg border border-border px-3 py-1.5 hover:border-sky-500/50">Radni nalozi →</Link>
        <Link href="/hvac-b2b/servisni-podsjetnici" className="rounded-lg border border-border px-3 py-1.5 hover:border-sky-500/50">Podsjetnici →</Link>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "emerald" | "amber" }) {
  const valueCls = tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted">{icon} {label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${valueCls}`}>{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
