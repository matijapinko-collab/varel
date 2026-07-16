import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import {
  CAL_VIEWS, viewRange, shiftDate, rangeLabel, parseIsoDate, isoDate, startOfWeek,
  type CalView,
} from "@/lib/hvac/calendar";
import { APPOINTMENT_STATUS } from "@/lib/hvac/b2b-config";
import { WeekGrid, DayGrid, MonthGrid, TechnicianColumns, ListView, type ApptLite } from "@/components/hvac/b2b/calendar-views";
import type { HvacAppointmentStatus, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const VIEW_KEYS = CAL_VIEWS.map((v) => v.key);

export default async function CalendarPage(props: PageProps<"/hvac-b2b/kalendar">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;

  const view: CalView = VIEW_KEYS.includes(sp?.view as CalView) ? (sp!.view as CalView) : "tjedan";
  const date = parseIsoDate(typeof sp?.date === "string" ? sp.date : undefined);
  const technicianId = typeof sp?.technicianId === "string" ? sp.technicianId : "";
  const status = typeof sp?.status === "string" ? sp.status : "";

  const { from, to } = viewRange(view, date);

  const where: Prisma.HvacAppointmentWhereInput = {
    tenantId: ctx.tenantId,
    deletedAt: null,
    startAt: { gte: from, lte: to },
    ...(technicianId ? { technicianId } : {}),
    ...(status ? { status: status as HvacAppointmentStatus } : {}),
  };

  const [appointments, technicians] = await Promise.all([
    db.hvacAppointment.findMany({
      where,
      orderBy: { startAt: "asc" },
      select: {
        id: true, startAt: true, endAt: true, status: true,
        customer: { select: { type: true, firstName: true, lastName: true, companyName: true } },
        service: { select: { name: true } },
        technician: { select: { id: true, name: true, calendarColor: true } },
        location: { select: { city: true } },
      },
    }),
    db.hvacTechnician.findMany({
      where: { tenantId: ctx.tenantId, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, calendarColor: true },
    }),
  ]);

  const events = appointments as unknown as ApptLite[];

  const q = (over: Record<string, string>) => {
    const p = new URLSearchParams({ view, date: isoDate(date), ...(technicianId ? { technicianId } : {}), ...(status ? { status } : {}), ...over });
    return `/hvac-b2b/kalendar?${p}`;
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={q({ date: isoDate(shiftDate(view, date, -1)) })} aria-label="Prethodno" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:border-sky-500/50"><ChevronLeft size={16} /></Link>
          <Link href={q({ date: isoDate(new Date()) })} className="rounded-lg border border-border px-3 py-2 text-sm hover:border-sky-500/50">Danas</Link>
          <Link href={q({ date: isoDate(shiftDate(view, date, 1)) })} aria-label="Sljedeće" className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:border-sky-500/50"><ChevronRight size={16} /></Link>
          <h1 className="ml-1 text-lg font-bold capitalize tracking-tight">{rangeLabel(view, date)}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {CAL_VIEWS.map((v) => (
              <Link key={v.key} href={q({ view: v.key })} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${view === v.key ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white" : "text-muted hover:text-foreground"}`}>
                {v.label}
              </Link>
            ))}
          </div>
          <Link href={`/hvac-b2b/kalendar/novi?date=${isoDate(date)}`} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
            <Plus size={15} /> Novi termin
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="date" value={isoDate(date)} />
        <select name="technicianId" defaultValue={technicianId} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
          <option value="">Svi majstori</option>
          {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select name="status" defaultValue={status} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
          <option value="">Svi statusi</option>
          {(Object.keys(APPOINTMENT_STATUS) as HvacAppointmentStatus[]).map((s) => (
            <option key={s} value={s}>{APPOINTMENT_STATUS[s].label}</option>
          ))}
        </select>
        <button className="h-9 rounded-lg border border-border px-3 hover:border-sky-500/50">Filtriraj</button>
        {(technicianId || status) && <Link href={`/hvac-b2b/kalendar?view=${view}&date=${isoDate(date)}`} className="text-xs text-muted hover:text-foreground">Poništi</Link>}
        <span className="ml-auto text-xs text-muted">{events.length} termina</span>
      </form>

      {view === "tjedan" && <WeekGrid weekStart={startOfWeek(date)} events={events} />}
      {view === "dan" && <DayGrid date={date} events={events} />}
      {view === "mjesec" && <MonthGrid date={date} events={events} />}
      {view === "majstori" && <TechnicianColumns date={date} technicians={technicians} events={events} />}
      {view === "popis" && <ListView events={events} />}

      <p className="mt-3 text-xs text-muted lg:hidden">Savjet: na mobitelu je prikaz <strong>Popis</strong> najpregledniji.</p>
    </div>
  );
}
