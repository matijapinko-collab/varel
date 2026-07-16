import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysLogoutAllDevices } from "@/server/actions/bisneys-auth";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BisneysChangePasswordForm } from "@/components/bisneyscrm/auth/change-password-form";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = { SUPERADMIN: "Superadministrator", ADMIN: "Administrator" };

export default async function AccountSettings() {
  const user = await requireBisneysUser();

  return (
    <div className="max-w-2xl">
      <BisneysPageHeader title="Postavke računa" description="Zaporka i sigurnost sesija." />

      <section className="mb-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">Podaci računa</h2>
        <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-muted">Korisničko ime</dt><dd className="font-medium">{user.username}</dd>
          <dt className="text-muted">Email</dt><dd className="font-medium">{user.email}</dd>
          <dt className="text-muted">Uloga</dt><dd className="font-medium">{ROLE_LABELS[user.role] ?? user.role}</dd>
        </dl>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">Promjena zaporke</h2>
        <BisneysChangePasswordForm />
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Sigurnost sesija</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Odjavite sve ostale uređaje. Trenutni uređaj ostaje prijavljen.</p>
        <form action={bisneysLogoutAllDevices}>
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-indigo-500/50">
            Odjavi me sa svih drugih uređaja
          </button>
        </form>
      </section>
    </div>
  );
}
