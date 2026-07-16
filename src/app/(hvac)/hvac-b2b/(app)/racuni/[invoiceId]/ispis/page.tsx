import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext } from "@/lib/hvac/tenant";
import { INVOICE_STATUS } from "@/lib/hvac/b2b-config";
import { billingName, billingAddressLines } from "@/lib/hvac/documents";
import { DocumentPrint } from "@/components/hvac/b2b/document-print";

export const dynamic = "force-dynamic";

export default async function InvoicePrintPage(props: PageProps<"/hvac-b2b/racuni/[invoiceId]/ispis">) {
  const ctx = await requireTenantContext();
  const { invoiceId } = await props.params;
  const t = ctx.tenant;
  const settings = await db.hvacTenantSettings.findUnique({ where: { tenantId: ctx.tenantId } });

  const inv = await db.hvacInvoice.findFirst({
    where: { id: invoiceId, tenantId: ctx.tenantId },
    include: { customer: true, items: { orderBy: { position: "asc" } }, payments: true },
  });
  if (!inv) notFound();

  const paid = inv.payments.reduce((s, p) => s + Number(p.amountEur), 0);
  const addr = inv.billingAddress ? [inv.billingAddress] : billingAddressLines(inv.customer);

  return (
    <DocumentPrint
      kind="invoice"
      showPrintButton
      tenant={{
        name: t.name, logoUrl: t.logoUrl, legalForm: t.legalForm, oib: t.oib,
        address: t.address, city: t.city, postalCode: t.postalCode, phone: t.phone, email: t.email,
        iban: settings?.iban, bankName: settings?.bankName, vatRegistered: t.vatRegistered, footer: settings?.invoiceFooter ?? t.documentFooter,
      }}
      number={inv.number}
      issueDate={inv.issueDate}
      secondaryDate={{ label: "Dospijeće", date: inv.dueDate }}
      statusLabel={INVOICE_STATUS[inv.status].label}
      customer={{ name: billingName(inv.customer), oib: inv.oib ?? inv.customer.oib, addressLines: addr, email: inv.customer.email }}
      items={inv.items.map((it) => ({
        id: it.id, description: it.description, quantity: Number(it.quantity), unit: it.unit,
        unitPriceEur: Number(it.unitPriceEur), vatPct: Number(it.vatPct), totalEur: Number(it.totalEur),
      }))}
      subtotalEur={Number(inv.subtotalEur)}
      vatEur={Number(inv.vatEur)}
      totalEur={Number(inv.totalEur)}
      paidEur={paid}
      customerNote={inv.customerNote}
    />
  );
}
