import { createAffiliatePartner } from "@/server/actions/deals";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewPartnerPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New affiliate partner" />
      <form action={createAffiliatePartner}>
        <FormSection title="Create partner">
          <Field label="Name">
            <Input name="name" required placeholder="e.g. Amazon, Awin, MediaMarkt" />
          </Field>
          <Field label="Slug" hint="Leave empty to generate">
            <Input name="slug" />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
