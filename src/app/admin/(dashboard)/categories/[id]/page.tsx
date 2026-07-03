import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveCategory } from "@/server/actions/categories";
import {
  PageHeader,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  SubmitButton,
  FormSection,
} from "@/components/admin/ui";
import { LangTabs } from "@/components/admin/lang-tabs";
import { SeoFields } from "@/components/admin/seo-fields";

export default async function EditCategoryPage(
  props: PageProps<"/admin/categories/[id]">
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const langCode = typeof searchParams.lang === "string" ? searchParams.lang : "hr";

  const [category, languages, allCategories] = await Promise.all([
    db.category.findUnique({
      where: { id },
      include: { translations: { include: { language: true } } },
    }),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
    db.category.findMany({
      where: { deletedAt: null, id: { not: id } },
      include: { translations: { where: { language: { code: "en" } } } },
      orderBy: { position: "asc" },
    }),
  ]);
  if (!category) notFound();

  const language = languages.find((l) => l.code === langCode) ?? languages[0];
  const tr = category.translations.find((t) => t.languageId === language.id);
  const action = saveCategory.bind(null, category.id, language.id);

  return (
    <div>
      <PageHeader title={`Edit category: ${category.slug}`} />
      <form action={action} className="space-y-6">
        <FormSection title="Base settings (all languages)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug">
              <Input name="slug" defaultValue={category.slug} required />
            </Field>
            <Field label="Icon (emoji)">
              <Input name="icon" defaultValue={category.icon ?? ""} />
            </Field>
            <Field label="Parent category">
              <Select name="parentCategoryId" defaultValue={category.parentCategoryId ?? ""}>
                <option value="">— none —</option>
                {allCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.translations[0]?.name ?? c.slug}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Position">
              <Input name="position" type="number" defaultValue={category.position} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={category.status}>
                {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Checkbox name="isFeatured" label="Featured on homepage" defaultChecked={category.isFeatured} />
        </FormSection>

        <FormSection title={`Content — ${language.nativeName}`}>
          <LangTabs
            basePath={`/admin/categories/${category.id}`}
            current={language.code}
            languages={languages}
            existing={category.translations.map((t) => t.language.code)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="tr_name" defaultValue={tr?.name ?? ""} />
            </Field>
            <Field label="Localized slug">
              <Input name="tr_slug" defaultValue={tr?.slug ?? category.slug} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea name="tr_description" defaultValue={tr?.description ?? ""} rows={3} />
          </Field>
        </FormSection>

        <SeoFields entityType="CATEGORY" entityId={category.id} languageId={language.id} />
        <SubmitButton label="Save category" />
      </form>
    </div>
  );
}
