import Link from "next/link";
import { Building2, Wrench, CalendarCheck, Users, Bell, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { requireTenantContext } from "@/lib/hvac/tenant";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { href: "/hvac-b2b/postavke/tvrtka", label: "Tvrtka", desc: "Podaci o tvrtki i radno vrijeme.", icon: Building2, owner: false },
  { href: "/hvac-b2b/postavke/usluge", label: "Usluge", desc: "Usluge, trajanja i cijene.", icon: Wrench, owner: false },
  { href: "/hvac-b2b/postavke/booking", label: "Booking", desc: "Online rezervacije i javna stranica.", icon: CalendarCheck, owner: false },
  { href: "/hvac-b2b/postavke/korisnici", label: "Korisnici", desc: "Članovi tima i uloge.", icon: Users, owner: true },
  { href: "/hvac-b2b/postavke/obavijesti", label: "Obavijesti", desc: "E-mail obavijesti.", icon: Bell, owner: false },
  { href: "/hvac-b2b/postavke/pretplata", label: "Pretplata", desc: "Paket, ugovor i status.", icon: CreditCard, owner: false },
];

export default async function SettingsPage() {
  const ctx = await requireTenantContext();
  const isOwner = ctx.role === "OWNER";

  return (
    <div>
      <PageHeader title="Postavke" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.filter((s) => !s.owner || isOwner).map((s) => (
          <Link key={s.href} href={s.href} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-sky-500/40">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300"><s.icon size={20} /></span>
            <h2 className="mt-3 font-semibold">{s.label}</h2>
            <p className="mt-1 text-sm text-muted">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
