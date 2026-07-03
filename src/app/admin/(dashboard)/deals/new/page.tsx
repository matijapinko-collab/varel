import { createDeal } from "@/server/actions/content";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewDealPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New deal" />
      <form action={createDeal}>
        <FormSection title="Create deal (Croatian original)">
          <Field label="Title (hrvatski)">
            <Input name="title" required />
          </Field>
          <Field label="Brand">
            <Input name="brandName" required />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
