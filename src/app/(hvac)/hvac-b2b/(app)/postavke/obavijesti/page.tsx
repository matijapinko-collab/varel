import Link from "next/link";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const EMAILS = [
  "Potvrda registracije i e-mail adrese",
  "Nova booking rezervacija (vama)",
  "Potvrda rezervacije (klijentu)",
  "Potvrda / promjena / otkazivanje termina",
  "Radni nalog, ponuda i račun (PDF)",
  "Servisni podsjetnik",
];

export default async function NotificationsSettingsPage() {
  await requireTenantContext();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Obavijesti" />
      <Link href="/hvac-b2b/postavke" className="text-sm text-muted hover:text-foreground">← Postavke</Link>

      <div className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">E-mail obavijesti</h2>
        <p className="mt-1 text-sm text-muted">Varel HVAC šalje sljedeće e-mail obavijesti na hrvatskom jeziku:</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {EMAILS.map((e) => (
            <li key={e} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> {e}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">Detaljne postavke pojedinačnih obavijesti bit će dostupne u sljedećoj fazi. SMS obavijesti nisu dio MVP-a.</p>
      </div>
    </div>
  );
}
