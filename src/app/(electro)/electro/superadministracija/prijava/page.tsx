import { redirect } from "next/navigation";
import { isElectroEnabled, ELECTRO_BASE, ELECTRO_SUPERADMIN_BASE } from "@/lib/electro/auth/session";
import { getElectroSuperadmin } from "@/lib/electro/auth/guard";
import { ElectroSaLoginForm } from "@/components/electro/auth/sa-login-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroSaLoginPage() {
  if (!isElectroEnabled()) redirect(ELECTRO_BASE);
  if (await getElectroSuperadmin()) redirect(ELECTRO_SUPERADMIN_BASE);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className={`w-full max-w-md ${electroCardCls}`}>
        <h1 className="text-xl font-bold">Superadministracija</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Pristup samo za globalne Varel administratore.</p>
        <ElectroSaLoginForm />
      </div>
    </main>
  );
}
