import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroAdmin } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE, type ElectroRoleKey } from "@/lib/electro/constants";
import { ElectroEmployeeForm } from "@/components/electro/team/employee-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroEditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireElectroAdmin();
  const { id } = await params;

  const [user, branches, departments] = await Promise.all([
    db.electroUser.findFirst({
      where: { id, companyId: ctx.company.id },
      include: { roles: { include: { role: true } }, branches: true, departments: true },
    }),
    db.electroBranch.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" } }),
    db.electroDepartment.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!user || user.status === "ARCHIVED") notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`${ELECTRO_APP_BASE}/zaposlenici`} className="text-sm text-muted hover:text-foreground">← Zaposlenici</Link>
      <div className={electroCardCls}>
        <h1 className="mb-6 text-xl font-bold">Uredi zaposlenika</h1>
        <ElectroEmployeeForm
          mode="edit"
          userId={user.id}
          initial={{
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone ?? "",
            jobTitle: user.jobTitle ?? "",
            roles: user.roles.map((r) => r.role.key as ElectroRoleKey),
            branchIds: user.branches.map((b) => b.branchId),
            departmentIds: user.departments.map((d) => d.departmentId),
          }}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
        />
      </div>
    </div>
  );
}
