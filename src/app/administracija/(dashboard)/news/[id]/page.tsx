import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveNews } from "@/server/actions/content";
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

export default async function EditNewsPage(props: PageProps<"/administracija/news/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const langCode = typeof searchParams.lang === "string" ? searchParams.lang : "hr";

  const [news, languages, tools] = await Promise.all([
    db.newsItem.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        relatedTools: true,
      },
    }),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
    db.tool.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  if (!news) notFound();

  const language = languages.find((l) => l.code === langCode) ?? languages[0];
  const tr = news.translations.find((t) => t.languageId === language.id);
  const action = saveNews.bind(null, news.id, language.id);

  return (
    <div>
      <PageHeader title="Edit news item">
        <StatusBadge status={news.status} />
      </PageHeader>
      <form action={action} className="space-y-6">
        <FormSection title="Base settings (all languages)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source name">
              <Input name="sourceName" defaultValue={news.sourceName ?? ""} />
            </Field>
            <Field label="Source URL">
              <Input name="sourceUrl" type="url" defaultValue={news.sourceUrl ?? ""} />
            </Field>
            <Field label="Priority">
              <Select name="priority" defaultValue={news.priority}>
                {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                  <option key={p} value={p}>{p.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={news.status}>
                {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title={`Content — ${language.nativeName}`}>
          <LangTabs
            basePath={`/administracija/news/${news.id}`}
            current={language.code}
            languages={languages}
            existing={news.translations.map((t) => t.language.code)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input name="tr_title" defaultValue={tr?.title ?? ""} />
            </Field>
            <Field label="Slug">
              <Input name="tr_slug" defaultValue={tr?.slug ?? ""} />
            </Field>
          </div>
          <Field label="Summary">
            <Textarea name="tr_summary" defaultValue={tr?.summary ?? ""} rows={3} />
          </Field>
          <Field label="Body (HTML, optional)">
            <Textarea name="tr_body" defaultValue={tr?.body ?? ""} rows={6} />
          </Field>
          <Field label="Why it matters">
            <Textarea name="tr_whyItMatters" defaultValue={tr?.whyItMatters ?? ""} rows={2} />
          </Field>
          <Field label="Translation status">
            <Select name="tr_status" defaultValue={tr?.status ?? "DRAFT"}>
              {["DRAFT", "REVIEW", "PUBLISHED"].map((s) => (
                <option key={s} value={s}>{s.toLowerCase()}</option>
              ))}
            </Select>
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
                  defaultChecked={news.relatedTools.some((t) => t.toolId === tool.id)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {tool.name}
              </label>
            ))}
          </div>
        </FormSection>

        <SeoFields entityType="NEWS" entityId={news.id} languageId={language.id} />
        <SubmitButton label="Save news item" />
      </form>
    </div>
  );
}
