import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";
import { isElectroEnabled, ELECTRO_BASE, ELECTRO_APP_BASE } from "@/lib/electro/auth/session";
import { requireElectroContextAnyStatus } from "@/lib/electro/auth/guard";
import { ELECTRO_ROLE_NAMES } from "@/lib/electro/constants";
import { trialDaysRemaining } from "@/lib/electro/subscription";
import { electroLogout } from "@/server/actions/electro-auth";
import { visibleNav } from "@/components/electro/layout/nav";

/** The application is never indexed (brief §4) — unlike the public marketing pages. */
export const metadata: Metadata = {
  title: "Varel Electric",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};
export const dynamic = "force-dynamic";

/**
 * Login is required for the whole /electro/app subtree, but subscription
 * status is enforced per page (requireElectroContext), so the /status and
 * /promjena-lozinke pages stay reachable for blocked companies.
 */
export default async function ElectroAppLayout({ children }: { children: React.ReactNode }) {
  if (!isElectroEnabled()) redirect(ELECTRO_BASE);
  const ctx = await requireElectroContextAnyStatus();
  const trialDays = ctx.status === "TRIAL" ? trialDaysRemaining(ctx.subscription.trialEndsAt) : null;
  const nav = visibleNav(ctx.roles);

  return (
    <div className="min-h-screen bg-background-secondary">
      <header className="border-b border-black/5 bg-background dark:border-white/5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link href={`${ELECTRO_APP_BASE}/dashboard`} className="flex items-center gap-2 font-black tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Zap size={16} /></span>
            Varel <span className="text-emerald-600 dark:text-emerald-400">Electric</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="font-semibold">{ctx.user.firstName} {ctx.user.lastName}</p>
              <p className="text-xs text-muted">
                {ctx.company.name} · {ctx.roles.map((r) => ELECTRO_ROLE_NAMES[r]).join(", ") || "Bez uloge"}
              </p>
            </div>
            <form action={electroLogout}>
              <button type="submit" className="rounded-lg border border-black/10 px-3 py-1.5 font-semibold hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5">
                Odjava
              </button>
            </form>
          </div>
        </div>
        {nav.length > 1 && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5">
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        {trialDays !== null && (
          <div className="bg-emerald-500/10 px-6 py-1.5 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            Probno razdoblje: još {trialDays} {trialDays === 1 ? "dan" : "dana"}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
