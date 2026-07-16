import Link from "next/link";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { loadAppointmentOptions } from "@/lib/hvac/appointment-options";
import { isoDate } from "@/lib/hvac/calendar";
import { PageHeader } from "@/components/admin/ui";
import { AppointmentForm } from "@/components/hvac/b2b/appointment-form";
import { createAppointment } from "@/server/actions/hvac-appointments";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage(props: PageProps<"/hvac-b2b/kalendar/novi">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const options = await loadAppointmentOptions(ctx.tenantId);

  const s = (k: string) => (typeof sp?.[k] === "string" ? (sp[k] as string) : undefined);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Novi termin" />
      <Link href="/hvac-b2b/kalendar" className="text-sm text-muted hover:text-foreground">← Kalendar</Link>

      {options.customers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Prvo dodajte klijenta kako biste mogli zakazati termin.
          <Link href="/hvac-b2b/klijenti/novi" className="ml-1 font-semibold text-sky-600 hover:underline dark:text-sky-300">Dodaj klijenta</Link>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <AppointmentForm
            options={options}
            defaults={{
              date: s("date") ?? isoDate(new Date()),
              startTime: s("time") ?? "08:00",
              technicianId: s("technicianId"),
              customerId: s("customerId"),
              durationMin: 60,
            }}
            action={createAppointment}
            submitLabel="Zakaži termin"
          />
        </div>
      )}
    </div>
  );
}
