import { createCategory } from "@/server/actions/categories";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewCategoryPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New category" />
      <form action={createCategory}>
        <FormSection title="Create category">
          <Field label="Name">
            <Input name="name" required placeholder="e.g. AI Tools" />
          </Field>
          <Field label="Slug" hint="Leave empty to generate from the name">
            <Input name="slug" placeholder="ai-tools" />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
