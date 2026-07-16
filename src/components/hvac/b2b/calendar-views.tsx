import Link from "next/link";
import {
  DAY_START_HOUR, GRID_HOURS, gridHours, topPercent, heightPercent, layoutOverlaps,
  addDays, sameDay, isToday, fmtTime, fmtWeekdayShort, fmtDayNum, isoDate, monthGridStart,
} from "@/lib/hvac/calendar";
import { APPOINTMENT_STATUS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import type { HvacAppointmentStatus } from "@/generated/prisma/client";

/** Minimal shape the calendar needs — keeps queries lean. */
export type ApptLite = {
  id: string;
  startAt: Date;
  endAt: Date;
  status: HvacAppointmentStatus;
  customer: { type: "INDIVIDUAL" | "COMPANY"; firstName: string | null; lastName: string | null; companyName: string | null };
  service: { name: string } | null;
  technician: { id: string; name: string; calendarColor: string } | null;
  location: { city: string | null } | null;
};

const GRID_H = "h-[840px]";

function HourLines() {
  return (
    <div aria-hidden className="absolute inset-0">
      {gridHours.slice(0, -1).map((h, i) => (
        <div key={h} className="absolute inset-x-0 border-t border-border/60" style={{ top: `${(i / GRID_HOURS) * 100}%` }} />
      ))}
    </div>
  );
}

function HourGutter() {
  return (
    <div className={`relative w-12 shrink-0 ${GRID_H}`}>
      {gridHours.slice(0, -1).map((h, i) => (
        <div key={h} className="absolute -translate-y-1/2 pr-2 text-right text-[10px] tabular-nums text-muted" style={{ top: `${(i / GRID_HOURS) * 100}%`, right: 0 }}>
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

function Chip({ a, compact }: { a: ApptLite; compact?: boolean }) {
  const st = APPOINTMENT_STATUS[a.status];
  return (
    <Link
      href={`/hvac-b2b/kalendar/${a.id}`}
      className="block h-full overflow-hidden rounded-md border border-border bg-card px-1.5 py-1 text-[11px] leading-tight shadow-sm transition-colors hover:border-sky-500/60"
      style={{ borderLeft: `3px solid ${a.technician?.calendarColor ?? "#94a3b8"}` }}
      title={`${fmtTime(a.startAt)} ${customerDisplayName(a.customer)} — ${st.label}`}
    >
      <div className="truncate font-semibold">{fmtTime(a.startAt)} {customerDisplayName(a.customer)}</div>
      {!compact && (
        <>
          {a.service && <div className="truncate text-muted">{a.service.name}</div>}
          <div className="mt-0.5 truncate">
            <span className={`rounded px-1 py-px text-[9px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
          </div>
        </>
      )}
    </Link>
  );
}

/** One absolutely-positioned day column of a time grid. */
function DayColumn({ day, events, href }: { day: Date; events: ApptLite[]; href: string }) {
  const dayEvents = events.filter((e) => sameDay(e.startAt, day));
  const lanes = layoutOverlaps(dayEvents);
  return (
    <div className={`relative flex-1 border-l border-border ${GRID_H}`}>
      <HourLines />
      {/* Click-to-create on an empty column */}
      <Link href={href} aria-label="Novi termin" className="absolute inset-0" />
      {dayEvents.map((a) => {
        const l = lanes.get(a.id) ?? { lane: 0, lanes: 1 };
        return (
          <div
            key={a.id}
            className="absolute px-0.5"
            style={{
              top: `${topPercent(a.startAt)}%`,
              height: `${heightPercent(a.startAt, a.endAt)}%`,
              left: `${(l.lane / l.lanes) * 100}%`,
              width: `${(1 / l.lanes) * 100}%`,
            }}
          >
            <Chip a={a} compact={l.lanes > 1} />
          </div>
        );
      })}
    </div>
  );
}

export function WeekGrid({ weekStart, events }: { weekStart: Date; events: ApptLite[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[720px]">
        <div className="flex border-b border-border">
          <div className="w-12 shrink-0" />
          {days.map((d) => (
            <div key={d.toISOString()} className={`flex-1 border-l border-border px-2 py-2 text-center text-xs ${isToday(d) ? "bg-sky-500/5" : ""}`}>
              <div className="text-muted">{fmtWeekdayShort(d)}</div>
              <div className={`font-semibold ${isToday(d) ? "text-sky-600 dark:text-sky-300" : ""}`}>{fmtDayNum(d)}</div>
            </div>
          ))}
        </div>
        <div className="flex">
          <HourGutter />
          {days.map((d) => (
            <DayColumn key={d.toISOString()} day={d} events={events} href={`/hvac-b2b/kalendar/novi?date=${isoDate(d)}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DayGrid({ date, events }: { date: Date; events: ApptLite[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex">
        <HourGutter />
        <DayColumn day={date} events={events} href={`/hvac-b2b/kalendar/novi?date=${isoDate(date)}`} />
      </div>
    </div>
  );
}

export function TechnicianColumns({
  date, technicians, events,
}: { date: Date; technicians: { id: string; name: string; calendarColor: string }[]; events: ApptLite[] }) {
  if (technicians.length === 0) {
    return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">Nemate aktivnih majstora. Dodajte majstora da biste vidjeli raspored po majstorima.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div style={{ minWidth: `${Math.max(720, technicians.length * 180)}px` }}>
        <div className="flex border-b border-border">
          <div className="w-12 shrink-0" />
          {technicians.map((t) => (
            <div key={t.id} className="flex-1 border-l border-border px-2 py-2 text-center text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ background: t.calendarColor }} /> {t.name}
              </span>
            </div>
          ))}
        </div>
        <div className="flex">
          <HourGutter />
          {technicians.map((t) => {
            const own = events.filter((e) => e.technician?.id === t.id);
            const lanes = layoutOverlaps(own);
            return (
              <div key={t.id} className={`relative flex-1 border-l border-border ${GRID_H}`}>
                <HourLines />
                <Link href={`/hvac-b2b/kalendar/novi?date=${isoDate(date)}&technicianId=${t.id}`} aria-label={`Novi termin — ${t.name}`} className="absolute inset-0" />
                {own.map((a) => {
                  const l = lanes.get(a.id) ?? { lane: 0, lanes: 1 };
                  return (
                    <div key={a.id} className="absolute px-0.5" style={{
                      top: `${topPercent(a.startAt)}%`, height: `${heightPercent(a.startAt, a.endAt)}%`,
                      left: `${(l.lane / l.lanes) * 100}%`, width: `${(1 / l.lanes) * 100}%`,
                    }}>
                      <Chip a={a} compact={l.lanes > 1} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MonthGrid({ date, events }: { date: Date; events: ApptLite[] }) {
  const start = monthGridStart(date);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const month = date.getMonth();
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border text-center text-xs text-muted">
        {["pon", "uto", "sri", "čet", "pet", "sub", "ned"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const dayEvents = events.filter((e) => sameDay(e.startAt, d)).slice(0, 3);
          const total = events.filter((e) => sameDay(e.startAt, d)).length;
          return (
            <div key={d.toISOString()} className={`min-h-[104px] border-b border-l border-border p-1 ${d.getMonth() !== month ? "bg-background-secondary/60" : ""}`}>
              <div className="flex items-center justify-between px-0.5">
                <Link href={`/hvac-b2b/kalendar?view=dan&date=${isoDate(d)}`} className={`text-xs ${isToday(d) ? "grid h-5 w-5 place-items-center rounded-full bg-sky-500 font-bold text-white" : "text-muted hover:text-foreground"}`}>
                  {fmtDayNum(d)}
                </Link>
                <Link href={`/hvac-b2b/kalendar/novi?date=${isoDate(d)}`} className="text-xs text-muted opacity-0 hover:text-sky-500 focus:opacity-100 group-hover:opacity-100" aria-label="Novi termin">+</Link>
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.map((a) => (
                  <Link key={a.id} href={`/hvac-b2b/kalendar/${a.id}`} className="block truncate rounded px-1 py-0.5 text-[10px] hover:bg-soft" style={{ borderLeft: `3px solid ${a.technician?.calendarColor ?? "#94a3b8"}` }}>
                    {fmtTime(a.startAt)} {customerDisplayName(a.customer)}
                  </Link>
                ))}
                {total > 3 && (
                  <Link href={`/hvac-b2b/kalendar?view=dan&date=${isoDate(d)}`} className="block px-1 text-[10px] text-muted hover:text-foreground">+{total - 3} više</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Mobile-friendly alternative to the grids. */
export function ListView({ events }: { events: ApptLite[] }) {
  if (events.length === 0) {
    return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">Nema termina u ovom razdoblju.</div>;
  }
  const byDay = new Map<string, ApptLite[]>();
  for (const e of events) {
    const k = isoDate(e.startAt);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  return (
    <div className="space-y-4">
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day}>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            {new Date(day).toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "long" })}
          </h3>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {list.map((a) => {
              const st = APPOINTMENT_STATUS[a.status];
              return (
                <li key={a.id}>
                  <Link href={`/hvac-b2b/kalendar/${a.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-soft/60">
                    <span className="w-11 shrink-0 font-mono text-xs tabular-nums text-muted">{fmtTime(a.startAt)}</span>
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: a.technician?.calendarColor ?? "#94a3b8" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{customerDisplayName(a.customer)}</span>
                      <span className="block truncate text-xs text-muted">
                        {[a.service?.name, a.technician?.name, a.location?.city].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
