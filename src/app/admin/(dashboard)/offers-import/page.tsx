import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import { OffersImporter } from "@/components/admin/offers-importer";

/**
 * CSV/feed import for product offers (Phase 2). Approved data sources only:
 * official affiliate feeds, partner exports and manual CSVs — no scraping.
 */
export default async function OffersImportPage() {
  const [recentOffers, toolCount, partnerCount] = await Promise.all([
    db.productOffer.findMany({
      include: { tool: true, partner: true },
      orderBy: { lastCheckedAt: "desc" },
      take: 15,
    }),
    db.tool.count({ where: { deletedAt: null } }),
    db.affiliatePartner.count({ where: { deletedAt: null } }),
  ]);

  return (
    <div>
      <PageHeader title="Import offers (CSV)">
        <a
          href="/api/admin/import-offers/template"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          ⬇ Download template
        </a>
      </PageHeader>

      <div className="mb-6 max-w-3xl rounded-card border border-border bg-card p-5 text-sm leading-relaxed">
        <p className="font-semibold">How it works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Export offers from your affiliate partner / network as CSV (or use the template).</li>
          <li>
            Required columns: <code>tool_slug</code>, <code>partner_slug</code>,{" "}
            <code>affiliate_url</code>. Optional: <code>merchant_name</code>,{" "}
            <code>product_url</code>, <code>current_price</code>, <code>old_price</code>,{" "}
            <code>currency</code>, <code>coupon_code</code>, <code>coupon_description</code>,{" "}
            <code>shipping_cost</code>, <code>availability</code> (in_stock / out_of_stock /
            limited / preorder / unknown), <code>sponsored</code>, <code>active</code>.
          </li>
          <li>
            Rows match existing offers by tool + partner (+ affiliate URL) and update them;
            new combinations create offers. Every price/availability change is recorded in
            the price history automatically.
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          Slugs come from <Link href="/admin/tools" className="text-primary hover:underline">Tools</Link> ({toolCount}) and{" "}
          <Link href="/admin/affiliate-partners" className="text-primary hover:underline">Affiliate Partners</Link> ({partnerCount}).
          Max 1000 rows / 2 MB per import. Use official feeds and partner exports only.
        </p>
      </div>

      <OffersImporter />

      <h2 className="mt-10 text-lg font-semibold">Recently updated offers</h2>
      <div className="mt-3">
        <AdminTable
          headers={["Product", "Partner", "Price", "Availability", "Last checked"]}
          empty={recentOffers.length === 0}
        >
          {recentOffers.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-2.5 text-sm font-medium">
                <Link href={`/admin/tools/${o.toolId}/offers`} className="hover:text-primary">
                  {o.tool.name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">{o.merchantName ?? o.partner.name}</td>
              <td className="px-4 py-2.5 text-sm">
                {o.currentPrice != null ? `${o.currency} ${String(o.currentPrice)}` : "—"}
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">
                {o.availability.toLowerCase().replace("_", " ")}
              </td>
              <td className="px-4 py-2.5 text-xs text-muted">
                {o.lastCheckedAt ? o.lastCheckedAt.toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </AdminTable>
      </div>
    </div>
  );
}
