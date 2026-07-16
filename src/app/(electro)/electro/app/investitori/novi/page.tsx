import Link from "next/link";
import { redirect } from "next/navigation";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { canManageProjects } from "@/lib/electro/project-access";
import { ElectroInvestorForm } from "@/components/electro/investors/investor-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroNewInvestorPage() {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) redirect(`${ELECTRO_APP_BASE}/403`);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`${ELECTRO_APP_BASE}/investitori`} className="text-sm text-muted hover:text-foreground">← Investitori</Link>
      <div className={electroCardCls}>
        <h1 className="mb-6 text-xl font-bold">Novi investitor</h1>
        <ElectroInvestorForm mode="create" />
      </div>
    </div>
  );
}
