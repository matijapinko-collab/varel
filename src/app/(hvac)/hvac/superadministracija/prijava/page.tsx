import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getSuperadmin, SA_BASE } from "@/lib/hvac/superadmin";
import { SuperadminLoginForm } from "@/components/hvac/superadmin/sa-forms";

export const dynamic = "force-dynamic";

export default async function SuperadminLoginPage() {
  const sa = await getSuperadmin();
  if (sa) redirect(sa.mustChangePassword ? `${SA_BASE}/promjena-zaporke` : SA_BASE);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white"><ShieldCheck size={22} /></span>
          <h1 className="text-lg font-bold tracking-tight">Varel HVAC — superadministracija</h1>
          <p className="text-xs text-muted">Pristup samo za ovlaštene Varel administratore.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <SuperadminLoginForm />
        </div>
      </div>
    </div>
  );
}
