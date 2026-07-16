/**
 * Calendar date maths + event layout for the Varel HVAC scheduler.
 * Pure functions (no DB, no server-only) so views and actions can share them.
 * Croatian week starts on Monday.
 */

export type CalView = "dan" | "tjedan" | "mjesec" | "majstori" | "popis";
export const CAL_VIEWS: { key: CalView; label: string }[] = [
  { key: "dan", label: "Dan" },
  { key: "tjedan", label: "Tjedan" },
  { key: "mjesec", label: "Mjesec" },
  { key: "majstori", label: "Majstori" },
  { key: "popis", label: "Popis" },
];

/** Visible hours in the time grids. */
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 21;
export const GRID_HOURS = DAY_END_HOUR - DAY_START_HOUR;

export function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
export function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

/** Monday-based week start. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(x, -dow);
}
export function startOfMonth(d: Date): Date { const x = startOfDay(d); x.setDate(1); return x; }
export function endOfMonth(d: Date): Date { const x = startOfMonth(d); x.setMonth(x.getMonth() + 1); return new Date(x.getTime() - 1); }

/** The 6×7 grid covering a month (Monday-based). */
export function monthGridStart(d: Date): Date { return startOfWeek(startOfMonth(d)); }

/** Inclusive date range a view needs to load. */
export function viewRange(view: CalView, date: Date): { from: Date; to: Date } {
  if (view === "mjesec") {
    const from = monthGridStart(date);
    return { from, to: endOfDay(addDays(from, 41)) };
  }
  if (view === "tjedan") {
    const from = startOfWeek(date);
    return { from, to: endOfDay(addDays(from, 6)) };
  }
  if (view === "popis") {
    const from = startOfDay(date);
    return { from, to: endOfDay(addDays(from, 13)) }; // next two weeks
  }
  return { from: startOfDay(date), to: endOfDay(date) }; // dan | majstori
}

/** Step for prev/next navigation. */
export function shiftDate(view: CalView, date: Date, dir: -1 | 1): Date {
  if (view === "mjesec") return addMonths(date, dir);
  if (view === "tjedan") return addDays(date, 7 * dir);
  if (view === "popis") return addDays(date, 14 * dir);
  return addDays(date, dir);
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function parseIsoDate(s: string | undefined | null): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return startOfDay(new Date());
}
export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function isToday(d: Date): boolean { return sameDay(d, new Date()); }

/* ---------------- Croatian formatting ---------------- */

export const fmtTime = (d: Date) => d.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" });
export const fmtDayNum = (d: Date) => String(d.getDate());
export const fmtWeekdayShort = (d: Date) => d.toLocaleDateString("hr-HR", { weekday: "short" });
export const fmtDayLong = (d: Date) => d.toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const fmtMonthYear = (d: Date) => d.toLocaleDateString("hr-HR", { month: "long", year: "numeric" });
export const fmtDateShort = (d: Date) => d.toLocaleDateString("hr-HR", { day: "numeric", month: "numeric", year: "numeric" });

/** Human label for the current range. */
export function rangeLabel(view: CalView, date: Date): string {
  if (view === "mjesec") return fmtMonthYear(date);
  if (view === "tjedan") {
    const s = startOfWeek(date);
    const e = addDays(s, 6);
    return `${fmtDateShort(s)} – ${fmtDateShort(e)}`;
  }
  if (view === "popis") return `${fmtDateShort(date)} – ${fmtDateShort(addDays(date, 13))}`;
  return fmtDayLong(date);
}

/* ---------------- time-grid geometry ---------------- */

/** Vertical position (%) of a time within the visible grid. */
export function topPercent(d: Date): number {
  const minutes = (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
  return Math.max(0, Math.min(100, (minutes / (GRID_HOURS * 60)) * 100));
}
/** Height (%) of an interval, clamped to a readable minimum. */
export function heightPercent(start: Date, end: Date): number {
  const mins = Math.max(20, (end.getTime() - start.getTime()) / 60000);
  return Math.max(3, Math.min(100, (mins / (GRID_HOURS * 60)) * 100));
}

export const gridHours = Array.from({ length: GRID_HOURS + 1 }, (_, i) => DAY_START_HOUR + i);

/* ---------------- overlap layout ---------------- */

export type Positionable = { id: string; startAt: Date; endAt: Date };

/**
 * Side-by-side layout for overlapping events in one column.
 * Returns each event's lane index and the number of lanes in its cluster.
 */
export function layoutOverlaps<T extends Positionable>(events: T[]): Map<string, { lane: number; lanes: number }> {
  const out = new Map<string, { lane: number; lanes: number }>();
  const sorted = [...events].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  let cluster: T[] = [];
  let clusterEnd = 0;

  const flush = () => {
    if (cluster.length === 0) return;
    const lanes: number[] = []; // lane -> end time
    const assigned: { ev: T; lane: number }[] = [];
    for (const ev of cluster) {
      let lane = lanes.findIndex((end) => end <= ev.startAt.getTime());
      if (lane === -1) { lane = lanes.length; lanes.push(0); }
      lanes[lane] = ev.endAt.getTime();
      assigned.push({ ev, lane });
    }
    for (const { ev, lane } of assigned) out.set(ev.id, { lane, lanes: lanes.length });
    cluster = [];
  };

  for (const ev of sorted) {
    if (cluster.length > 0 && ev.startAt.getTime() >= clusterEnd) flush();
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endAt.getTime());
  }
  flush();
  return out;
}

/** True when two intervals overlap. */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
