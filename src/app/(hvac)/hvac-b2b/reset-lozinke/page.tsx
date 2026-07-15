import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isHvacB2bEnabled } from "@/lib/hvac/b2b-auth";
import { AuthShell } from "@/components/hvac/b2b/auth-shell";
import { ResetForm } from "@/components/hvac/b2b/reset-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nova lozinka | Varel HVAC", robots: { index: false, follow: false } };

export default async function ResetLozinkePage(props: PageProps<"/hvac-b2b/reset-lozinke">) {
  if (!isHvacB2bEnabled()) redirect("/hvac-b2b");
  const sp = await props.searchParams;
  const token = typeof sp?.token === "string" ? sp.token : "";

  return (
    <AuthShell
      title="Postavite novu lozinku"
      footer={<Link href="/hvac-b2b/prijava" className="font-semibold text-sky-600 hover:underline dark:text-sky-300">Natrag na prijavu</Link>}
    >
      {token ? <ResetForm token={token} /> : <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10">Nedostaje token za promjenu lozinke. Zatražite novu poveznicu.</p>}
    </AuthShell>
  );
}
