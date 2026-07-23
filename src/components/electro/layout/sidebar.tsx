"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, LayoutDashboard, FolderKanban, HardHat, ListChecks, FileText, Camera,
  AlertTriangle, Landmark, Warehouse, Package, PackageMinus, NotebookPen,
  BarChart3, Users, Plug, Settings, ChevronsLeft, ChevronsRight, Menu, X,
  LogOut, ShieldCheck, ChevronDown, Building2,
} from "lucide-react";
import { ELECTRO_SUPERADMIN_BASE } from "@/lib/electro/constants";
import type { ElectroNavItem } from "./nav";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard, FolderKanban, HardHat, ListChecks, FileText, Camera,
  AlertTriangle, Landmark, Warehouse, Package, PackageMinus, NotebookPen,
  BarChart3, Users, Plug, Settings,
};

export type SidebarBadges = Partial<Record<NonNullable<ElectroNavItem["badge"]>, number>>;

export type CompanyOption = { id: string; name: string; plan: string; status: string };

export function ElectroSidebar({
  nav,
  badges,
  company,
  companyPlan,
  companyStatus,
  userName,
  userRole,
  isSuperadmin,
  switcherCompanies,
  logoutAction,
  storageKey = "electro-sidebar-collapsed",
}: {
  nav: ElectroNavItem[];
  badges: SidebarBadges;
  company: string;
  companyPlan: string;
  companyStatus: string;
  userName: string;
  userRole: string;
  isSuperadmin: boolean;
  switcherCompanies: CompanyOption[];
  logoutAction: () => void;
  storageKey?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(storageKey, (!c).toString()); } catch {}
      return !c;
    });
  };

  const w = collapsed ? "w-16" : "w-64";

  const NavList = () => (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
      {nav.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const badge = item.badge ? badges[item.badge] : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? item.label : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
            }`}
          >
            <Icon size={18} />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && badge != null && badge > 0 && (
              <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">{badge}</span>
            )}
            {collapsed && badge != null && badge > 0 && (
              <span className="absolute ml-8 -mt-4 h-2 w-2 rounded-full bg-red-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const Inner = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3 dark:border-white/5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><Zap size={16} /></span>
        {!collapsed && <span className="font-black tracking-tight">Varel <span className="text-emerald-600 dark:text-emerald-400">Electro</span></span>}
      </div>

      {/* Company switcher (superadmin) or company label (admin) */}
      <div className="border-b border-black/5 px-2 py-2 dark:border-white/5">
        {isSuperadmin ? (
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"
              title={collapsed ? company : undefined}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/5 text-xs font-bold dark:bg-white/10">
                {company.slice(0, 2).toUpperCase()}
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{company}</span>
                  <span className="block truncate text-xs text-muted">{companyPlan} · {companyStatus}</span>
                </span>
              )}
              {!collapsed && <ChevronDown size={14} className="shrink-0 text-muted" />}
            </button>
            {switcherOpen && !collapsed && (
              <div className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-black/10 bg-background p-1 shadow-lg dark:border-white/10">
                <p className="px-2 py-1 text-xs font-semibold text-muted">Tvrtke</p>
                {switcherCompanies.map((c) => (
                  <Link
                    key={c.id}
                    href={`${ELECTRO_SUPERADMIN_BASE}?company=${c.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    onClick={() => setSwitcherOpen(false)}
                  >
                    <Building2 size={14} className="text-muted" />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-muted">{c.status}</span>
                  </Link>
                ))}
                <Link href={ELECTRO_SUPERADMIN_BASE} className="mt-1 flex items-center gap-2 rounded-md border-t border-black/5 px-2 py-1.5 text-sm font-semibold text-emerald-600 dark:border-white/5 dark:text-emerald-400" onClick={() => setSwitcherOpen(false)}>
                  <ShieldCheck size={14} /> Globalna superadministracija
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-2" title={collapsed ? company : undefined}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-black/5 text-xs font-bold dark:bg-white/10">{company.slice(0, 2).toUpperCase()}</span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{company}</span>
                <span className="block truncate text-xs text-muted">{companyPlan} · {companyStatus}</span>
              </span>
            )}
          </div>
        )}
      </div>

      <NavList />

      {/* Bottom section */}
      <div className="border-t border-black/5 px-2 py-2 dark:border-white/5">
        {isSuperadmin && (
          <Link href={ELECTRO_SUPERADMIN_BASE} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400" title={collapsed ? "Superadministracija" : undefined}>
            <ShieldCheck size={18} />
            {!collapsed && <span>Otvori superadministraciju</span>}
          </Link>
        )}
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/5 text-xs font-bold dark:bg-white/10">{userName.slice(0, 1).toUpperCase()}</span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{userName}</span>
              <span className="block truncate text-xs text-muted">{userRole}</span>
            </span>
          )}
        </div>
        <form action={logoutAction}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5" title={collapsed ? "Odjava" : undefined}>
            <LogOut size={18} />
            {!collapsed && <span>Odjava</span>}
          </button>
        </form>
        <button onClick={toggleCollapsed} className="hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-black/5 lg:flex dark:hover:bg-white/5">
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          {!collapsed && <span>Skupi izbornik</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-black/5 bg-background px-4 py-2 lg:hidden dark:border-white/5">
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5"><Menu size={20} /></button>
        <span className="font-black tracking-tight">Varel <span className="text-emerald-600 dark:text-emerald-400">Electro</span></span>
      </div>

      {/* Desktop sidebar */}
      <aside className={`${w} sticky top-0 hidden h-screen shrink-0 border-r border-black/5 bg-background transition-all lg:block dark:border-white/5`}>
        <Inner />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-background shadow-xl">
            <button onClick={() => setMobileOpen(false)} className="absolute right-2 top-2 z-10 rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/5"><X size={18} /></button>
            <Inner />
          </aside>
        </div>
      )}
    </>
  );
}
