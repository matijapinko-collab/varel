import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Ban, MapPin, Phone, FileText } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { loadAppointmentOptions } from "@/lib/hvac/appointment-options";
import { APPOINTMENT_STATUS, PRIORITY, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { fmtDayLong, fmtTime, isoDate } from "@/lib/hvac/calendar";
import { PageHeader, FormSection } from "@/components/admin/ui";
import { AppointmentForm } from "@/components/hvac/b2b/appointment-form";
import { updateAppointment, setAppointmentStatus, cancelAppointment, duplicateAppointment } from "@/server/actions/hvac-appointments";
import { createWorkOrderFromAppointment } from "@/server/actions/hvac-workorders";
import type { HvacAppointmentStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/** Statuses offered as one-click transitions. */
const QUICK: HvacAppointmentStatus[] = ["CONFIRMED", "TECH_EN_ROUTE", "IN_PROGRESS", "COMPLETED", "WAITING_PARTS", "POSTPONED"];

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function AppointmentPage(props: PageProps<"/hvac-b2b/kalendar/[appointmentId]">) {
  const ctx = await requireTenantContext();
  const { appointmentId } = await props.params;

  const a = await db.hvacAppointment.findFirst({
    where: { id: appointmentId, tenantId: ctx.tenantId, deletedAt: null },
    include: { customer: true, location: true, unit: true, service: true, technician: true },
  });
  if (!a) notFound();

  const workOrder = await db.hvacWorkOrder.findFirst({
    where: { tenantId: ctx.tenantId, appointmentId: a.id, deletedAt: null },
    select: { id: true, number: true },
  });
  const options = await loadAppointmentOptions(ctx.tenantId);
  const st = APPOINTMENT_STATUS[a.status];
  const durationMin = Math.round((a.endAt.getTime() - a.startAt.getTime()) / 60000);
  const mapsUrl = a.location?.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([a.location.address, a.location.city].filter(Boolean).join(", "))}`
    : null;

  return (
    <div className="max-w-3xl">
      <PageHeader title={customerDisplayName(a.customer)}>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[PRIORITY[a.priority].tone]}`}>{PRIORITY[a.priority].label}</span>
      </PageHeader>
      <Link href={`/hvac-b2b/kalendar?view=dan&date=${isoDate(a.startAt)}`} className="text-sm text-muted hover:text-foreground">← Kalendar</Link>

      {/* Summary */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-semibold capitalize">{fmtDayLong(a.startAt)}</div>
        <div className="text-sm text-muted">{fmtTime(a.startAt)} – {fmtTime(a.endAt)} · {durationMin} min{a.service ? ` · ${a.service.name}` : ""}</div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {a.technician && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.technician.calendarColor }} /> {a.technician.name}
            </span>
          )}
          {a.customer.phone && (
            <a href={`tel:${a.customer.phone}`} className="inline-flex items-center gap-1.5 text-sky-600 hover:underline dark:text-sky-300"><Phone size={14} /> {a.customer.phone}</a>
          )}
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sky-600 hover:underline dark:text-sky-300"><MapPin size={14} /> Navigacija</a>
          )}
        </div>
        {a.unit && <p className="mt-2 text-sm text-muted">Uređaj: {[a.unit.manufacturer, a.unit.model].filter(Boolean).join(" ") || a.unit.internalName}</p>}
        {a.problemDescription && <p className="mt-2 border-t border-border pt-2 text-sm">{a.problemDescription}</p>}
      </div>

      {/* Quick status + actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK.filter((s) => s !== a.status).map((s) => (
          <form key={s} action={setAppointmentStatus.bind(null, a.id)}>
            <input type="hidden" name="status" value={s} />
            <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-sky-500/50">{APPOINTMENT_STATUS[s].label}</button>
          </form>
        ))}
        <form action={duplicateAppointment.bind(null, a.id)}>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"><Copy size={13} /> Dupliciraj (+7 dana)</button>
        </form>
        {a.status !== "CANCELLED" && (
          <form action={cancelAppointment.bind(null, a.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-red-500"><Ban size={13} /> Otkaži</button>
          </form>
        )}
        {workOrder ? (
          <Link href={`/hvac-b2b/radni-nalozi/${workOrder.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-500/5 dark:text-sky-300"><FileText size={13} /> Radni nalog {workOrder.number}</Link>
        ) : (
          <form action={createWorkOrderFromAppointment.bind(null, a.id)}>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"><FileText size={13} /> Kreiraj radni nalog</button>
          </form>
        )}
      </div>

      <FormSection title="Uredi termin">
        <AppointmentForm
          options={options}
          defaults={{
            customerId: a.customerId,
            locationId: a.locationId ?? undefined,
            unitId: a.unitId ?? undefined,
            serviceId: a.serviceId ?? undefined,
            technicianId: a.technicianId ?? undefined,
            date: isoDate(a.startAt),
            startTime: hhmm(a.startAt),
            durationMin,
            status: a.status,
            priority: a.priority,
            problemDescription: a.problemDescription ?? undefined,
            internalNote: a.internalNote ?? undefined,
            customerNote: a.customerNote ?? undefined,
          }}
          action={updateAppointment.bind(null, a.id)}
          submitLabel="Spremi termin"
        />
      </FormSection>
    </div>
  );
}
