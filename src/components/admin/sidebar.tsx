"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  FileStack,
  Wrench,
  FolderTree,
  GitCompareArrows,
  BookOpen,
  PenLine,
  Newspaper,
  MessageSquareText,
  BadgePercent,
  AirVent,
  Link2,
  Plug,
  Radar,
  Image as ImageIcon,
  Menu as MenuIcon,
  Languages,
  Repeat2,
  SearchCheck,
  BarChart3,
  Mail,
  Users,
  UserCircle,
  ShieldCheck,
  PackageOpen,
  Settings,
  Palette,
  FileEdit,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> };

// WordPress-style grouped navigation. Finance and Gadget Reviews are removed.
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "",
    items: [{ href: "/administracija/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    items: [
      { href: "/administracija/posts", label: "Posts", icon: FileStack },
      { href: "/administracija/pages", label: "Pages", icon: FileText },
      { href: "/administracija/guides", label: "Guides", icon: BookOpen },
      { href: "/administracija/editorial", label: "Editorial", icon: PenLine },
      { href: "/administracija/news", label: "News", icon: Newspaper },
      { href: "/administracija/prompts", label: "Prompts", icon: MessageSquareText },
      { href: "/administracija/comparisons", label: "Comparisons", icon: GitCompareArrows },
      { href: "/administracija/authors", label: "Authors", icon: UserCircle },
    ],
  },
  {
    label: "Directory",
    items: [
      { href: "/administracija/tools", label: "Tools", icon: Wrench },
      { href: "/administracija/categories", label: "Categories", icon: FolderTree },
    ],
  },
  {
    label: "Monetization",
    items: [
      { href: "/administracija/price-checker", label: "Best Deals / Price Checker", icon: BadgePercent },
      { href: "/administracija/llm-reports", label: "LLM Reports", icon: Radar },
      { href: "/administracija/hvac", label: "Varel HVAC leads", icon: AirVent },
      { href: "/administracija/affiliate", label: "Affiliate Links", icon: Link2 },
    ],
  },
  {
    label: "Media",
    items: [{ href: "/administracija/media", label: "Media Library", icon: ImageIcon }],
  },
  {
    label: "SEO",
    items: [{ href: "/administracija/seo", label: "SEO Overview", icon: SearchCheck }],
  },
  {
    label: "Analytics",
    items: [
      { href: "/administracija/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/administracija/newsletter", label: "Newsletter", icon: Mail },
    ],
  },
  {
    label: "Integrations",
    items: [{ href: "/administracija/integrations", label: "API Connections", icon: Plug }],
  },
  {
    label: "Users",
    items: [
      { href: "/administracija/users", label: "All Users", icon: Users },
      { href: "/administracija/security", label: "Security & Roles", icon: ShieldCheck },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/administracija/settings", label: "General", icon: Settings },
      { href: "/administracija/settings/content", label: "Content & Authors", icon: FileEdit },
      { href: "/administracija/branding", label: "Branding & Theme", icon: Palette },
      { href: "/administracija/languages", label: "Languages", icon: Languages },
      { href: "/administracija/translations", label: "Translations", icon: Repeat2 },
      { href: "/administracija/menus", label: "Menus", icon: MenuIcon },
      { href: "/administracija/versions", label: "Version Manager", icon: PackageOpen },
    ],
  },
];

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card max-lg:hidden">
      <Link
        href="/administracija/dashboard"
        className="flex h-14 items-center gap-2 border-b border-border px-4"
      >
        <span className="text-lg font-bold tracking-tight">
          <span className="text-primary">V</span>arel
        </span>
        <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Admin
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {GROUPS.map((group, gi) => (
          <div key={group.label || `g${gi}`} className="mb-4">
            {group.label && (
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-soft font-medium text-primary"
                      : "text-muted hover:bg-background-secondary hover:text-foreground"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{userName}</span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/administracija" })}
            aria-label="Sign out"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-background-secondary hover:text-foreground"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
