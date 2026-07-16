import { redirect } from "next/navigation";
import { isBisneysEnabled, BISNEYS_BASE } from "@/lib/bisneyscrm/auth/session";
import { requireBisneysUserForPasswordChange } from "@/lib/bisneyscrm/auth/guard";
import { BisneysAuthShell } from "@/components/bisneyscrm/auth/auth-shell";
import { BisneysChangePasswordForm } from "@/components/bisneyscrm/auth/change-password-form";

export const dynamic = "force-dynamic";

/** Forced first-login password change for the admin account (brief §8). */
export default async function BisneysChangePasswordPage() {
  if (!isBisneysEnabled()) redirect(BISNEYS_BASE);
  await requireBisneysUserForPasswordChange();

  return (
    <BisneysAuthShell title="Promjena zaporke" subtitle="Prije nastavka postavite novu zaporku.">
      <BisneysChangePasswordForm />
    </BisneysAuthShell>
  );
}
