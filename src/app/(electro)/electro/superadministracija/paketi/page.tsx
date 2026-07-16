import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isElectroEnabled, ELECTRO_BASE, ELECTRO_SUPERADMIN_BASE } from "@/lib/electro/auth/session";
import { requireElectroSuperadmin } from "@/lib/electro/auth/guard";
import { ElectroPlanEditor } from "@/components/electro/superadmin/plan-editor";

export const dynamic = "force-dynamic";

export default async function ElectroPlansPage() {
  if (!isElectroEnabled()) redirect(ELECTRO_BASE);
  await requireElectroSuperadmin();

  const plans = await db.electroSubscriptionPlan.findMany({
    include: { limits: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href={ELECTRO_SUPERADMIN_BASE} className="text-sm text-muted hover:text-foreground">← Superadministracija</Link>
      <h1 className="mt-2 text-2xl font-black tracking-tight">Paketi i limiti</h1>
      <p className="mt-1 text-sm text-muted">
        Nazivi, cijene i limiti su podaci — mijenjaju se ovdje bez promjene koda. Prazan brojčani limit znači
        neograničeno. Promjene ne diraju postojeće tvrtke dok im se paket ponovno ne dodijeli.
      </p>
      <div className="mt-6 space-y-6">
        {plans.map((plan) => (
          <div key={plan.id}>
            <h2 className="mb-2 font-bold">
              {plan.name} <span className="text-xs font-normal text-muted">({plan.key})</span>
            </h2>
            <ElectroPlanEditor
              plan={{
                id: plan.id,
                name: plan.name,
                description: plan.description,
                priceMonthlyEur: plan.priceMonthlyEur?.toString() ?? null,
                trialDays: plan.trialDays,
                isActive: plan.isActive,
                limits: plan.limits.map((l) => ({ key: l.key, intValue: l.intValue, boolValue: l.boolValue })),
              }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
