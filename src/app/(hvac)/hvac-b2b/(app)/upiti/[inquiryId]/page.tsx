import Link from "next/link";
import { notFound } from "next/navigation";
import { UserPlus, CalendarPlus, Link2 } from "lucide-react";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { INQUIRY_STATUS, SOURCE_LABELS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { PageHeader, Select, FormSection } from "@/components/admin/ui";
import { setInquiryStatus, linkInquiryCustomer, createCustomerFromInquiry, scheduleFromInquiry } from "@/server/actions/hvac-inquiries";
import type { HvacInquiryStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function InquiryPage(props: PageProps<"/hvac-b2b/upiti/[inquiryId]">) {
  const ctx = await requireTenantContext();
  const { inquiryId } = await props.params;

  const inq = await db.hvacInquiry.findFirst({ where: { id: inquiryId, tenantId: ctx.tenantId } });
  if (!inq) notFound();

  const [customer, customers, service] = await Promise.all([
    inq.customerId ? db.hvacCustomer.findFirst({ where: { id: inq.customerId, tenantId: ctx.tenantId } }) : Promise.resolve(null),
    db.hvacCustomer.findMany({ where: { tenantId: ctx.tenantId, archivedAt: null }, orderBy: [{ companyName: "asc" }, { lastName: "asc" }], take: 300, select: { id: true, type: true, firstName: true, lastName: true, companyName: true } }),
    inq.serviceId ? db.hvacService.findFirst({ where: { id: inq.serviceId, tenantId: ctx.tenantId } }) : Promise.resolve(null),
  ]);

  const st = INQUIRY_STATUS[inq.status];

  return (
    <div className="max-w-2xl">
      <PageHeader title={inq.leadName ?? "Upit"}>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
      </PageHeader>
      <Link href="/hvac-b2b/upiti" className="text-sm text-muted hover:text-foreground">← Upiti</Link>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
        <dl className="space-y-1.5">
          <Row k="Telefon">{inq.leadPhone ? <a href={`tel:${inq.leadPhone}`} className="text-sky-600 hover:underline dark:text-sky-300">{inq.leadPhone}</a> : "—"}</Row>
          <Row k="E-mail">{inq.leadEmail ? <a href={`mailto:${inq.leadEmail}`} className="text-sky-600 hover:underline dark:text-sky-300">{inq.leadEmail}</a> : "—"}</Row>
          <Row k="Izvor">{SOURCE_LABELS[inq.source]}</Row>
          <Row k="Usluga">{service?.name ?? "—"}</Row>
          <Row k="Željeni termin">{inq.preferredTime ?? "—"}</Row>
          <Row k="Zaprimljeno">{inq.createdAt.toISOString().slice(0, 16).replace("T", " ")}</Row>
          <Row k="Klijent">
            {customer ? <Link href={`/hvac-b2b/klijenti/${customer.id}`} className="text-sky-600 hover:underline dark:text-sky-300">{customerDisplayName(customer)}</Link> : "nije povezan"}
          </Row>
        </dl>
        {inq.issueDescription && <p className="mt-3 border-t border-border pt-3">{inq.issueDescription}</p>}
      </div>

      {/* Status */}
      <FormSection title="Status">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(INQUIRY_STATUS) as HvacInquiryStatus[]).filter((s) => s !== inq.status).map((s) => (
            <form key={s} action={setInquiryStatus.bind(null, inq.id)}>
              <input type="hidden" name="status" value={s} />
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-sky-500/50">{INQUIRY_STATUS[s].label}</button>
            </form>
          ))}
        </div>
      </FormSection>

      {/* Conversion */}
      <FormSection title="Pretvori upit">
        {!customer ? (
          <div className="space-y-3">
            <form action={createCustomerFromInquiry.bind(null, inq.id)}>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                <UserPlus size={15} /> Kreiraj novog klijenta iz upita
              </button>
            </form>
            {customers.length > 0 && (
              <form action={linkInquiryCustomer.bind(null, inq.id)} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[14rem] flex-1">
                  <span className="mb-1 block text-sm font-medium">…ili poveži s postojećim klijentom</span>
                  <Select name="customerId" defaultValue="">
                    <option value="">— odaberite —</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{customerDisplayName(c)}</option>)}
                  </Select>
                </div>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-sky-500/50"><Link2 size={15} /> Poveži</button>
              </form>
            )}
          </div>
        ) : (
          <form action={scheduleFromInquiry.bind(null, inq.id)}>
            <p className="mb-2 text-sm text-muted">Klijent je povezan. Sada možete dogovoriti termin.</p>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
              <CalendarPlus size={15} /> Dogovori termin
            </button>
          </form>
        )}
      </FormSection>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
