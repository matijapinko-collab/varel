import { createPrompt } from "@/server/actions/content";
import { PageHeader, Field, Input, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewPromptPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New prompt" />
      <form action={createPrompt}>
        <FormSection title="Create prompt (Croatian original)">
          <Field label="Title (hrvatski)">
            <Input name="title" required />
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
