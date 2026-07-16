import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireSuperadmin } from "@/lib/hvac/superadmin";
import { PLAN_CONFIG, TENANT_STATUS_LABELS } from "@/lib/hvac/b2b-config";
import { formatEur } from "@/lib/hvac/format";
import { setTenantStatus, setTenantPlan, saveTenantBillingNotes } from "@/server/actions/hvac-superadmin-tenants";
import type { HvacPlan, HvacTenantStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: HvacTenantStatus[] = ["TRIAL", "PENDING_ACTIVATION", "ACTIVE", "OVERDUE", "SUSPENDED", "CANCELLED"];

function mb(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(1)} MB`; }

export default async function SuperadminTenantPage(props: PageProps<"/hvac/superadministracija/tvrtke/[tenantId]">) {
  await requireSuperadmin();
  const { tenantId } = await props.params;

  const tenant = await db.hvacTenant.findFirst({
    where: { id: tenantId },
    include: {
      subscription: true,
      settings: true,
      members: { include: { user: { select: { name: true, email: true, lastLoginAt: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!tenant) notFound();

  const [activeUsers, storage, woCount, invoiceCount, customerCount] = await Promise.all([
    db.hvacTenantUser.count({ where: { tenantId, isActive: true } }),
    db.hvacFileAsset.aggregate({ where: { tenantId }, _sum: { size: true } }),
    db.hvacWorkOrder.count({ where: { tenantId, deletedAt: null } }),
    db.hvacInvoice.count({ where: { tenantId } }),
    db.hvacCustomer.count({ where: { tenantId } }),
  ]);
  const cfg = PLAN_CONFIG[tenant.plan];
  const owner = tenant.members.find((m) => m.role === "OWNER");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/hvac/superadministracija" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft size={15} /> Sve tvrtke</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">{tenant.name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tenant.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600" : tenant.status === "SUSPENDED" ? "bg-red-500/10 text-red-600" : "bg-sky-500/10 text-sky-600"}`}>
          {TENANT_STATUS_LABELS[tenant.status] ?? tenant.status}
        </span>
        <span className="text-sm text-muted">/{tenant.slug}</span>
      </div>

      {/* Facts */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Card title="Podaci">
          <Row k="OIB" v={tenant.oib ?? "—"} />
          <Row k="Pravni oblik" v={tenant.legalForm ?? "—"} />
          <Row k="Grad" v={[tenant.postalCode, tenant.city].filter(Boolean).join(" ") || "—"} />
          <Row k="E-mail" v={tenant.email ?? "—"} />
          <Row k="Telefon" v={tenant.phone ?? "—"} />
          <Row k="U sustavu PDV-a" v={tenant.vatRegistered ? "Da" : "Ne"} />
          <Row k="Kreirano" v={tenant.createdAt.toISOString().slice(0, 10)} />
        </Card>
        <Card title="Vlasnik i korištenje">
          <Row k="Vlasnik" v={owner ? `${owner.user.name ?? "—"} (${owner.user.email})` : "—"} />
          <Row k="Zadnja prijava" v={owner?.user.lastLoginAt ? owner.user.lastLoginAt.toISOString().slice(0, 10) : "—"} />
          <Row k="Korisnici" v={`${activeUsers} / ${cfg.includedUsers} uklj.`} />
          <Row k="Pohrana" v={`${mb(storage._sum.size ?? 0)} / ${cfg.storageGb} GB`} />
          <Row k="Klijenti" v={String(customerCount)} />
          <Row k="Radni nalozi" v={String(woCount)} />
          <Row k="Računi" v={String(invoiceCount)} />
        </Card>
      </div>

      {/* Subscription + plan */}
      <Card title="Pretplata" className="mt-4">
        <Row k="Paket" v={cfg.name} />
        <Row k="Cijena" v={`${formatEur(Number(tenant.subscription?.monthlyPriceEur ?? cfg.monthlyPriceEur))} / mj.`} />
        <Row k="Probni period do" v={tenant.subscription?.trialEndsAt ? tenant.subscription.trialEndsAt.toISOString().slice(0, 10) : "—"} />
        <Row k="Onboarding" v={tenant.onboardingCompleted ? "Dovršen" : `Korak ${tenant.onboardingStep}/7`} />

        <form action={setTenantPlan.bind(null, tenant.id)} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Promijeni paket</span>
            <select name="plan" defaultValue={tenant.plan} className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-sky-500">
              {(Object.keys(PLAN_CONFIG) as HvacPlan[]).map((p) => <option key={p} value={p}>{PLAN_CONFIG[p].name} — {formatEur(PLAN_CONFIG[p].monthlyPriceEur)}/mj.</option>)}
            </select>
          </label>
          <button className="h-10 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 text-sm font-semibold text-white hover:opacity-90">Spremi paket</button>
        </form>
      </Card>

      {/* Status control */}
      <Card title="Status tvrtke" className="mt-4">
        <p className="text-sm text-muted">Suspendirana tvrtka gubi pristup aplikaciji (prijava se odbija). Radnja se bilježi u revizijski zapis.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.filter((s) => s !== tenant.status).map((s) => (
            <form key={s} action={setTenantStatus.bind(null, tenant.id)}>
              <input type="hidden" name="status" value={s} />
              <button className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${s === "SUSPENDED" || s === "CANCELLED" ? "border-red-400/40 text-red-600 hover:bg-red-500/5" : "border-border hover:border-sky-500/50"}`}>
                → {TENANT_STATUS_LABELS[s] ?? s}
              </button>
            </form>
          ))}
        </div>
      </Card>

      {/* Billing notes */}
      <Card title="Bilješke o naplati" className="mt-4">
        <form action={saveTenantBillingNotes.bind(null, tenant.id)}>
          <textarea name="billingNotes" rows={3} defaultValue={tenant.subscription?.billingNotes ?? ""} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-sky-500" />
          <button className="mt-2 rounded-lg border border-border px-4 py-1.5 text-sm font-semibold hover:border-sky-500/50">Spremi bilješke</button>
        </form>
      </Card>

      {/* Members */}
      <Card title={`Korisnici (${tenant.members.length})`} className="mt-4">
        <ul className="divide-y divide-border text-sm">
          {tenant.members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <span>{m.user.name ?? "—"} <span className="text-muted">· {m.user.email}</span></span>
              <span className="text-xs text-muted">{m.role}{m.isActive ? "" : " · neaktivan"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 py-1 text-sm"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>;
}
