import { PageHeader, Field, Input, FormSection } from "@/components/admin/ui";
import { AMAZON_DE, getAmazonCredentials } from "@/lib/price-checker/config";
import { getAmazonStatus, testAmazonConnection } from "@/server/actions/integrations";

export const dynamic = "force-dynamic";

function mask(value: string): string {
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-2)}`;
}

export default async function IntegrationsPage() {
  const creds = getAmazonCredentials();
  const status = await getAmazonStatus();
  const configured = creds !== null;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Integrations" />
      <p className="-mt-2 mb-6 text-sm text-muted">
        API connections that power Varel tools. Secrets are managed via server
        environment variables and are never displayed or sent to the browser.
      </p>

      <FormSection title="Amazon Product Advertising API">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              configured
                ? "bg-green-500/10 text-green-600"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${configured ? "bg-green-500" : "bg-amber-500"}`} />
            {configured ? "Configured" : "Not configured"}
          </span>
          <span className="text-xs text-muted">Marketplace: Amazon.de (Germany)</span>
        </div>

        {!configured && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
            The Price Checker is disabled until the Amazon PA-API credentials are set.
            Add <code>AMAZON_ACCESS_KEY</code>, <code>AMAZON_SECRET_KEY</code> and{" "}
            <code>AMAZON_PARTNER_TAG</code> to the server environment, then redeploy.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Access Key" hint="From AMAZON_ACCESS_KEY (masked)">
            <Input value={creds ? mask(creds.accessKey) : "—"} disabled readOnly />
          </Field>
          <Field label="Secret Key" hint="From AMAZON_SECRET_KEY (never shown)">
            <Input value={creds ? "•••••••• set" : "— not set"} disabled readOnly />
          </Field>
          <Field label="Partner Tag" hint="Associates tag used on all affiliate links">
            <Input value={creds?.partnerTag ?? "—"} disabled readOnly />
          </Field>
          <Field label="Region">
            <Input value={creds?.region ?? AMAZON_DE.region} disabled readOnly />
          </Field>
          <Field label="Marketplace host">
            <Input value={creds?.host ?? AMAZON_DE.host} disabled readOnly />
          </Field>
          <Field label="Default country">
            <Input value="Germany (DE)" disabled readOnly />
          </Field>
        </div>

        <div className="rounded-lg border border-border bg-background-secondary p-3 text-sm">
          <div className="grid gap-1 text-muted">
            <div>
              <span className="font-medium text-foreground">Last tested:</span>{" "}
              {status.lastTestedAt ? new Date(status.lastTestedAt).toLocaleString() : "never"}
            </div>
            <div>
              <span className="font-medium text-foreground">Last successful request:</span>{" "}
              {status.lastSuccessAt ? new Date(status.lastSuccessAt).toLocaleString() : "never"}
            </div>
            {status.lastError && (
              <div className="text-red-600">
                <span className="font-medium">Last error:</span> {status.lastError}
              </div>
            )}
          </div>
        </div>

        <form action={testAmazonConnection}>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-background-secondary"
          >
            Test connection
          </button>
        </form>
      </FormSection>
    </div>
  );
}
