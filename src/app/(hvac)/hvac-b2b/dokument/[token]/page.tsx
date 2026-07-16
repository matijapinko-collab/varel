import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isHvacB2bEnabled } from "@/lib/hvac/b2b-auth";
import { INVOICE_STATUS, QUOTE_STATUS } from "@/lib/hvac/b2b-config";
import { billingName, billingAddressLines } from "@/lib/hvac/documents";
import { DocumentPrint } from "@/components/hvac/b2b/document-print";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dokument | Varel HVAC", robots: { index: false, follow: false } };

async function loadTenant(tenantId: string) {
  const [tenant, settings] = await Promise.all([
    db.hvacTenant.findUnique({ where: { id: tenantId } }),
    db.hvacTenantSettings.findUnique({ where: { tenantId } }),
  ]);
  if (!tenant) return null;
  return {
    name: tenant.name, logoUrl: tenant.logoUrl, legalForm: tenant.legalForm, oib: tenant.oib,
    address: tenant.address, city: tenant.city, postalCode: tenant.postalCode, phone: tenant.phone, email: tenant.email,
    iban: settings?.iban, bankName: settings?.bankName, vatRegistered: tenant.vatRegistered, footer: settings?.invoiceFooter ?? tenant.documentFooter,
  };
}

export default async function PublicDocumentPage(props: PageProps<"/hvac-b2b/dokument/[token]">) {
  if (!isHvacB2bEnabled()) notFound();
  const { token } = await props.params;

  // Token is the sole authorization here — never scope by session/tenant.
  const invoice = await db.hvacInvoice.findUnique({
    where: { publicToken: token },
    include: { customer: true, items: { orderBy: { position: "asc" } }, payments: true },
  });
  if (invoice) {
    const tenant = await loadTenant(invoice.tenantId);
    if (!tenant) notFound();
    const paid = invoice.payments.reduce((s, p) => s + Number(p.amountEur), 0);
    const addr = invoice.billingAddress ? [invoice.billingAddress] : billingAddressLines(invoice.customer);
    return (
      <main className="min-h-screen bg-slate-100 py-8">
        <DocumentPrint
          kind="invoice" showPrintButton tenant={tenant}
          number={invoice.number} issueDate={invoice.issueDate}
          secondaryDate={{ label: "Dospijeće", date: invoice.dueDate }}
          statusLabel={INVOICE_STATUS[invoice.status].label}
          customer={{ name: billingName(invoice.customer), oib: invoice.oib ?? invoice.customer.oib, addressLines: addr, email: invoice.customer.email }}
          items={invoice.items.map((it) => ({ id: it.id, description: it.description, quantity: Number(it.quantity), unit: it.unit, unitPriceEur: Number(it.unitPriceEur), vatPct: Number(it.vatPct), totalEur: Number(it.totalEur) }))}
          subtotalEur={Number(invoice.subtotalEur)} vatEur={Number(invoice.vatEur)} totalEur={Number(invoice.totalEur)} paidEur={paid}
          customerNote={invoice.customerNote}
        />
      </main>
    );
  }

  const quote = await db.hvacQuotation.findUnique({
    where: { publicToken: token },
    include: { customer: true, items: { orderBy: { position: "asc" } } },
  });
  if (!quote) notFound();

  // First open of a sent quote flips it to VIEWED so the company sees engagement.
  if (quote.status === "SENT") {
    await db.hvacQuotation.update({ where: { id: quote.id }, data: { status: "VIEWED" } }).catch(() => {});
  }
  const tenant = await loadTenant(quote.tenantId);
  if (!tenant) notFound();
  return (
    <main className="min-h-screen bg-slate-100 py-8">
      <DocumentPrint
        kind="quote" showPrintButton tenant={tenant}
        number={quote.number} issueDate={quote.issueDate}
        secondaryDate={{ label: "Vrijedi do", date: quote.validUntil }}
        statusLabel={QUOTE_STATUS[quote.status].label}
        customer={{ name: billingName(quote.customer), oib: quote.customer.oib, addressLines: billingAddressLines(quote.customer), email: quote.customer.email }}
        items={quote.items.map((it) => ({ id: it.id, description: it.description, quantity: Number(it.quantity), unit: it.unit, unitPriceEur: Number(it.unitPriceEur), discountPct: Number(it.discountPct), vatPct: Number(it.vatPct), totalEur: Number(it.totalEur) }))}
        subtotalEur={Number(quote.subtotalEur)} vatEur={Number(quote.vatEur)} totalEur={Number(quote.totalEur)}
        paymentTerms={quote.paymentTerms} notes={quote.notes}
      />
    </main>
  );
}
