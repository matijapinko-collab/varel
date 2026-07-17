"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, TrendingUp, Truck, Activity, Building2, Contact, Users,
  Briefcase, Network, Layers, Euro, Bell, BarChart3, Settings, UserCog,
  LayoutGrid, ScrollText, SlidersHorizontal, ClipboardCheck, Star, ShieldCheck, Menu, X, LogOut, ChevronDown,
} from "lucide-react";
import { BISNEYS_NAV, type BisneysNavItem } from "./nav";
import { bisneysLogout } from "@/server/actions/bisneys-auth";
import type { BisneysRole } from "@/generated/prisma/client";

const ICONS: Record<string, typeof Users> = {
  dashboard: LayoutDashboard, trending: TrendingUp, truck: Truck, activity: Activity,
  building: Building2, contact: Contact, users: Users, briefcase: Briefcase,
  network: Network, layers: Layers, euro: Euro, bell: Bell, chart: BarChart3,
  settings: Settings, userCog: UserCog, trello: LayoutGrid, scroll: ScrollText,
  sliders: SlidersHorizontal, clipboard: ClipboardCheck, star: Star, shield: ShieldCheck,
};

const ROLE_LABELS: Record<BisneysRole, string> = {
  SUPERADMIN: "Superadministrator",
  ADMIN: "Administrator",
};

function Brand() {
  return (
    <Link href="/bisneyscrm/dashboard" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 font-black text-white">B</span>
      <span className="font-bold tracking-tight">Bisneys <span className="text-indigo-500">CRM</span></span>
    </Link>
  );
}

function NavLink({
  item, active, unreadCount, onNavigate,
}: {
  item: BisneysNavItem; active: boolean; unreadCount: number; onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon] ?? LayoutDashboard;
  const showBadge = item.badge === "notifications" && unreadCount > 0;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : "text-muted hover:bg-soft hover:text-foreground"
      }`}
    >
      <Icon size={17} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {showBadge && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

function NavLinks({
  pathname, role, unreadCount, onNavigate,
}: {
  pathname: string; role: BisneysRole; unreadCount: number; onNavigate?: () => void;
}) {
  const main = BISNEYS_NAV.filter((i) => !i.superadminOnly);
  const admin = BISNEYS_NAV.filter((i) => i.superadminOnly && role === "SUPERADMIN");
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Glavna navigacija">
      {main.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item.href)} unreadCount={unreadCount} onNavigate={onNavigate} />
      ))}
      {admin.length > 0 && (
        <>
          <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">Administracija</div>
          {admin.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} unreadCount={unreadCount} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </nav>
  );
}

export function BisneysAppShell({
  userName, role, unreadCount = 0, children,
}: {
  userName: string; role: BisneysRole; unreadCount?: number; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const initials = userName.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="flex min-h-screen bg-background-secondary">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-4"><Brand /></div>
        <div className="min-w-0 flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} role={role} unreadCount={unreadCount} />
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

          <div className="flex items-center gap-2">
            <Link
              href="/bisneyscrm/notifications"
              className="relative grid h-9 w-9 place-items-center rounded-lg border border-border text-muted hover:text-foreground"
              aria-label="Obavijesti"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <div className="relative">
              <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm hover:border-indigo-500/50" aria-haspopup="menu" aria-expanded={userMenu}>
                <span className="grid h-7 w-7 place-items-center rounded-full bg-soft text-xs font-bold text-indigo-600 dark:text-indigo-300">{initials}</span>
                <span className="hidden max-w-[10rem] truncate sm:block">{userName}</span>
                <ChevronDown size={15} className="text-muted" />
              </button>
              {userMenu && (
                <div role="menu" className="absolute right-0 z-40 mt-1.5 w-56 rounded-xl border border-border bg-card p-1.5 shadow-lg">
                  <div className="px-3 py-2">
                    <div className="truncate text-sm font-semibold">{userName}</div>
                    <div className="text-xs text-muted">{ROLE_LABELS[role]}</div>
                  </div>
                  <Link href="/bisneyscrm/settings/account" onClick={() => setUserMenu(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-soft" role="menuitem">Postavke računa</Link>
                  <form action={bisneysLogout}>
                    <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" role="menuitem">
                      <LogOut size={15} /> Odjava
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
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
            <div className="flex-1 overflow-y-auto p-3"><NavLinks pathname={pathname} role={role} unreadCount={unreadCount} onNavigate={() => setMobileNav(false)} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
