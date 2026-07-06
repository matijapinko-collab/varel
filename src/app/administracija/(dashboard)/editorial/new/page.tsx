import { createEditorial } from "@/server/actions/content";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewEditorialPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New column" />
      <form action={createEditorial}>
        <FormSection title="Create column (Croatian original)">
          <Field label="Title (hrvatski)">
            <Input name="title" required />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
