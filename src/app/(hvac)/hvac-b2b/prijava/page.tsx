import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isHvacB2bEnabled, getHvacSession } from "@/lib/hvac/b2b-auth";
import { AuthShell } from "@/components/hvac/b2b/auth-shell";
import { LoginForm } from "@/components/hvac/b2b/login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prijava | Varel HVAC", robots: { index: false, follow: false } };

export default async function PrijavaPage(props: PageProps<"/hvac-b2b/prijava">) {
  if (!isHvacB2bEnabled()) redirect("/hvac-b2b");
  if (await getHvacSession()) redirect("/hvac-b2b/nadzorna-ploca");
  const sp = await props.searchParams;

  return (
    <AuthShell
      title="Prijava"
      subtitle="Prijavite se u svoj Varel HVAC račun."
      footer={<>Nemate račun? <Link href="/hvac-b2b/registracija" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">Registrirajte tvrtku</Link></>}
    >
      {sp?.verified === "1" && <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">E-mail adresa je potvrđena. Možete se prijaviti.</p>}
      {sp?.reset === "1" && <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">Lozinka je promijenjena. Prijavite se novom lozinkom.</p>}
      <LoginForm />
      <p className="mt-4 text-center text-sm">
        <Link href="/hvac-b2b/zaboravljena-lozinka" className="text-muted hover:text-foreground">Zaboravljena lozinka?</Link>
      </p>
    </AuthShell>
  );
}
