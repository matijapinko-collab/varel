import type { Metadata } from "next";
import Link from "next/link";
import { isElectroEnabled, ELECTRO_BASE } from "@/lib/electro/auth/session";
import { ElectroRegistrationForm } from "@/components/electro/auth/registration-form";
import { electroCardCls } from "@/components/electro/ui";

export const metadata: Metadata = {
  title: "Registracija — Varel Electric",
  description: "Zatražite pristup Varel Electricu za svoju elektroinstalacijsku tvrtku — probno razdoblje od 10 dana nakon odobrenja.",
};
export const dynamic = "force-dynamic";

export default function ElectroRegistrationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background-secondary p-6">
      <div className={`w-full max-w-xl ${electroCardCls}`}>
        <Link href={ELECTRO_BASE} className="text-sm text-muted hover:text-foreground">← Varel Electric</Link>
        <h1 className="mt-2 text-xl font-bold">Zahtjev za registraciju tvrtke</h1>
        {isElectroEnabled() ? (
          <>
            <p className="mb-6 mt-1 text-sm text-muted">
              Ispunite podatke tvrtke i prvog administratora. Zahtjev ručno pregledava Varel tim.
            </p>
            <ElectroRegistrationForm />
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Varel Electric uskoro će biti dostupan.</p>
        )}
      </div>
    </main>
  );
}
