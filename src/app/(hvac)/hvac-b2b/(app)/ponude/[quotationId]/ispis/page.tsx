import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { QUOTE_STATUS } from "@/lib/hvac/b2b-config";
import { billingName, billingAddressLines } from "@/lib/hvac/documents";
import { DocumentPrint } from "@/components/hvac/b2b/document-print";

export const dynamic = "force-dynamic";

export default async function QuotationPrintPage(props: PageProps<"/hvac-b2b/ponude/[quotationId]/ispis">) {
  const ctx = await requireTenantContext();
  const { quotationId } = await props.params;
  const t = ctx.tenant;
  const settings = await db.hvacTenantSettings.findUnique({ where: { tenantId: ctx.tenantId } });

  const q = await db.hvacQuotation.findFirst({
    where: { id: quotationId, tenantId: ctx.tenantId },
    include: { customer: true, items: { orderBy: { position: "asc" } } },
  });
  if (!q) notFound();

  return (
    <DocumentPrint
      kind="quote"
      showPrintButton
      tenant={{
        name: t.name, logoUrl: t.logoUrl, legalForm: t.legalForm, oib: t.oib,
        address: t.address, city: t.city, postalCode: t.postalCode, phone: t.phone, email: t.email,
        iban: settings?.iban, bankName: settings?.bankName, vatRegistered: t.vatRegistered, footer: settings?.invoiceFooter ?? t.documentFooter,
      }}
      number={q.number}
      issueDate={q.issueDate}
      secondaryDate={{ label: "Vrijedi do", date: q.validUntil }}
      statusLabel={QUOTE_STATUS[q.status].label}
      customer={{ name: billingName(q.customer), oib: q.customer.oib, addressLines: billingAddressLines(q.customer), email: q.customer.email }}
      items={q.items.map((it) => ({
        id: it.id, description: it.description, quantity: Number(it.quantity), unit: it.unit,
        unitPriceEur: Number(it.unitPriceEur), discountPct: Number(it.discountPct), vatPct: Number(it.vatPct), totalEur: Number(it.totalEur),
      }))}
      subtotalEur={Number(q.subtotalEur)}
      vatEur={Number(q.vatEur)}
      totalEur={Number(q.totalEur)}
      paymentTerms={q.paymentTerms}
      notes={q.notes}
    />
  );
}
