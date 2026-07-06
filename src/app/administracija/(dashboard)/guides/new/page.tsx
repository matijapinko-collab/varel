import { createArticle } from "@/server/actions/content";
import { PageHeader, Field, Input, Select, SubmitButton, FormSection } from "@/components/admin/ui";

export default function NewGuidePage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New guide" />
      <form action={createArticle}>
        <FormSection title="Create guide (Croatian original)">
          <Field label="Title (hrvatski)" hint="Content is created in Croatian first, then translated">
            <Input name="title" required />
          </Field>
          <Field label="Type">
            <Select name="type" defaultValue="STANDARD">
              <option value="STANDARD">Standard (~500 words)</option>
              <option value="CORNERSTONE">Cornerstone (~1500 words)</option>
            </Select>
          </Field>
          <SubmitButton label="Create & edit" />
        </FormSection>
      </form>
    </div>
  );
}
