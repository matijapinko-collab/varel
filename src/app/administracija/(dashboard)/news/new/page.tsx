import { createNews } from "@/server/actions/content";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewNewsPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New news item" />
      <form action={createNews}>
        <FormSection title="Create news item (Croatian original)">
          <Field label="Title (hrvatski)">
            <Input name="title" required />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
