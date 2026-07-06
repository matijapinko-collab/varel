import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/administracija");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar userName={session.user.name ?? session.user.username} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
