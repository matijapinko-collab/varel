import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isElectroEnabled, ELECTRO_BASE, ELECTRO_APP_BASE } from "@/lib/electro/auth/session";
import { getElectroContext } from "@/lib/electro/auth/guard";
import { ElectroLoginForm } from "@/components/electro/auth/login-form";
import { electroCardCls } from "@/components/electro/ui";

export const metadata: Metadata = { title: "Prijava — Varel Electric", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ElectroLoginPage() {
  if (isElectroEnabled() && (await getElectroContext())) redirect(`${ELECTRO_APP_BASE}/dashboard`);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background-secondary p-6">
      <div className={`w-full max-w-md ${electroCardCls}`}>
        <h1 className="text-xl font-bold">Prijava u Varel Electric</h1>
        {isElectroEnabled() ? (
          <>
            <p className="mb-6 mt-1 text-sm text-muted">Prijavite se e-mail adresom svoje tvrtke.</p>
            <ElectroLoginForm />
            <p className="mt-6 text-sm text-muted">
              Vaša tvrtka još nema pristup?{" "}
              <Link href={`${ELECTRO_BASE}/registracija`} className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">Zatražite registraciju.</Link>
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Varel Electric uskoro će biti dostupan.</p>
        )}
      </div>
    </main>
  );
}
