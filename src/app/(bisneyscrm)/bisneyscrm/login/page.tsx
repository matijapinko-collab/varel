import { redirect } from "next/navigation";
import { isBisneysEnabled, BISNEYS_BASE } from "@/lib/bisneyscrm/auth/session";
import { getBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysAuthShell } from "@/components/bisneyscrm/auth/auth-shell";
import { BisneysLoginForm } from "@/components/bisneyscrm/auth/login-form";

export const dynamic = "force-dynamic";

export default async function BisneysLoginPage() {
  if (!isBisneysEnabled()) redirect(BISNEYS_BASE);

  const user = await getBisneysUser();
  if (user) redirect(user.mustChangePassword ? `${BISNEYS_BASE}/change-password` : `${BISNEYS_BASE}/dashboard`);

  return (
    <BisneysAuthShell title="Prijava" subtitle="Prijavite se u interni Bisneys CRM.">
      <BisneysLoginForm />
    </BisneysAuthShell>
  );
}
