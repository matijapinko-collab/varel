import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { savePrompt } from "@/server/actions/content";
import {
  PageHeader,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  SubmitButton,
  FormSection,
  StatusBadge,
} from "@/components/admin/ui";
import { LangTabs } from "@/components/admin/lang-tabs";
import { SeoFields } from "@/components/admin/seo-fields";

export default async function EditPromptPage(props: PageProps<"/administracija/prompts/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const langCode = typeof searchParams.lang === "string" ? searchParams.lang : "hr";

  const [prompt, languages, categories] = await Promise.all([
    db.prompt.findUnique({
      where: { id },
      include: { translations: { include: { language: true } } },
    }),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
    db.promptCategory.findMany({
      include: { translations: { where: { language: { code: "en" } } } },
      orderBy: { position: "asc" },
    }),
  ]);
  if (!prompt) notFound();

  const language = languages.find((l) => l.code === langCode) ?? languages[0];
  const tr = prompt.translations.find((t) => t.languageId === language.id);
  const action = savePrompt.bind(null, prompt.id, language.id);

  return (
    <div>
      <PageHeader title="Edit prompt">
        <StatusBadge status={prompt.status} />
      </PageHeader>
      <form action={action} className="space-y-6">
        <FormSection title="Base settings (all languages)">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category">
              <Select name="categoryId" defaultValue={prompt.categoryId ?? ""}>
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.translations[0]?.name ?? c.slug}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Difficulty">
              <Select name="difficulty" defaultValue={prompt.difficulty}>
                {["BEGINNER", "INTERMEDIATE", "ADVANCED"].map((d) => (
                  <option key={d} value={d}>{d.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={prompt.status}>
                {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Checkbox name="isPremium" label="Premium (future)" defaultChecked={prompt.isPremium} />
        </FormSection>

        <FormSection title={`Content — ${language.nativeName}`}>
          <LangTabs
            basePath={`/administracija/prompts/${prompt.id}`}
            current={language.code}
            languages={languages}
            existing={prompt.translations.map((t) => t.language.code)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input name="tr_title" defaultValue={tr?.title ?? ""} />
            </Field>
            <Field label="Slug">
              <Input name="tr_slug" defaultValue={tr?.slug ?? ""} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea name="tr_description" defaultValue={tr?.description ?? ""} rows={2} />
          </Field>
          <Field label="Prompt text" hint="Use {{variable}} placeholders">
            <Textarea name="tr_promptText" defaultValue={tr?.promptText ?? ""} rows={8} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Variables" hint="One per line: name | example value">
              <Textarea
                name="tr_variables"
                defaultValue={
                  Array.isArray(tr?.variablesJson)
                    ? (tr.variablesJson as { name: string; example?: string }[])
                        .map((v) => `${v.name}${v.example ? ` | ${v.example}` : ""}`)
                        .join("\n")
                    : ""
                }
                rows={3}
              />
            </Field>
            <Field label="Compatible models" hint="One per line">
              <Textarea
                name="tr_compatibleModels"
                defaultValue={
                  Array.isArray(tr?.compatibleModelsJson)
                    ? (tr.compatibleModelsJson as string[]).join("\n")
                    : ""
                }
                rows={3}
              />
            </Field>
          </div>
          <Field label="Example output">
            <Textarea name="tr_exampleOutput" defaultValue={tr?.exampleOutput ?? ""} rows={4} />
          </Field>
          <Field label="Translation status">
            <Select name="tr_status" defaultValue={tr?.status ?? "DRAFT"}>
              {["DRAFT", "REVIEW", "PUBLISHED"].map((s) => (
                <option key={s} value={s}>{s.toLowerCase()}</option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <SeoFields entityType="PROMPT" entityId={prompt.id} languageId={language.id} />
        <SubmitButton label="Save prompt" />
      </form>
    </div>
  );
}
