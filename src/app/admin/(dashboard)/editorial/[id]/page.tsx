import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveEditorial } from "@/server/actions/content";
import {
  PageHeader,
  Field,
  Input,
  Textarea,
  Select,
  SubmitButton,
  FormSection,
  StatusBadge,
} from "@/components/admin/ui";
import { LangTabs } from "@/components/admin/lang-tabs";
import { SeoFields } from "@/components/admin/seo-fields";

const EDITORIAL_CATEGORIES = [
  "Market Analysis", "My Take", "Weekly Brief", "AI Industry Notes", "Startup Watch",
  "Europe Tech", "Creator Economy", "Automation Economy", "Affiliate Economy", "Croatia Tech",
];

export default async function EditEditorialPage(props: PageProps<"/admin/editorial/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const langCode = typeof searchParams.lang === "string" ? searchParams.lang : "hr";

  const [post, languages] = await Promise.all([
    db.editorialPost.findUnique({
      where: { id },
      include: { translations: { include: { language: true } }, author: true },
    }),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
  ]);
  if (!post) notFound();

  const language = languages.find((l) => l.code === langCode) ?? languages[0];
  const tr = post.translations.find((t) => t.languageId === language.id);
  const action = saveEditorial.bind(null, post.id, language.id);

  return (
    <div>
      <PageHeader title={`The Varel Brief — ${post.author.name}`}>
        <StatusBadge status={post.status} />
      </PageHeader>
      <form action={action} className="space-y-6">
        <FormSection title="Base settings">
          <Field label="Status">
            <Select name="status" defaultValue={post.status}>
              {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                <option key={s} value={s}>{s.toLowerCase()}</option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <FormSection title={`Content — ${language.nativeName}`}>
          <LangTabs
            basePath={`/admin/editorial/${post.id}`}
            current={language.code}
            languages={languages}
            existing={post.translations.map((t) => t.language.code)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input name="tr_title" defaultValue={tr?.title ?? ""} />
            </Field>
            <Field label="Slug">
              <Input name="tr_slug" defaultValue={tr?.slug ?? ""} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Editorial category">
              <Select name="tr_category" defaultValue={tr?.category ?? "My Take"}>
                {EDITORIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Translation status">
              <Select name="tr_status" defaultValue={tr?.status ?? "DRAFT"}>
                {["DRAFT", "REVIEW", "PUBLISHED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Excerpt">
            <Textarea name="tr_excerpt" defaultValue={tr?.excerpt ?? ""} rows={2} />
          </Field>
          <Field label="Body (HTML)">
            <Textarea name="tr_body" defaultValue={tr?.body ?? ""} rows={14} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prediction (optional highlight block)">
              <Textarea name="tr_predictionText" defaultValue={tr?.predictionText ?? ""} rows={3} />
            </Field>
            <Field label="Market impact (optional block)">
              <Textarea name="tr_marketImpact" defaultValue={tr?.marketImpact ?? ""} rows={3} />
            </Field>
          </div>
        </FormSection>

        <SeoFields entityType="EDITORIAL" entityId={post.id} languageId={language.id} />
        <SubmitButton label="Save column" />
      </form>
    </div>
  );
}
