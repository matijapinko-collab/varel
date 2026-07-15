import Link from "next/link";
import { UserPlus, CalendarPlus, ClipboardList, FileText, AirVent, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d = new Date()) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function startOfMonth() { const x = new Date(); x.setDate(1); x.setHours(0, 0, 0, 0); return x; }

export default async function DashboardPage() {
  const ctx = await requireTenantContext();
  const t = ctx.tenantId;
  const in30 = new Date(Date.now() + 30 * 86_400_000);

  const [todays, openWO, newInquiries, awaiting, unpaid, reminders, newCustomers] = await Promise.all([
    db.hvacAppointment.count({ where: { tenantId: t, deletedAt: null, startAt: { gte: startOfDay(), lte: endOfDay() } } }),
    db.hvacWorkOrder.count({ where: { tenantId: t, deletedAt: null, status: { in: ["DRAFT", "SCHEDULED", "EN_ROUTE", "IN_PROGRESS", "PAUSED", "WAITING_PARTS"] } } }),
    db.hvacInquiry.count({ where: { tenantId: t, status: "NEW" } }),
    db.hvacAppointment.count({ where: { tenantId: t, deletedAt: null, status: "WAITING_CONFIRMATION" } }),
    db.hvacInvoice.count({ where: { tenantId: t, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } } }),
    db.hvacServiceReminder.count({ where: { tenantId: t, nextServiceDate: { lte: in30 }, status: { in: ["FUTURE", "UPCOMING", "READY"] } } }),
    db.hvacCustomer.count({ where: { tenantId: t, createdAt: { gte: startOfMonth() } } }),
  ]);

  const stats = [
    { label: "Današnji termini", value: todays, href: "/hvac-b2b/danas" },
    { label: "Otvoreni radni nalozi", value: openWO, href: "/hvac-b2b/radni-nalozi" },
    { label: "Novi upiti", value: newInquiries, href: "/hvac-b2b/upiti" },
    { label: "Termini koji čekaju potvrdu", value: awaiting, href: "/hvac-b2b/kalendar" },
    { label: "Nenaplaćeni računi", value: unpaid, href: "/hvac-b2b/racuni" },
    { label: "Servisi uskoro (30 dana)", value: reminders, href: "/hvac-b2b/servisni-podsjetnici" },
    { label: "Novi klijenti ovog mjeseca", value: newCustomers, href: "/hvac-b2b/klijenti" },
  ];

  const quick = [
    { label: "Dodaj klijenta", href: "/hvac-b2b/klijenti", icon: UserPlus },
    { label: "Dodaj termin", href: "/hvac-b2b/kalendar", icon: CalendarPlus },
    { label: "Izradi radni nalog", href: "/hvac-b2b/radni-nalozi", icon: ClipboardList },
    { label: "Izradi ponudu", href: "/hvac-b2b/ponude", icon: FileText },
    { label: "Dodaj klima-uređaj", href: "/hvac-b2b/uredaji", icon: AirVent },
  ];

  return (
    <div>
      <PageHeader title={`Dobrodošli, ${ctx.user.name.split(" ")[0]}`} />

      {!ctx.tenant.onboardingCompleted && (
        <Link href="/hvac-b2b/onboarding" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 to-cyan-400/5 p-4 hover:border-sky-500/50">
          <div>
            <div className="font-semibold">Dovršite postavljanje tvrtke</div>
            <div className="text-sm text-muted">Dodajte usluge, radno vrijeme i prvog majstora da biste mogli početi zakazivati termine.</div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white">Nastavi <ArrowRight size={15} /></span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-sky-500/40">
            <div className="text-2xl font-bold tabular-nums">{s.value}</div>
            <div className="mt-1 text-xs text-muted">{s.label}</div>
          </Link>
        ))}
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Brze radnje</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((q) => (
          <Link key={q.label} href={q.href} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:border-sky-500/50">
            <q.icon size={16} className="text-sky-500" /> {q.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
