import { db } from "@/lib/db";
import { PageHeader, AdminTable } from "@/components/admin/ui";

export default async function AdminSecurityPage() {
  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const [auditLogs, failedLogins, failedCount, activeUsers2fa] = await Promise.all([
    db.auditLog.findMany({
      include: { user: { select: { name: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.loginAttempt.findMany({
      where: { success: false },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.loginAttempt.count({ where: { success: false, createdAt: { gte: since7 } } }),
    db.user.count({ where: { isActive: true, twoFactorEnabled: false, deletedAt: null } }),
  ]);

  return (
    <div>
      <PageHeader title="Security" />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-card p-4">
          <div className="text-2xl font-bold">{failedCount}</div>
          <div className="mt-1 text-xs text-muted">Failed logins (7 days)</div>
        </div>
        <div className={`rounded-card border p-4 ${activeUsers2fa > 0 ? "border-yellow-500/40 bg-yellow-500/10" : "border-border bg-card"}`}>
          <div className="text-2xl font-bold">{activeUsers2fa}</div>
          <div className="mt-1 text-xs text-muted">Active users without 2FA</div>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <div className="text-2xl font-bold">{auditLogs.length}</div>
          <div className="mt-1 text-xs text-muted">Recent audit entries shown</div>
        </div>
      </div>

      <h2 className="text-lg font-semibold">Failed login attempts</h2>
      <div className="mt-3">
        <AdminTable headers={["Email / identifier", "Reason", "When"]} empty={failedLogins.length === 0}>
          {failedLogins.map((attempt) => (
            <tr key={attempt.id}>
              <td className="px-4 py-2.5 text-sm">{attempt.email}</td>
              <td className="px-4 py-2.5 text-xs text-muted">{attempt.reason ?? "—"}</td>
              <td className="px-4 py-2.5 text-xs text-muted">{attempt.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Audit log</h2>
      <div className="mt-3">
        <AdminTable headers={["User", "Action", "Entity", "When"]} empty={auditLogs.length === 0}>
          {auditLogs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-2.5 text-sm font-medium">
                {log.user ? `${log.user.name} (@${log.user.username})` : "System"}
              </td>
              <td className="px-4 py-2.5 text-xs">
                <span className="rounded-full bg-soft px-2 py-0.5 font-medium text-primary">
                  {log.action.toLowerCase().replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">
                {log.entityType ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">{log.createdAt.toLocaleString()}</td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
