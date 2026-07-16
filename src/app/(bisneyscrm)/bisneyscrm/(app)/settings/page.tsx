import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { UserCircle, LayoutGrid, SlidersHorizontal, Users, ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsIndex() {
  const user = await requireBisneysUser();
  const isSuper = user.role === "SUPERADMIN";

  const cards = [
    { href: "/bisneyscrm/settings/account", title: "Račun", desc: "Promjena zaporke i sigurnost sesija.", icon: UserCircle, show: true },
    { href: "/bisneyscrm/users", title: "Korisnici", desc: "Upravljanje CRM korisnicima i ulogama.", icon: Users, show: isSuper },
    { href: "/bisneyscrm/settings/trello", title: "Trello integracija", desc: "Povezivanje, boardovi i mapiranje lista.", icon: LayoutGrid, show: isSuper },
    { href: "/bisneyscrm/audit-log", title: "Audit log", desc: "Zapis kritičnih promjena.", icon: ScrollText, show: isSuper },
    { href: "/bisneyscrm/settings/system", title: "Sistemske postavke", desc: "Globalne postavke Bisneys CRM-a.", icon: SlidersHorizontal, show: isSuper },
  ].filter((c) => c.show);

  return (
    <div>
      <BisneysPageHeader title="Postavke" description="Upravljanje računom i sustavom." />
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-indigo-500/50">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500"><c.icon size={18} /></span>
            <span>
              <span className="block font-semibold">{c.title}</span>
              <span className="mt-0.5 block text-sm text-muted">{c.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
