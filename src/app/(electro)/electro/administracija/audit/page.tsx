import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

/** Company audit log (brief §60). Admin-only, read-only, scoped to the company. */
export default async function ElectroAuditPage() {
  const ctx = await requireElectroContext();
  if (!ctx.roles.includes("ADMIN")) redirect(`${ELECTRO_APP_BASE}/403`);

  const entries = await db.electroAuditLog.findMany({
    where: { companyId: ctx.company.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Resolve actor names in one query.
  const userIds = [...new Set(entries.map((e) => e.userId).filter((x): x is string => !!x))];
  const users = await db.electroUser.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } });
  const nameMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">Zapisnik aktivnosti</h1>
      <p className="text-sm text-muted">Read-only zapis ključnih akcija u vašoj tvrtki. Najnovijih 200.</p>
      <div className={`${electroCardCls} !p-0 overflow-x-auto`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-muted dark:border-white/10">
              <th className="p-2">Vrijeme</th><th className="p-2">Korisnik</th><th className="p-2">Akcija</th><th className="p-2">Entitet</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-black/5 dark:border-white/5">
                <td className="p-2 whitespace-nowrap text-muted">{e.createdAt.toLocaleString("hr-HR")}</td>
                <td className="p-2">{e.userId ? nameMap.get(e.userId) ?? "—" : (e.superadminId ? "superadmin" : "sustav")}</td>
                <td className="p-2 font-medium">{e.action}</td>
                <td className="p-2 text-muted">{e.entityType ?? ""}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={4} className="p-3 text-muted">Nema zapisa.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
