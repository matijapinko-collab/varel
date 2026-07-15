import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isHvacB2bEnabled } from "@/lib/hvac/b2b-auth";
import { AuthShell } from "@/components/hvac/b2b/auth-shell";
import { ForgotForm } from "@/components/hvac/b2b/reset-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Zaboravljena lozinka | Varel HVAC", robots: { index: false, follow: false } };

export default function ZaboravljenaLozinkaPage() {
  if (!isHvacB2bEnabled()) redirect("/hvac-b2b");
  return (
    <AuthShell
      title="Zaboravljena lozinka"
      subtitle="Unesite e-mail i poslat ćemo vam poveznicu za ponovno postavljanje lozinke."
      footer={<Link href="/hvac-b2b/prijava" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">Natrag na prijavu</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
