import { db } from "@/lib/db";
import { PageHeader, AdminTable, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";
import { getSetting } from "@/lib/settings";
import { saveAnalyticsSettings } from "@/server/actions/settings";

export default async function AdminAnalyticsPage() {
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [byType, byCountry, byLanguage, byDevice, topPages, topSearches, gaId, gtmId, gscCode] =
    await Promise.all([
      db.analyticsEvent.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since30 } },
        _count: true,
        orderBy: { _count: { type: "desc" } },
      }),
      db.analyticsEvent.groupBy({
        by: ["country"],
        where: { createdAt: { gte: since30 }, country: { not: null } },
        _count: true,
        orderBy: { _count: { country: "desc" } },
        take: 10,
      }),
      db.analyticsEvent.groupBy({
        by: ["languageCode"],
        where: { createdAt: { gte: since30 }, languageCode: { not: null } },
        _count: true,
        orderBy: { _count: { languageCode: "desc" } },
        take: 10,
      }),
      db.analyticsEvent.groupBy({
        by: ["device"],
        where: { createdAt: { gte: since30 }, device: { not: null } },
        _count: true,
        orderBy: { _count: { device: "desc" } },
      }),
      db.analyticsEvent.groupBy({
        by: ["path"],
        where: { type: "PAGE_VIEW", createdAt: { gte: since30 }, path: { not: null } },
        _count: true,
        orderBy: { _count: { path: "desc" } },
        take: 15,
      }),
      db.searchQuery.groupBy({
        by: ["query"],
        where: { createdAt: { gte: since30 } },
        _count: true,
        orderBy: { _count: { query: "desc" } },
        take: 10,
      }),
      getSetting<string>("google_analytics_id"),
      getSetting<string>("google_tag_manager_id"),
      getSetting<string>("search_console_verification"),
    ]);

  return (
    <div>
      <PageHeader title="Analytics" />
      <p className="mb-6 -mt-2 text-sm text-muted">
        Internal analytics events, last 30 days. Google Analytics complements this once configured below.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-5">
          <h2 className="font-semibold">Events by type</h2>
          <div className="mt-3 space-y-1.5 text-sm">
            {byType.length === 0 && <p className="text-muted">No events yet.</p>}
            {byType.map((row) => (
              <div key={row.type} className="flex justify-between">
                <span className="text-muted">{row.type.toLowerCase().replace(/_/g, " ")}</span>
                <span className="font-semibold">{row._count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-border bg-card p-5">
          <h2 className="font-semibold">Top countries</h2>
          <div className="mt-3 space-y-1.5 text-sm">
            {byCountry.length === 0 && <p className="text-muted">No geo data yet (available on Vercel).</p>}
            {byCountry.map((row) => (
              <div key={row.country} className="flex justify-between">
                <span className="text-muted">{row.country}</span>
                <span className="font-semibold">{row._count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-border bg-card p-5">
          <h2 className="font-semibold">Languages</h2>
          <div className="mt-3 space-y-1.5 text-sm">
            {byLanguage.map((row) => (
              <div key={row.languageCode} className="flex justify-between">
                <span className="uppercase text-muted">{row.languageCode}</span>
                <span className="font-semibold">{row._count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-border bg-card p-5">
          <h2 className="font-semibold">Devices</h2>
          <div className="mt-3 space-y-1.5 text-sm">
            {byDevice.map((row) => (
              <div key={row.device} className="flex justify-between">
                <span className="text-muted">{row.device}</span>
                <span className="font-semibold">{row._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Top pages</h2>
      <div className="mt-3">
        <AdminTable headers={["Path", "Views"]} empty={topPages.length === 0}>
          {topPages.map((row) => (
            <tr key={row.path}>
              <td className="px-4 py-2.5 text-sm">{row.path}</td>
              <td className="px-4 py-2.5 text-sm font-semibold">{row._count}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Top internal searches</h2>
      <div className="mt-3">
        <AdminTable headers={["Query", "Count"]} empty={topSearches.length === 0}>
          {topSearches.map((row) => (
            <tr key={row.query}>
              <td className="px-4 py-2.5 text-sm">{row.query}</td>
              <td className="px-4 py-2.5 text-sm font-semibold">{row._count}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Google integrations</h2>
      <form action={saveAnalyticsSettings} className="mt-3 max-w-xl">
        <FormSection title="Tracking IDs">
          <Field label="Google Analytics Measurement ID" hint="e.g. G-XXXXXXXXXX">
            <Input name="google_analytics_id" defaultValue={gaId ?? ""} />
          </Field>
          <Field label="Google Tag Manager ID" hint="e.g. GTM-XXXXXXX">
            <Input name="google_tag_manager_id" defaultValue={gtmId ?? ""} />
          </Field>
          <Field label="Search Console verification code">
            <Input name="search_console_verification" defaultValue={gscCode ?? ""} />
          </Field>
          <SubmitButton label="Save analytics settings" />
        </FormSection>
      </form>
    </div>
  );
}
