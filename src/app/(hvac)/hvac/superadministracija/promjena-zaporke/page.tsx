import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { requireSuperadminForPasswordChange, SA_BASE } from "@/lib/hvac/superadmin";
import { SuperadminPasswordForm } from "@/components/hvac/superadmin/sa-forms";

export const dynamic = "force-dynamic";

export default async function SuperadminPasswordChangePage() {
  const sa = await requireSuperadminForPasswordChange();
  // Already changed → nothing to do here.
  if (!sa.mustChangePassword) redirect(SA_BASE);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 text-white"><KeyRound size={22} /></span>
          <h1 className="text-lg font-bold tracking-tight">Obavezna promjena zaporke</h1>
          <p className="text-xs text-muted">
            Prije prvog pristupa superadministraciji morate postaviti novu zaporku. Početna zaporka nakon toga više neće vrijediti.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SuperadminPasswordForm />
        </div>
      </div>
    </div>
  );
}
