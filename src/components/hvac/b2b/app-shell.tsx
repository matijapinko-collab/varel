"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarClock, CalendarDays, Inbox, Users, MapPin, AirVent,
  ClipboardList, FileText, ReceiptText, Wrench, BellRing, BarChart3, Settings,
  Menu, X, LogOut, ChevronDown, MoreHorizontal,
} from "lucide-react";
import { B2B_NAV, ROLE_LABELS, PLAN_CONFIG, TENANT_STATUS_LABELS } from "@/lib/hvac/b2b-config";
import { logoutHvac } from "@/server/actions/hvac-b2b-auth";
import type { HvacRole, HvacPlan } from "@/generated/prisma/client";

const ICONS: Record<string, typeof Users> = {
  dashboard: LayoutDashboard, today: CalendarClock, calendar: CalendarDays, inbox: Inbox,
  users: Users, map: MapPin, airvent: AirVent, clipboard: ClipboardList, quote: FileText,
  receipt: ReceiptText, wrench: Wrench, bell: BellRing, chart: BarChart3, settings: Settings,
};

// Field-first mobile bottom bar.
const MOBILE_PRIMARY = ["/hvac-b2b/danas", "/hvac-b2b/kalendar", "/hvac-b2b/radni-nalozi", "/hvac-b2b/klijenti"];

function Brand() {
  return (
    <Link href="/hvac-b2b/nadzorna-ploca" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 font-black text-white">V</span>
      <span className="font-bold tracking-tight">Varel <span className="text-sky-500">HVAC</span></span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Glavna navigacija">
      {B2B_NAV.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-sky-500/10 text-sky-600 dark:text-sky-300" : "text-muted hover:bg-soft hover:text-foreground"
            }`}
          >
            <Icon size={17} className="shrink-0" /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function HvacAppShell({
  tenantName, userName, role, plan, status, unverified, children,
}: {
  tenantName: string; userName: string; role: HvacRole; plan: HvacPlan; status: string;
  unverified: boolean; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  return (
    <div className="flex min-h-screen bg-background-secondary">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-4"><Brand /></div>
        <div className="min-w-0 flex-1 overflow-y-auto p-3">
          <div className="mb-3 rounded-lg border border-border bg-background-secondary px-3 py-2">
            <div className="truncate text-sm font-semibold">{tenantName}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
              <span>{PLAN_CONFIG[plan].name.replace("Varel ", "")}</span>
              <span aria-hidden>·</span>
              <span>{TENANT_STATUS_LABELS[status] ?? status}</span>
            </div>
          </div>
          <NavLinks pathname={pathname} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileNav(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-border lg:hidden" aria-label="Otvori izbornik">
              <Menu size={18} />
            </button>
            <div className="lg:hidden"><Brand /></div>
          </div>

          <div className="relative">
            <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:border-sky-500/50" aria-haspopup="menu" aria-expanded={userMenu}>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-soft text-xs font-bold text-sky-600 dark:text-sky-300">
                {userName.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </span>
              <span className="hidden max-w-[10rem] truncate sm:block">{userName}</span>
              <ChevronDown size={15} className="text-muted" />
            </button>
            {userMenu && (
              <div role="menu" className="absolute right-0 z-40 mt-1.5 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                <div className="px-3 py-2">
                  <div className="truncate text-sm font-semibold">{userName}</div>
                  <div className="text-xs text-muted">{ROLE_LABELS[role]}</div>
                </div>
                <Link href="/hvac-b2b/postavke" onClick={() => setUserMenu(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-soft" role="menuitem">Postavke</Link>
                <form action={logoutHvac}>
                  <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" role="menuitem">
                    <LogOut size={15} /> Odjava
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        {unverified && (
          <div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-2 text-center text-sm text-amber-700 dark:text-amber-300 sm:px-6">
            Potvrdite svoju e-mail adresu putem poveznice koju smo vam poslali.
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col bg-card">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Brand />
              <button onClick={() => setMobileNav(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-border" aria-label="Zatvori izbornik"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3"><NavLinks pathname={pathname} onNavigate={() => setMobileNav(false)} /></div>
          </div>
        </div>
      )}

      {/* Mobile bottom bar (field-first) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card lg:hidden" aria-label="Brza navigacija">
        {MOBILE_PRIMARY.map((href) => {
          const item = B2B_NAV.find((n) => n.href === href)!;
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${active ? "text-sky-600 dark:text-sky-300" : "text-muted"}`}>
              <Icon size={19} /> {item.label.split(" ")[0]}
            </Link>
          );
        })}
        <button onClick={() => setMobileNav(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted">
          <MoreHorizontal size={19} /> Više
        </button>
      </nav>
    </div>
  );
}
