import Link from "next/link";
import { RefreshCw, Phone, CalendarPlus, Check, Clock, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { REMINDER_STATUS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { daysUntil } from "@/lib/hvac/reminders";
import { PageHeader } from "@/components/admin/ui";
import {
  syncRemindersFromUnits, setReminderStatus, postponeReminder,
  completeReminderAndRoll, reminderToInquiry, deleteReminder,
} from "@/server/actions/hvac-reminders";
import type { HvacReminderStatus, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const OPEN: HvacReminderStatus[] = ["READY", "UPCOMING", "CONTACTED", "FUTURE"];

export default async function RemindersPage(props: PageProps<"/hvac-b2b/servisni-podsjetnici">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const status = typeof sp?.status === "string" ? sp.status : "";

  const where: Prisma.HvacServiceReminderWhereInput = {
    tenantId: ctx.tenantId,
    ...(status ? { status: status as HvacReminderStatus } : { status: { in: OPEN } }),
  };

  const [reminders, readyCount, upcomingCount] = await Promise.all([
    db.hvacServiceReminder.findMany({ where, orderBy: { nextServiceDate: "asc" }, take: 200 }),
    db.hvacServiceReminder.count({ where: { tenantId: ctx.tenantId, status: "READY" } }),
    db.hvacServiceReminder.count({ where: { tenantId: ctx.tenantId, status: "UPCOMING" } }),
  ]);

  // Resolve related customer + unit for display (reminders store only ids).
  const customerIds = [...new Set(reminders.map((r) => r.customerId))];
  const unitIds = [...new Set(reminders.map((r) => r.unitId))];
  const [customers, units] = await Promise.all([
    customerIds.length ? db.hvacCustomer.findMany({ where: { tenantId: ctx.tenantId, id: { in: customerIds } } }) : [],
    unitIds.length ? db.hvacUnit.findMany({ where: { tenantId: ctx.tenantId, id: { in: unitIds } }, select: { id: true, manufacturer: true, model: true, internalName: true } }) : [],
  ]);
  const custOf = (id: string) => customers.find((c) => c.id === id);
  const unitOf = (id: string) => units.find((u) => u.id === id);

  return (
    <div>
      <PageHeader title="Servisni podsjetnici">
        <form action={syncRemindersFromUnits}>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-sky-500/50"><RefreshCw size={15} /> Osvježi iz uređaja</button>
        </form>
      </PageHeader>
      <p className="-mt-2 mb-4 text-sm text-muted">{readyCount} za kontakt · {upcomingCount} uskoro. Podsjetnici se automatski generiraju iz datuma sljedećeg servisa uređaja.</p>

      <div className="mb-4 flex flex-wrap gap-1 text-xs">
        <Link href="/hvac-b2b/servisni-podsjetnici" className={`rounded-full px-2.5 py-1 font-semibold ${!status ? "bg-sky-500 text-white" : "border border-border text-muted hover:text-foreground"}`}>Otvoreni</Link>
        {(Object.keys(REMINDER_STATUS) as HvacReminderStatus[]).map((s) => (
          <Link key={s} href={`/hvac-b2b/servisni-podsjetnici?status=${s}`} className={`rounded-full px-2.5 py-1 font-semibold ${status === s ? "bg-sky-500 text-white" : "border border-border text-muted hover:text-foreground"}`}>{REMINDER_STATUS[s].label}</Link>
        ))}
      </div>

      {reminders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          Nema podsjetnika. Dodajte datum sljedećeg servisa na uređaje pa kliknite „Osvježi iz uređaja”.
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => {
            const st = REMINDER_STATUS[r.status];
            const cust = custOf(r.customerId);
            const unit = unitOf(r.unitId);
            const d = daysUntil(r.nextServiceDate);
            const due = d <= 0 ? `dospjelo prije ${Math.abs(d)} d` : `za ${d} d`;
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/hvac-b2b/uredaji/${r.unitId}`} className="font-semibold hover:text-sky-600 dark:hover:text-sky-300">
                        {unit ? [unit.manufacturer, unit.model].filter(Boolean).join(" ") || unit.internalName || "Uređaj" : "Uređaj"}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
                    </div>
                    <div className="mt-0.5 text-sm text-muted">
                      {cust ? <Link href={`/hvac-b2b/klijenti/${cust.id}`} className="hover:text-foreground">{customerDisplayName(cust)}</Link> : "—"}
                      {cust?.phone && <> · <a href={`tel:${cust.phone}`} className="text-sky-600 hover:underline dark:text-sky-300">{cust.phone}</a></>}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">Sljedeći servis: {r.nextServiceDate.toISOString().slice(0, 10)} ({due}){r.contactAttempts > 0 ? ` · ${r.contactAttempts} pokušaj(a) kontakta` : ""}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={reminderToInquiry.bind(null, r.id)}>
                    <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"><CalendarPlus size={13} /> Kreiraj upit</button>
                  </form>
                  {r.status !== "CONTACTED" && (
                    <form action={setReminderStatus.bind(null, r.id)}>
                      <input type="hidden" name="status" value="CONTACTED" />
                      <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:border-sky-500/50"><Phone size={13} /> Kontaktiran</button>
                    </form>
                  )}
                  <form action={postponeReminder.bind(null, r.id)}>
                    <input type="hidden" name="months" value={r.intervalMonths} />
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"><Clock size={13} /> Odgodi {r.intervalMonths} mj.</button>
                  </form>
                  <form action={completeReminderAndRoll.bind(null, r.id)}>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/5 dark:text-emerald-300"><Check size={13} /> Servisirano</button>
                  </form>
                  <form action={deleteReminder.bind(null, r.id)}>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-red-500"><Trash2 size={13} /></button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
