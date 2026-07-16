import { db } from "@/lib/db";
import { requireElectroAdmin } from "@/lib/electro/auth/guard";
import { ElectroCompanyProfileForm } from "@/components/electro/settings/company-profile-form";
import { ElectroOrgUnits } from "@/components/electro/settings/org-units";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroSettingsPage() {
  const ctx = await requireElectroAdmin();

  const [branches, departments] = await Promise.all([
    db.electroBranch.findMany({
      where: { companyId: ctx.company.id },
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    }),
    db.electroDepartment.findMany({
      where: { companyId: ctx.company.id },
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Postavke tvrtke</h1>

      <section className={electroCardCls}>
        <h2 className="mb-4 font-bold">Profil tvrtke</h2>
        <ElectroCompanyProfileForm
          initial={{
            name: ctx.company.name,
            oib: ctx.company.oib ?? "",
            address: ctx.company.address ?? "",
            city: ctx.company.city ?? "",
            contactEmail: ctx.company.contactEmail ?? "",
            contactPhone: ctx.company.contactPhone ?? "",
          }}
        />
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-4 font-bold">Organizacijska struktura</h2>
        <ElectroOrgUnits
          branches={branches.map((b) => ({ id: b.id, name: b.name, city: b.city, isActive: b.isActive, memberCount: b._count.members }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name, isActive: d.isActive, memberCount: d._count.members }))}
        />
      </section>
    </div>
  );
}
