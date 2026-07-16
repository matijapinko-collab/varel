import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { INQUIRY_STATUS, SOURCE_LABELS, TONE_CLASS, customerDisplayName } from "@/lib/hvac/b2b-config";
import { PageHeader, Field, Input, Select, Textarea, SubmitButton, FormSection, AdminTable } from "@/components/admin/ui";
import { createInquiry } from "@/server/actions/hvac-inquiries";
import type { HvacInquiryStatus, HvacSource, Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const MANUAL_SOURCES: HvacSource[] = ["PHONE", "EMAIL", "WEBSITE", "SOCIAL", "RECOMMENDATION", "MANUAL", "OTHER"];

export default async function InquiriesPage(props: PageProps<"/hvac-b2b/upiti">) {
  const ctx = await requireTenantContext();
  const sp = await props.searchParams;
  const status = typeof sp?.status === "string" ? sp.status : "";

  const where: Prisma.HvacInquiryWhereInput = {
    tenantId: ctx.tenantId,
    ...(status ? { status: status as HvacInquiryStatus } : {}),
  };

  const [inquiries, services, newCount] = await Promise.all([
    db.hvacInquiry.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    db.hvacService.findMany({ where: { tenantId: ctx.tenantId, isActive: true }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    db.hvacInquiry.count({ where: { tenantId: ctx.tenantId, status: "NEW" } }),
  ]);

  const customerIds = inquiries.map((i) => i.customerId).filter((x): x is string => Boolean(x));
  const customers = customerIds.length
    ? await db.hvacCustomer.findMany({ where: { tenantId: ctx.tenantId, id: { in: customerIds } }, select: { id: true, type: true, firstName: true, lastName: true, companyName: true } })
    : [];
  const customerName = (id: string | null) => {
    const c = customers.find((x) => x.id === id);
    return c ? customerDisplayName(c) : null;
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Upiti" />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Dolazni upiti iz bookinga, telefona i e-maila.
        {newCount > 0 && <span className="ml-1 font-medium text-sky-600 dark:text-sky-300">{newCount} novih.</span>}
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
        <Link href="/hvac-b2b/upiti" className={`rounded-full px-2.5 py-1 font-semibold ${!status ? "bg-sky-500 text-white" : "border border-border text-muted hover:text-foreground"}`}>Svi</Link>
        {(Object.keys(INQUIRY_STATUS) as HvacInquiryStatus[]).map((s) => (
          <Link key={s} href={`/hvac-b2b/upiti?status=${s}`} className={`rounded-full px-2.5 py-1 font-semibold ${status === s ? "bg-sky-500 text-white" : "border border-border text-muted hover:text-foreground"}`}>
            {INQUIRY_STATUS[s].label}
          </Link>
        ))}
      </div>

      <details className="mb-5 rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Novi upit (telefon / e-mail)</summary>
        <form action={createInquiry} className="border-t border-border p-4">
          <FormSection title="">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ime i prezime"><Input name="leadName" required /></Field>
              <Field label="Telefon"><Input name="leadPhone" /></Field>
              <Field label="E-mail"><Input name="leadEmail" type="email" /></Field>
              <Field label="Izvor">
                <Select name="source" defaultValue="PHONE">
                  {MANUAL_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                </Select>
              </Field>
              <Field label="Usluga">
                <Select name="serviceId" defaultValue="">
                  <option value="">—</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Željeni termin"><Input name="preferredTime" placeholder="npr. sljedeći tjedan ujutro" /></Field>
            </div>
            <Field label="Opis kvara"><Textarea name="issueDescription" rows={2} /></Field>
            <SubmitButton label="Spremi upit" />
          </FormSection>
        </form>
      </details>

      {inquiries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          {status ? "Nema upita s ovim statusom." : "Još nema upita. Upiti iz Varel bookinga pojavit će se ovdje automatski."}
        </div>
      ) : (
        <AdminTable headers={["Podnositelj", "Kontakt", "Klijent", "Izvor", "Status", "Zaprimljeno"]} empty={false}>
          {inquiries.map((i) => {
            const st = INQUIRY_STATUS[i.status];
            return (
              <tr key={i.id}>
                <td className="px-3 py-2.5">
                  <Link href={`/hvac-b2b/upiti/${i.id}`} className="font-medium hover:text-sky-600 dark:hover:text-sky-300">{i.leadName ?? "—"}</Link>
                  {i.issueDescription && <div className="max-w-xs truncate text-xs text-muted">{i.issueDescription}</div>}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">{[i.leadPhone, i.leadEmail].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-3 py-2.5 text-xs">
                  {i.customerId ? <Link href={`/hvac-b2b/klijenti/${i.customerId}`} className="text-sky-600 hover:underline dark:text-sky-300">{customerName(i.customerId) ?? "Klijent"}</Link> : <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted">{SOURCE_LABELS[i.source]}</td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE_CLASS[st.tone]}`}>{st.label}</span></td>
                <td className="px-3 py-2.5 text-xs text-muted">{i.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            );
          })}
        </AdminTable>
      )}
    </div>
  );
}
