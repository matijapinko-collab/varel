import { createAffiliateLink } from "@/server/actions/affiliate";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewAffiliateLinkPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New affiliate link" />
      <form action={createAffiliateLink}>
        <FormSection title="Create affiliate link">
          <Field label="Brand name">
            <Input name="brandName" required placeholder="e.g. Semrush" />
          </Field>
          <Field label="Affiliate URL">
            <Input name="affiliateUrl" type="url" required placeholder="https://…?ref=varel" />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
