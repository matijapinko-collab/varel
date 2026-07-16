import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { userUsage, storageUsage } from "@/lib/hvac/limits";
import { PLAN_CONFIG, TENANT_STATUS_LABELS, EXTRA_USER_EUR } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null | undefined) {
  return d ? new Date(d).toLocaleDateString("hr-HR", { year: "numeric", month: "long", day: "numeric" }) : "—";
}
function mb(bytes: number) {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export default async function SubscriptionPage() {
  const ctx = await requireTenantContext();
  const plan = PLAN_CONFIG[ctx.tenant.plan];
  const [sub, users, storage] = await Promise.all([
    db.hvacSubscription.findUnique({ where: { tenantId: ctx.tenantId } }),
    userUsage(ctx.tenantId, ctx.tenant.plan),
    storageUsage(ctx.tenantId, ctx.tenant.plan),
  ]);

  const rows: { k: string; v: string }[] = [
    { k: "Paket", v: plan.name },
    { k: "Mjesečna cijena", v: `${formatEur(sub ? Number(sub.monthlyPriceEur) : plan.monthlyPriceEur)} (bez PDV-a)` },
    { k: "Ugovorna obveza", v: "Bez dugoročnog ugovora — plaćanje mjesečno" },
    { k: "Status", v: TENANT_STATUS_LABELS[ctx.tenant.status] ?? ctx.tenant.status },
    { k: "Probno razdoblje do", v: fmtDate(sub?.trialEndsAt) },
    { k: "Početak pretplate", v: fmtDate(sub?.startDate) },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Pretplata" />
      <Link href="/hvac-b2b/postavke" className="text-sm text-muted hover:text-foreground">← Postavke</Link>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <dl className="divide-y divide-border text-sm">
          {rows.map((r) => (
            <div key={r.k} className="flex justify-between gap-3 py-2.5">
              <dt className="text-muted">{r.k}</dt>
              <dd className="text-right font-medium">{r.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Korisnici</h2>
          <p className="mt-1 text-sm text-muted">
            Aktivnih: <span className="font-semibold text-foreground">{users.active}</span> / {users.included} uključeno u paket.
          </p>
          {users.overLimit && (
            <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">
              {users.additional} dodatnih korisnika · projekcija {formatEur(users.projectedExtraEur)} mjesečno ({formatEur(EXTRA_USER_EUR)} po korisniku). Dodatne korisnike odobrava Varel podrška.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Majstori bez korisničkog računa ne troše mjesto u paketu.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Pohrana</h2>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-foreground">{mb(storage.usedBytes)}</span> od {storage.limitGb} GB
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div className={`h-full rounded-full ${storage.percent > 90 ? "bg-red-500" : "bg-gradient-to-r from-sky-500 to-cyan-400"}`} style={{ width: `${Math.max(2, storage.percent)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted">{storage.percent}% iskorišteno</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">
        Za promjenu paketa ili statusa pretplate javite se Varel podršci. Sve cijene navedene su bez PDV-a.
      </p>
    </div>
  );
}
