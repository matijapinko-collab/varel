import Link from "next/link";
import {
  PageHeader,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  SubmitButton,
  FormSection,
} from "@/components/admin/ui";
import { getPriceCheckerSettings, isAmazonConfigured } from "@/lib/price-checker/config";
import { savePriceCheckerSettings } from "@/server/actions/integrations";

export const dynamic = "force-dynamic";

export default async function PriceCheckerSettingsPage() {
  const [settings, configured] = await Promise.all([
    getPriceCheckerSettings(),
    Promise.resolve(isAmazonConfigured()),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Price Checker" />
      <p className="-mt-2 mb-6 text-sm text-muted">
        Settings for the public Varel Price Checker at <code>/best-deals</code>.
      </p>

      {!configured && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
          Amazon PA-API is not configured, so the Price Checker shows an
          &ldquo;unavailable&rdquo; message to visitors. Configure it under{" "}
          <Link href="/admin/integrations" className="font-medium underline">
            Integrations
          </Link>
          .
        </div>
      )}

      <form action={savePriceCheckerSettings} className="space-y-6">
        <FormSection title="General">
          <Checkbox name="enabled" label="Enable Price Checker" defaultChecked={settings.enabled} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default marketplace">
              <Input value="Amazon.de (Germany)" disabled readOnly />
            </Field>
            <Field label="Results per search" hint="10–15 (Amazon caps API results at 10)">
              <Select name="resultsPerSearch" defaultValue={String(settings.resultsPerSearch)}>
                <option value="10">10</option>
                <option value="15">15</option>
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="Result fields">
          <p className="-mt-2 text-xs text-muted">
            Fields are only shown when the API returns them — hiding here removes
            them even if present. Nothing is ever faked.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Checkbox name="showPrime" label="Show Prime badge" defaultChecked={settings.showPrime} />
            <Checkbox name="showRating" label="Show rating" defaultChecked={settings.showRating} />
            <Checkbox name="showReviews" label="Show review count" defaultChecked={settings.showReviews} />
            <Checkbox name="showAvailability" label="Show availability" defaultChecked={settings.showAvailability} />
          </div>
        </FormSection>

        <FormSection title="Caching">
          <Checkbox name="cacheEnabled" label="Cache search results" defaultChecked={settings.cacheEnabled} />
          <Field label="Cache duration (minutes)" hint="Default 30. Degrades gracefully if the cache is unavailable.">
            <Input name="cacheMinutes" type="number" min={1} max={1440} defaultValue={settings.cacheMinutes} />
          </Field>
        </FormSection>

        <FormSection title="Copy & disclosure">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Page title">
              <Input name="pageTitle" defaultValue={settings.pageTitle} />
            </Field>
            <Field label="Page subtitle">
              <Input name="pageSubtitle" defaultValue={settings.pageSubtitle} />
            </Field>
          </div>
          <Field label="Search placeholder">
            <Input name="searchPlaceholder" defaultValue={settings.searchPlaceholder} />
          </Field>
          <Field label="Affiliate disclosure">
            <Textarea name="affiliateDisclosure" rows={2} defaultValue={settings.affiliateDisclosure} />
          </Field>
          <Field label="No-results message">
            <Textarea name="noResultsMessage" rows={2} defaultValue={settings.noResultsMessage} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Error message">
              <Textarea name="errorMessage" rows={2} defaultValue={settings.errorMessage} />
            </Field>
            <Field label="Unavailable message">
              <Textarea name="unavailableMessage" rows={2} defaultValue={settings.unavailableMessage} />
            </Field>
          </div>
        </FormSection>

        <SubmitButton label="Save Price Checker settings" />
      </form>
    </div>
  );
}
