import { db } from "@/lib/db";
import { createPage } from "@/server/actions/pages";
import { PageHeader, Field, Input, Select, SubmitButton, FormSection } from "@/components/admin/ui";

export default async function NewPagePage() {
  const languages = await db.language.findMany({
    where: { isEnabled: true },
    orderBy: { position: "asc" },
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="New page" />
      <form action={createPage}>
        <FormSection title="Create page">
          <Field label="Title">
            <Input name="title" required />
          </Field>
          <Field label="Slug" hint="Leave empty to generate from the title">
            <Input name="slug" />
          </Field>
          <Field label="Language">
            <Select name="languageId" defaultValue={languages.find((l) => l.code === "hr")?.id}>
              {languages.map((l) => (
                <option key={l.id} value={l.id}>{l.nativeName}</option>
              ))}
            </Select>
          </Field>
          <SubmitButton label="Create & open builder" />
        </FormSection>
      </form>
    </div>
  );
}
