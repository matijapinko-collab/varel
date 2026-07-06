import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveComparison } from "@/server/actions/content";
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

export default async function EditComparisonPage(
  props: PageProps<"/administracija/comparisons/[id]">
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const langCode = typeof searchParams.lang === "string" ? searchParams.lang : "hr";

  const [comparison, languages, tools] = await Promise.all([
    db.comparison.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        tools: { orderBy: { position: "asc" } },
        rows: { orderBy: { position: "asc" } },
      },
    }),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
    db.tool.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  if (!comparison) notFound();

  const language = languages.find((l) => l.code === langCode) ?? languages[0];
  const tr = comparison.translations.find((t) => t.languageId === language.id);
  const action = saveComparison.bind(null, comparison.id, language.id);
  const selectedToolIds = comparison.tools.map((t) => t.toolId);

  const rowsText = comparison.rows
    .map((row) => {
      const values = (row.toolValuesJson ?? {}) as Record<string, string>;
      return [row.label, ...selectedToolIds.map((tid) => values[tid] ?? "")].join(" | ");
    })
    .join("\n");

  return (
    <div>
      <PageHeader title="Edit comparison">
        <StatusBadge status={comparison.status} />
      </PageHeader>
      <form action={action} className="space-y-6">
        <FormSection title="Base settings (all languages)">
          <Field label="Status">
            <Select name="status" defaultValue={comparison.status}>
              {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                <option key={s} value={s}>{s.toLowerCase()}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tools in this comparison" hint="Check in the order they should appear">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {tools.map((tool) => (
                <label key={tool.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="toolIds"
                    value={tool.id}
                    defaultChecked={selectedToolIds.includes(tool.id)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  {tool.name}
                </label>
              ))}
            </div>
          </Field>
          <Field
            label="Comparison table rows"
            hint="One per line: Label | value for tool 1 | value for tool 2"
          >
            <Textarea name="rows" defaultValue={rowsText} rows={6} />
          </Field>
        </FormSection>

        <FormSection title={`Content — ${language.nativeName}`}>
          <LangTabs
            basePath={`/administracija/comparisons/${comparison.id}`}
            current={language.code}
            languages={languages}
            existing={comparison.translations.map((t) => t.language.code)}
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
            <Textarea name="tr_summary" defaultValue={tr?.summary ?? ""} rows={2} />
          </Field>
          <Field label="Body (HTML, optional)">
            <Textarea name="tr_body" defaultValue={tr?.body ?? ""} rows={8} />
          </Field>
          <Field label="Verdict / final recommendation">
            <Textarea name="tr_verdict" defaultValue={tr?.verdict ?? ""} rows={3} />
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
          <Field label="Translation status">
            <Select name="tr_status" defaultValue={tr?.status ?? "DRAFT"}>
              {["DRAFT", "REVIEW", "PUBLISHED"].map((s) => (
                <option key={s} value={s}>{s.toLowerCase()}</option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <SeoFields entityType="COMPARISON" entityId={comparison.id} languageId={language.id} />
        <SubmitButton label="Save comparison" />
      </form>
    </div>
  );
}
