import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isHvacB2bEnabled, getHvacSession } from "@/lib/hvac/b2b-auth";
import { AuthShell } from "@/components/hvac/b2b/auth-shell";
import { RegisterForm } from "@/components/hvac/b2b/register-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Registracija | Varel HVAC", robots: { index: false, follow: false } };

export default async function RegistracijaPage() {
  if (!isHvacB2bEnabled()) redirect("/hvac-b2b");
  if (await getHvacSession()) redirect("/hvac-b2b/nadzorna-ploca");

  return (
    <AuthShell
      wide
      title="Otvorite Varel HVAC račun"
      subtitle="Prva registrirana osoba postaje vlasnik računa tvrtke."
      footer={<>Već imate račun? <Link href="/hvac-b2b/prijava" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">Prijavite se</Link></>}
    >
      <RegisterForm />
    </AuthShell>
  );
}
