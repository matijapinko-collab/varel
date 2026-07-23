import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroAdmin } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { ElectroEmployeeForm } from "@/components/electro/team/employee-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroNewEmployeePage() {
  const ctx = await requireElectroAdmin();
  const [branches, departments] = await Promise.all([
    db.electroBranch.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" } }),
    db.electroDepartment.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`${ELECTRO_APP_BASE}/zaposlenici`} className="text-sm text-muted hover:text-foreground">← Zaposlenici</Link>
      <div className={electroCardCls}>
        <h1 className="mb-6 text-xl font-bold">Novi zaposlenik</h1>
        <ElectroEmployeeForm
          mode="create"
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </div>
  );
}
