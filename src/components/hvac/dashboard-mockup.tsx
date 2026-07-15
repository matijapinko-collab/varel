import { CalendarDays, ClipboardList, BellRing, Wrench, MapPin, Signal } from "lucide-react";

/**
 * Product mockup built from real UI components (not a decorative image), using
 * realistic fictional demo data. Labelled as a planned-interface preview.
 * Decorative for screen readers (the surrounding section explains it in text).
 */

const STATUS_STYLE: Record<string, string> = {
  "Potvrđeno": "bg-sky-500/10 text-sky-600 dark:text-sky-300",
  "Na putu": "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  "U tijeku": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  "Završeno": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  "Čeka dijelove": "bg-slate-400/15 text-slate-500 dark:text-slate-300",
};

function Status({ label }: { label: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[label] ?? "bg-soft text-muted"}`}>{label}</span>;
}

const orders = [
  { time: "08:30", client: "Ana Perić", tech: "Marko Horvat", status: "Završeno" },
  { time: "10:00", client: "Caffe Bar Mol", tech: "Ivan Kovač", status: "U tijeku" },
  { time: "12:15", client: "Obitelj Novak", tech: "Luka Marić", status: "Na putu" },
  { time: "14:00", client: "Ordinacija Dr. Kos", tech: "Marko Horvat", status: "Potvrđeno" },
  { time: "16:30", client: "Hotel Adria", tech: "Ivan Kovač", status: "Čeka dijelove" },
];

export function DashboardMockup() {
  return (
    <div aria-hidden="true" className="relative">
      {/* Cool glow behind the dashboard */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-sky-500/15 via-cyan-400/10 to-transparent blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-sky-500/5">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-background-secondary px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <div className="ml-3 flex-1 truncate rounded-md bg-background px-3 py-1 text-[11px] text-muted">app.varel.io/hvac · Demo Klima Servis d.o.o.</div>
        </div>

        <div className="grid grid-cols-[auto_1fr] text-xs">
          {/* Sidebar */}
          <aside className="hidden w-40 flex-col gap-1 border-r border-border bg-background-secondary p-3 sm:flex">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-sky-500 to-cyan-400 text-[11px] font-black text-white">V</span>
              <span className="text-[11px] font-bold">HVAC</span>
            </div>
            {[
              { icon: CalendarDays, label: "Kalendar", active: true },
              { icon: ClipboardList, label: "Radni nalozi" },
              { icon: Wrench, label: "Uređaji" },
              { icon: BellRing, label: "Podsjetnici" },
            ].map((i) => (
              <div key={i.label} className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${i.active ? "bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-300" : "text-muted"}`}>
                <i.icon size={13} /> {i.label}
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="min-w-0 p-3.5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-muted">Danas · pon 14.07.</div>
                <div className="text-sm font-bold">Radni nalozi</div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 5 termina
              </div>
            </div>

            {/* Orders list */}
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {orders.map((o) => (
                <div key={o.time} className="flex items-center gap-2 px-2.5 py-2">
                  <span className="w-9 shrink-0 font-mono text-[11px] text-muted">{o.time}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{o.client}</div>
                    <div className="truncate text-[10px] text-muted">{o.tech}</div>
                  </div>
                  <Status label={o.status} />
                </div>
              ))}
            </div>

            {/* Reminder strip */}
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-2.5">
              <BellRing size={14} className="mt-0.5 shrink-0 text-sky-500" />
              <div>
                <div className="text-[11px] font-semibold">3 uređaja čekaju godišnji servis</div>
                <div className="text-[10px] text-muted">Pošaljite podsjetnik i rezervirajte nove termine.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating mobile work-order card */}
      <div className="absolute -bottom-6 -right-3 w-44 overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:-right-6 sm:w-52">
        <div className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-cyan-500 px-3 py-2 text-white">
          <span className="text-[11px] font-bold">Radni nalog</span>
          <Signal size={13} />
        </div>
        <div className="space-y-2 p-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted"><MapPin size={12} /> Ilica 214, Zagreb</div>
          <div><span className="text-muted">Uređaj:</span> Daikin FTXM35</div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Majstor</span>
            <span className="font-semibold">Luka Marić</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Status</span>
            <Status label="Na putu" />
          </div>
          <button className="mt-1 w-full rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 py-1.5 text-center text-[11px] font-semibold text-white">Otvori nalog</button>
        </div>
      </div>
    </div>
  );
}
