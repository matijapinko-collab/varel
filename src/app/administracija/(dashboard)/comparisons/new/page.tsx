import { createComparison } from "@/server/actions/content";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewComparisonPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New comparison" />
      <form action={createComparison}>
        <FormSection title="Create comparison (Croatian original)">
          <Field label="Title (hrvatski)" hint="e.g. ChatGPT vs Claude">
            <Input name="title" required />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
