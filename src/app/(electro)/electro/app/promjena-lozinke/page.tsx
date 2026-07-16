import { requireElectroContextAnyStatus } from "@/lib/electro/auth/guard";
import { ElectroChangePasswordForm } from "@/components/electro/auth/change-password-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroChangePasswordPage() {
  const ctx = await requireElectroContextAnyStatus();

  return (
    <div className={`mx-auto max-w-md ${electroCardCls}`}>
      <h1 className="text-xl font-bold">Promjena lozinke</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        {ctx.user.mustChangePassword
          ? "Prije nastavka postavite novu lozinku."
          : "Promjena lozinke odjavljuje sve ostale uređaje."}
      </p>
      <ElectroChangePasswordForm />
    </div>
  );
}
