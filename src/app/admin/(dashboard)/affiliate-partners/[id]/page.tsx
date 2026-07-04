import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveAffiliatePartner, fetchFeedNow } from "@/server/actions/deals";
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

export default async function EditPartnerPage(props: PageProps<"/admin/affiliate-partners/[id]">) {
  const { id } = await props.params;
  const partner = await db.affiliatePartner.findUnique({ where: { id } });
  if (!partner) notFound();

  return (
    <div>
      <PageHeader title={`Partner: ${partner.name}`}>
        {partner.feedUrl && (
          <form action={fetchFeedNow.bind(null, partner.id)}>
            <button
              type="submit"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
            >
              ⟳ Fetch feed now
            </button>
          </form>
        )}
      </PageHeader>
      <form action={saveAffiliatePartner.bind(null, partner.id)} className="max-w-2xl space-y-6">
        <FormSection title="Partner details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" defaultValue={partner.name} required />
            </Field>
            <Field label="Slug">
              <Input name="slug" defaultValue={partner.slug} />
            </Field>
            <Field label="Website URL">
              <Input name="websiteUrl" type="url" defaultValue={partner.websiteUrl ?? ""} />
            </Field>
            <Field label="Affiliate network" hint="e.g. Awin, Impact, Amazon Associates, Direct">
              <Input name="affiliateNetwork" defaultValue={partner.affiliateNetwork ?? ""} />
            </Field>
            <Field label="Partner type">
              <Select name="partnerType" defaultValue={partner.partnerType}>
                {["DIRECT", "NETWORK", "MARKETPLACE", "RETAILER"].map((tp) => (
                  <option key={tp} value={tp}>{tp.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" hint="Higher wins ties when picking the best offer">
              <Input name="priority" type="number" defaultValue={partner.priority} />
            </Field>
            <Field label="Contact email">
              <Input name="contactEmail" type="email" defaultValue={partner.contactEmail ?? ""} />
            </Field>
            <Field label="Logo media ID" hint="Pick in Media Library, paste ID">
              <Input name="logoId" defaultValue={partner.logoId ?? ""} />
            </Field>
          </div>
          <Field label="Default tracking params" hint="Appended to affiliate URLs, e.g. utm_source=varel&subid=deals">
            <Input name="defaultTrackingParams" defaultValue={partner.defaultTrackingParams ?? ""} />
          </Field>
          <Field
            label="CSV feed URL (optional)"
            hint={`Official datafeed URL (https, CSV, same columns as the import template). Fetched automatically by the daily update${partner.lastFeedFetchAt ? ` · last fetched ${partner.lastFeedFetchAt.toLocaleString()}` : ""}`}
          >
            <Input name="feedUrl" type="url" defaultValue={partner.feedUrl ?? ""} placeholder="https://network.example.com/feed.csv" />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" defaultValue={partner.notes ?? ""} rows={3} />
          </Field>
          <Checkbox name="isActive" label="Active" defaultChecked={partner.isActive} />
        </FormSection>
        <SubmitButton label="Save partner" />
      </form>
    </div>
  );
}
