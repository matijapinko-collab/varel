import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { InactivityLogout } from "@/components/admin/inactivity-logout";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/administracija");

  const inactivityMinutes = Number(process.env.ADMIN_INACTIVITY_TIMEOUT_MINUTES) || 60;

  const userName = session.user.name ?? session.user.username;

  return (
    <div className="flex min-h-screen">
      <InactivityLogout timeoutMinutes={inactivityMinutes} />
      <AdminSidebar userName={userName} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top admin bar */}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" target="_blank" className="text-sm font-medium text-muted hover:text-primary">
              ↗ View Site
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="group relative">
              <button className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                + New
              </button>
              <div className="invisible absolute right-0 top-full z-40 mt-1 w-40 rounded-lg border border-border bg-card p-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                {[
                  { label: "Post", href: "/administracija/posts/new" },
                  { label: "Page", href: "/administracija/pages/new" },
                  { label: "Tool", href: "/administracija/tools/new" },
                  { label: "Comparison", href: "/administracija/comparisons/new" },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded px-3 py-1.5 text-sm hover:bg-soft hover:text-primary">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <span className="text-sm font-medium">{userName}</span>
          </div>
        </header>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
