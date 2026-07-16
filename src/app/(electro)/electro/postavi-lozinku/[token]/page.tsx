import type { Metadata } from "next";
import Link from "next/link";
import { isElectroEnabled, ELECTRO_BASE } from "@/lib/electro/auth/session";
import { findLiveInvite } from "@/lib/electro/invites";
import { ElectroSetPasswordForm } from "@/components/electro/auth/set-password-form";
import { electroCardCls, electroErrorCls } from "@/components/electro/ui";

export const metadata: Metadata = { title: "Postavljanje lozinke — Varel Electric", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ElectroSetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = isElectroEnabled() ? await findLiveInvite(token) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-secondary p-6">
      <div className={`w-full max-w-md ${electroCardCls}`}>
        <h1 className="text-xl font-bold">Postavljanje lozinke</h1>
        {invite ? (
          <>
            <p className="mb-6 mt-1 text-sm text-muted">
              Dobrodošli u Varel Electric, {invite.user.firstName}! Postavite lozinku za tvrtku{" "}
              <strong>{invite.company.name}</strong>.
            </p>
            <ElectroSetPasswordForm token={token} />
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <p className={electroErrorCls}>
              Pozivnica nije važeća, iskorištena je ili je istekla.
            </p>
            <p className="text-sm text-muted">
              Zatražite novu pozivnicu od administratora svoje tvrtke ili se{" "}
              <Link href={`${ELECTRO_BASE}/prijava`} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">prijavite</Link>{" "}
              ako ste lozinku već postavili.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
