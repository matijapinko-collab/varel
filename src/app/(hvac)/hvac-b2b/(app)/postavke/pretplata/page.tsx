import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { technicianUsage } from "@/lib/hvac/limits";
import { PLAN_CONFIG, CONTRACT_TERM_LABELS, TENANT_STATUS_LABELS, EXTRA_TECHNICIAN_EUR } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined) {
  return d ? new Date(d).toLocaleDateString("hr-HR", { year: "numeric", month: "long", day: "numeric" }) : "—";
}

export default async function SubscriptionPage() {
  const ctx = await requireTenantContext();
  const sub = await db.hvacSubscription.findUnique({ where: { tenantId: ctx.tenantId } });
  const usage = await technicianUsage(ctx.tenantId, ctx.tenant.plan);

  const rows: { k: string; v: string }[] = [
    { k: "Paket", v: PLAN_CONFIG[ctx.tenant.plan].name },
    { k: "Trajanje ugovora", v: sub ? CONTRACT_TERM_LABELS[sub.term] : "—" },
    { k: "Mjesečna cijena", v: sub ? `${formatEur(Number(sub.monthlyPriceEur))} (bez PDV-a)` : "—" },
    { k: "Status", v: TENANT_STATUS_LABELS[ctx.tenant.status] ?? ctx.tenant.status },
    { k: "Probno razdoblje do", v: fmtDate(sub?.trialEndsAt) },
    { k: "Početak pretplate", v: fmtDate(sub?.startDate) },
    { k: "Kraj pretplate", v: fmtDate(sub?.endDate) },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Pretplata" />
      <Link href="/hvac-b2b/postavke" className="text-sm text-muted hover:text-foreground">← Postavke</Link>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <dl className="divide-y divide-border text-sm">
          {rows.map((r) => (
            <div key={r.k} className="flex justify-between py-2.5">
              <dt className="text-muted">{r.k}</dt>
              <dd className="font-medium">{r.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Majstori</h2>
        <p className="mt-1 text-sm text-muted">
          Aktivnih: <span className="font-semibold text-foreground">{usage.active}</span> / {usage.included} uključeno u paket.
        </p>
        {usage.overLimit && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-sm text-amber-700 dark:text-amber-300">
            {usage.additional} dodatnih majstora · projekcija {formatEur(usage.projectedExtraEur)} mjesečno ({formatEur(EXTRA_TECHNICIAN_EUR)} po majstoru). Dodatne majstore odobrava Varel podrška.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-muted">
        Za promjenu paketa, trajanja ugovora ili statusa pretplate javite se Varel podršci. Sve cijene navedene su bez PDV-a.
      </p>
    </div>
  );
}
