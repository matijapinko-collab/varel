"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Wrench,
  FolderTree,
  GitCompareArrows,
  BookOpen,
  PenLine,
  Newspaper,
  MessageSquareText,
  BadgePercent,
  Store,
  FileUp,
  Link2,
  Plug,
  ScanSearch,
  Image as ImageIcon,
  Menu as MenuIcon,
  Languages,
  Repeat2,
  SearchCheck,
  BarChart3,
  Mail,
  Users,
  ShieldCheck,
  PackageOpen,
  Settings,
  Palette,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

const GROUPS: {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[];
}[] = [
  {
    label: "Overview",
    items: [{ href: "/administracija", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    items: [
      { href: "/administracija/pages", label: "Pages", icon: FileText },
      { href: "/administracija/tools", label: "Tools", icon: Wrench },
      { href: "/administracija/categories", label: "Categories", icon: FolderTree },
      { href: "/administracija/comparisons", label: "Comparisons", icon: GitCompareArrows },
      { href: "/administracija/guides", label: "Guides", icon: BookOpen },
      { href: "/administracija/editorial", label: "Editorial", icon: PenLine },
      { href: "/administracija/news", label: "News", icon: Newspaper },
      { href: "/administracija/prompts", label: "Prompts", icon: MessageSquareText },
    ],
  },
  {
    label: "Monetization",
    items: [
      { href: "/administracija/price-checker", label: "Price Checker", icon: ScanSearch },
      { href: "/administracija/deals", label: "Best Deals", icon: BadgePercent },
      { href: "/administracija/affiliate-partners", label: "Affiliate Partners", icon: Store },
      { href: "/administracija/offers-import", label: "Import offers", icon: FileUp },
      { href: "/administracija/affiliate", label: "Affiliate Manager", icon: Link2 },
      { href: "/administracija/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "Site",
    items: [
      { href: "/administracija/media", label: "Media Library", icon: ImageIcon },
      { href: "/administracija/menus", label: "Menus", icon: MenuIcon },
      { href: "/administracija/languages", label: "Languages", icon: Languages },
      { href: "/administracija/translations", label: "Translations", icon: Repeat2 },
      { href: "/administracija/seo", label: "SEO Manager", icon: SearchCheck },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/administracija/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/administracija/newsletter", label: "Newsletter", icon: Mail },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/administracija/users", label: "Users", icon: Users },
      { href: "/administracija/security", label: "Security", icon: ShieldCheck },
      { href: "/administracija/versions", label: "Version Manager", icon: PackageOpen },
      { href: "/administracija/settings", label: "Settings", icon: Settings },
      { href: "/administracija/branding", label: "Branding", icon: Palette },
    ],
  },
];

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card max-lg:hidden">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <span className="text-lg font-bold tracking-tight">
          <span className="text-primary">V</span>arel
        </span>
        <span className="rounded-full bg-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Admin
        </span>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {group.label}
            </div>
            {group.items.map((item) => {
              const active =
                item.href === "/administracija"
                  ? pathname === "/administracija"
                  : pathname.startsWith(item.href);
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
