import { createTool } from "@/server/actions/tools";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewToolPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New tool" />
      <form action={createTool}>
        <FormSection title="Create tool">
          <Field label="Name">
            <Input name="name" required placeholder="e.g. Claude" />
          </Field>
          <Field label="Slug" hint="Leave empty to generate from the name">
            <Input name="slug" placeholder="claude" />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
