import Link from "next/link";
import { redirect } from "next/navigation";
import { isElectroEnabled, ELECTRO_BASE, ELECTRO_SUPERADMIN_BASE } from "@/lib/electro/auth/session";
import { requireElectroSuperadmin } from "@/lib/electro/auth/guard";
import { ElectroSaChangePasswordForm } from "@/components/electro/auth/sa-change-password-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroSaChangePasswordPage() {
  if (!isElectroEnabled()) redirect(ELECTRO_BASE);
  await requireElectroSuperadmin();

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <Link href={ELECTRO_SUPERADMIN_BASE} className="text-sm text-muted hover:text-foreground">← Superadministracija</Link>
      <div className={`mt-3 ${electroCardCls}`}>
        <h1 className="text-xl font-bold">Promjena lozinke</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Preporučeno nakon prve prijave s privremenom lozinkom.</p>
        <ElectroSaChangePasswordForm />
      </div>
    </main>
  );
}
