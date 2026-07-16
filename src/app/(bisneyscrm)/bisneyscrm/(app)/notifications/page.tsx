import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { runAlerts } from "@/lib/bisneyscrm/alerts";
import { refreshAlerts, setNotificationStatus } from "@/server/actions/bisneys-notifications";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { FilterBar, SelectInput } from "@/components/bisneyscrm/shared/ui";
import { PRIORITY_LABELS, dateTime } from "@/lib/bisneyscrm/format";
import type { BisneysNotificationStatus, BisneysNotificationPriority } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<BisneysNotificationStatus, string> = { UNREAD: "Nepročitano", READ: "Pročitano", RESOLVED: "Riješeno", DISMISSED: "Odbačeno" };
const PRIORITY_TONE: Record<BisneysNotificationPriority, string> = {
  LOW: "bg-gray-500/10 text-gray-500", MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  HIGH: "bg-amber-500/10 text-amber-600 dark:text-amber-300", CRITICAL: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function entityHref(t: string | null, id: string | null): string | null {
  if (!id) return null;
  if (t === "company") return `/bisneyscrm/companies/${id}`;
  if (t === "candidate") return `/bisneyscrm/candidates/${id}`;
  return null;
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireBisneysUser();
  await runAlerts(); // idempotent refresh on view

  const sp = await searchParams;
  const status = (typeof sp.status === "string" ? sp.status : "UNREAD") as string;
  const priority = typeof sp.priority === "string" ? sp.priority : "";

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (priority) where.priority = priority;

  const [items, unread] = await Promise.all([
    db.bisneysNotification.findMany({ where, orderBy: [{ priority: "desc" }, { createdAt: "desc" }], take: 100 }),
    db.bisneysNotification.count({ where: { status: "UNREAD" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <BisneysPageHeader title="Obavijesti" description={`${unread} nepročitanih upozorenja`}>
        <form action={refreshAlerts}><button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-indigo-500/50">Osvježi upozorenja</button></form>
      </BisneysPageHeader>

      <FilterBar>
        <div className="w-44"><label className="mb-1 block text-xs text-muted">Status</label>
          <SelectInput name="status" defaultValue={status}>
            <option value="UNREAD">Nepročitano</option><option value="READ">Pročitano</option>
            <option value="RESOLVED">Riješeno</option><option value="DISMISSED">Odbačeno</option><option value="ALL">Sve</option>
          </SelectInput>
        </div>
        <div className="w-40"><label className="mb-1 block text-xs text-muted">Prioritet</label>
          <SelectInput name="priority" defaultValue={priority}>
            <option value="">Svi</option>{(Object.keys(PRIORITY_LABELS) as BisneysNotificationPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </SelectInput>
        </div>
      </FilterBar>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted">Nema upozorenja za odabrane filtere.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const href = entityHref(n.entityType, n.entityId);
            return (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_TONE[n.priority]}`}>{PRIORITY_LABELS[n.priority]}</span>
                    <span className="font-medium">{n.title}</span>
                    {n.status !== "UNREAD" && <span className="text-xs text-muted">· {STATUS_LABELS[n.status]}</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted">{n.description}</p>
                  <p className="mt-0.5 text-xs text-muted">{dateTime(n.createdAt)}{href && <> · <Link href={href} className="text-indigo-600 hover:underline dark:text-indigo-300">otvori</Link></>}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {n.status === "UNREAD" && <form action={setNotificationStatus.bind(null, n.id, "READ")}><button className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-indigo-500/50">Pročitano</button></form>}
                  {n.status !== "RESOLVED" && <form action={setNotificationStatus.bind(null, n.id, "RESOLVED")}><button className="rounded-lg border border-border px-2.5 py-1 text-xs text-green-600 hover:border-green-400 dark:text-green-400">Riješi</button></form>}
                  {n.status !== "DISMISSED" && <form action={setNotificationStatus.bind(null, n.id, "DISMISSED")}><button className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:border-border">Odbaci</button></form>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
