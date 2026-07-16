import Link from "next/link";
import { Phone, MapPin, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { APPOINTMENT_STATUS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { startOfDay, endOfDay, fmtTime, fmtDayLong, isoDate } from "@/lib/hvac/calendar";
import { PageHeader } from "@/components/admin/ui";
import { setAppointmentStatus } from "@/server/actions/hvac-appointments";
import type { HvacAppointmentStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/** The next sensible status for the one-tap field button. */
const NEXT: Partial<Record<HvacAppointmentStatus, HvacAppointmentStatus>> = {
  CONFIRMED: "TECH_EN_ROUTE",
  TECH_ASSIGNED: "TECH_EN_ROUTE",
  TECH_EN_ROUTE: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

export default async function TodayPage() {
  const ctx = await requireTenantContext();
  const today = new Date();

  // Technicians see only their own jobs; office roles see everything.
  const ownTech = ctx.role === "TECHNICIAN"
    ? await db.hvacTechnician.findFirst({ where: { tenantId: ctx.tenantId, userId: ctx.userId, isActive: true } })
    : null;

  const appts = await db.hvacAppointment.findMany({
    where: {
      tenantId: ctx.tenantId, deletedAt: null,
      startAt: { gte: startOfDay(today), lte: endOfDay(today) },
      ...(ownTech ? { technicianId: ownTech.id } : {}),
    },
    orderBy: { startAt: "asc" },
    include: { customer: true, location: true, service: true, technician: true, unit: true },
  });

  const open = appts.filter((a) => !["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Danas">
        <Link href={`/hvac-b2b/kalendar/novi?date=${isoDate(today)}`} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={15} /> Novi termin
        </Link>
      </PageHeader>
      <p className="-mt-2 mb-4 text-sm capitalize text-muted">{fmtDayLong(today)} · {open.length} otvorenih od {appts.length}</p>

      {appts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-semibold">Danas nemate zakazanih termina.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Kad zakažete termin, ovdje ćete vidjeti raspored za današnji dan.</p>
          <Link href={`/hvac-b2b/kalendar/novi?date=${isoDate(today)}`} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white">
            <Plus size={15} /> Zakaži termin
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {appts.map((a) => {
            const st = APPOINTMENT_STATUS[a.status];
            const next = NEXT[a.status];
            const maps = a.location?.address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([a.location.address, a.location.city].filter(Boolean).join(", "))}`
              : null;
            return (
              <li key={a.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-3">
                  <span className="w-12 shrink-0 font-mono text-sm font-semibold tabular-nums">{fmtTime(a.startAt)}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/hvac-b2b/kalendar/${a.id}`} className="block truncate font-semibold hover:text-sky-600 dark:hover:text-sky-300">
                      {customerDisplayName(a.customer)}
                    </Link>
                    <div className="truncate text-xs text-muted">
                      {[a.service?.name, a.location?.address, a.technician?.name].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {a.problemDescription && <p className="mt-1 line-clamp-2 text-xs text-muted">{a.problemDescription}</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
                </div>

                {/* One-hand field actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.customer.phone && (
                    <a href={`tel:${a.customer.phone}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium">
                      <Phone size={13} /> Nazovi
                    </a>
                  )}
                  {maps && (
                    <a href={maps} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium">
                      <MapPin size={13} /> Navigacija
                    </a>
                  )}
                  {next && (
                    <form action={setAppointmentStatus.bind(null, a.id)}>
                      <input type="hidden" name="status" value={next} />
                      <button className="inline-flex min-h-9 items-center rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 text-xs font-semibold text-white">
                        {APPOINTMENT_STATUS[next].label}
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
