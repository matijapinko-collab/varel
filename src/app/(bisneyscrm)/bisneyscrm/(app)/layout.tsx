import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { isBisneysEnabled, BISNEYS_BASE } from "@/lib/bisneyscrm/auth/session";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { BisneysAppShell } from "@/components/bisneyscrm/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function BisneysAppLayout({ children }: { children: React.ReactNode }) {
  if (!isBisneysEnabled()) redirect(BISNEYS_BASE);
  const user = await requireBisneysUser();

  const unreadCount = await db.bisneysNotification
    .count({ where: { status: "UNREAD" } })
    .catch(() => 0);

  const displayName = user.username;

  return (
    <BisneysAppShell userName={displayName} role={user.role} unreadCount={unreadCount}>
      {children}
    </BisneysAppShell>
  );
}
