import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { legalSlug } from "@/lib/legal";
import { HVAC_ROUTES } from "@/lib/hvac/content";

/** HVAC product link strip above the reused global Varel footer. */
export function HvacFooter() {
  const links = [
    { label: "Varel HVAC", href: HVAC_ROUTES.landing },
    { label: "Paketi", href: `${HVAC_ROUTES.landing}#paketi` },
    { label: "Demo", href: HVAC_ROUTES.demo },
    { label: "Prijava", href: HVAC_ROUTES.login },
    { label: "Privatnost", href: `/hr/${legalSlug("privacy", "hr")}` },
    { label: "Uvjeti korištenja", href: "/hr/terms" },
    { label: "Kontakt", href: "/hr/contact" },
  ];

  return (
    <>
      <div className="border-t border-border bg-background-secondary">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 text-sm font-black text-white">V</span>
            <span className="font-bold">Varel <span className="text-sky-500">HVAC</span></span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted" aria-label="Varel HVAC poveznice">
            {links.map((l) => (
              <Link key={l.label} href={l.href} className="hover:text-foreground">{l.label}</Link>
            ))}
          </nav>
        </div>
      </div>
      <SiteFooter locale="hr" />
    </>
  );
}
