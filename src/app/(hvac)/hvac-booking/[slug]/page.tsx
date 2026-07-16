import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { isHvacB2bEnabled } from "@/lib/hvac/b2b-auth";
import { BookingForm } from "@/components/hvac/booking/booking-form";

export const dynamic = "force-dynamic";

async function loadTenant(slug: string) {
  return db.hvacTenant.findFirst({
    where: { slug, deletedAt: null },
    select: {
      id: true, name: true, logoUrl: true, phone: true, email: true, city: true,
      bookingSettings: { select: { enabled: true, serviceArea: true, publicPhone: true, publicEmail: true, minNoticeHours: true } },
    },
  });
}

export async function generateMetadata(props: PageProps<"/hvac-booking/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const tenant = await loadTenant(slug);
  if (!tenant?.bookingSettings?.enabled) return { title: "Booking", robots: { index: false, follow: false } };
  return {
    title: `Naruči servis klime — ${tenant.name}`,
    description: `Zatražite termin za servis, montažu ili popravak klima-uređaja kod ${tenant.name}.`,
  };
}

export default async function BookingPage(props: PageProps<"/hvac-booking/[slug]">) {
  if (!isHvacB2bEnabled()) notFound();
  const { slug } = await props.params;
  const tenant = await loadTenant(slug);
  if (!tenant || !tenant.bookingSettings?.enabled) notFound();

  const services = await db.hvacService.findMany({
    where: { tenantId: tenant.id, isActive: true, bookingVisible: true },
    orderBy: { position: "asc" }, select: { id: true, name: true },
  });
  const b = tenant.bookingSettings;
  const phone = b.publicPhone || tenant.phone;
  const email = b.publicEmail || tenant.email;

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <header className="text-center">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logoUrl} alt={tenant.name} className="mx-auto mb-4 max-h-16" />
          ) : (
            <div className="text-2xl font-bold">{tenant.name}</div>
          )}
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Naručite servis klima-uređaja</h1>
          <p className="mt-2 text-muted">Ispunite obrazac i javit ćemo vam se radi potvrde termina.</p>

          <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-muted">
            {phone && <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone size={14} /> {phone}</a>}
            {email && <a href={`mailto:${email}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Mail size={14} /> {email}</a>}
            {b.serviceArea && <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {b.serviceArea}</span>}
            {b.minNoticeHours ? <span className="inline-flex items-center gap-1.5"><Clock size={14} /> Najava min. {b.minNoticeHours} h</span> : null}
          </div>
        </header>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <BookingForm slug={slug} services={services} />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Pokreće <span className="font-semibold">Varel HVAC</span>
        </p>
      </div>
    </main>
  );
}
