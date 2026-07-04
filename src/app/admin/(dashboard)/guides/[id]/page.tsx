import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveArticle } from "@/server/actions/content";
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

export default async function EditGuidePage(props: PageProps<"/admin/guides/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const langCode = typeof searchParams.lang === "string" ? searchParams.lang : "hr";

  const [article, languages, tools] = await Promise.all([
    db.article.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        tools: true,
      },
    }),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
    db.tool.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  if (!article) notFound();

  const language = languages.find((l) => l.code === langCode) ?? languages[0];
  const tr = article.translations.find((t) => t.languageId === language.id);
  const action = saveArticle.bind(null, article.id, language.id);

  return (
    <div>
      <PageHeader title="Edit guide">
        <StatusBadge status={article.status} />
      </PageHeader>
      <form action={action} className="space-y-6">
        <FormSection title="Base settings (all languages)">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type">
              <Select name="type" defaultValue={article.type}>
                <option value="STANDARD">Standard</option>
                <option value="CORNERSTONE">Cornerstone</option>
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={article.status}>
                {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Target word count">
              <Input name="targetWordCount" type="number" defaultValue={article.targetWordCount ?? ""} />
            </Field>
            <Field label="Vertical" hint="Finance guides appear under /finance/guides">
              <Select name="vertical" defaultValue={article.vertical ?? ""}>
                <option value="">— general —</option>
                <option value="ai">AI Tools</option>
                <option value="gadget">Gadget Reviews</option>
                <option value="finance">Finance</option>
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title={`Content — ${language.nativeName}`}>
          <LangTabs
            basePath={`/admin/guides/${article.id}`}
            current={language.code}
            languages={languages}
            existing={article.translations.map((t) => t.language.code)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input name="tr_title" defaultValue={tr?.title ?? ""} />
            </Field>
            <Field label="Slug">
              <Input name="tr_slug" defaultValue={tr?.slug ?? ""} />
            </Field>
          </div>
          <Field label="Excerpt">
            <Textarea name="tr_excerpt" defaultValue={tr?.excerpt ?? ""} rows={2} />
          </Field>
          <Field label="Body (HTML)">
            <Textarea name="tr_body" defaultValue={tr?.body ?? ""} rows={16} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Focus keyword">
              <Input name="tr_focusKeyword" defaultValue={tr?.focusKeyword ?? ""} />
            </Field>
            <Field label="Translation status">
              <Select name="tr_status" defaultValue={tr?.status ?? "DRAFT"}>
                {["DRAFT", "REVIEW", "PUBLISHED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Secondary keywords" hint="One per line">
            <Textarea
              name="tr_secondaryKeywords"
              defaultValue={Array.isArray(tr?.secondaryKeywordsJson) ? (tr.secondaryKeywordsJson as string[]).join("\n") : ""}
              rows={2}
            />
          </Field>
          <Field label="FAQ" hint="One per line: Question | Answer">
            <Textarea
              name="tr_faq"
              defaultValue={
                Array.isArray(tr?.faqJson)
                  ? (tr.faqJson as { question: string; answer: string }[])
                      .map((f) => `${f.question} | ${f.answer}`)
                      .join("\n")
                  : ""
              }
              rows={3}
            />
          </Field>
        </FormSection>

        <FormSection title="Related tools">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tools.map((tool) => (
              <label key={tool.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="toolIds"
                  value={tool.id}
                  defaultChecked={article.tools.some((t) => t.toolId === tool.id)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {tool.name}
              </label>
            ))}
          </div>
        </FormSection>

        <SeoFields entityType="ARTICLE" entityId={article.id} languageId={language.id} />
        <SubmitButton label="Save guide" />
      </form>
    </div>
  );
}
