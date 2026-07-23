import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { canManageProjects } from "@/lib/electro/project-access";
import { ElectroProjectForm } from "@/components/electro/projects/project-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroNewProjectPage() {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) redirect(`${ELECTRO_APP_BASE}/403`);

  const [investors, branches] = await Promise.all([
    db.electroInvestor.findMany({ where: { companyId: ctx.company.id, isArchived: false }, orderBy: { name: "asc" } }),
    db.electroBranch.findMany({ where: { companyId: ctx.company.id, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`${ELECTRO_APP_BASE}/projekti`} className="text-sm text-muted hover:text-foreground">← Projekti</Link>
      <div className={electroCardCls}>
        <h1 className="mb-6 text-xl font-bold">Novi projekt</h1>
        <ElectroProjectForm
          mode="create"
          investors={investors.map((i) => ({ id: i.id, name: i.name }))}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        />
      </div>
    </div>
  );
}
