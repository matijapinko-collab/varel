import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveTool } from "@/server/actions/tools";
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

export default async function EditToolPage(
  props: PageProps<"/administracija/tools/[id]">
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const langCode = typeof searchParams.lang === "string" ? searchParams.lang : "hr";

  const [tool, languages, categories] = await Promise.all([
    db.tool.findUnique({
      where: { id },
      include: {
        translations: { include: { language: true } },
        categories: true,
        features: { orderBy: { position: "asc" } },
        pricingPlans: { orderBy: { position: "asc" } },
      },
    }),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
    db.category.findMany({
      where: { deletedAt: null },
      include: { translations: { where: { language: { code: "en" } } } },
      orderBy: { position: "asc" },
    }),
  ]);
  if (!tool) notFound();

  const language = languages.find((l) => l.code === langCode) ?? languages[0];
  const tr = tool.translations.find((t) => t.languageId === language.id);
  const action = saveTool.bind(null, tool.id, language.id);

  return (
    <div>
      <PageHeader title={`Edit tool: ${tool.name}`}>
        <StatusBadge status={tool.status} />
        <Link
          href={`/administracija/tools/${tool.id}/offers`}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          Manage offers
        </Link>
      </PageHeader>

      <form action={action} className="space-y-6">
        <FormSection title="Base settings (all languages)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" defaultValue={tool.name} required />
            </Field>
            <Field label="Slug">
              <Input name="slug" defaultValue={tool.slug} />
            </Field>
            <Field label="Website URL">
              <Input name="websiteUrl" defaultValue={tool.websiteUrl ?? ""} type="url" />
            </Field>
            <Field label="Pricing model">
              <Select name="pricingModel" defaultValue={tool.pricingModel}>
                {["FREE", "FREEMIUM", "PAID", "TRIAL", "OPEN_SOURCE", "CUSTOM"].map((m) => (
                  <option key={m} value={m}>{m.toLowerCase().replace("_", " ")}</option>
                ))}
              </Select>
            </Field>
            <Field label="Editor rating (0–5)">
              <Input name="editorRating" type="number" step="0.1" min="0" max="5" defaultValue={tool.editorRating ?? ""} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={tool.status}>
                {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Logo media ID" hint="Pick an image in Media Library and paste its ID">
              <Input name="logoId" defaultValue={tool.logoId ?? ""} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-5 pt-1">
            <Checkbox name="hasFreeTrial" label="Free trial" defaultChecked={tool.hasFreeTrial} />
            <Checkbox name="hasApi" label="Has API" defaultChecked={tool.hasApi} />
            <Checkbox name="isOpenSource" label="Open source" defaultChecked={tool.isOpenSource} />
            <Checkbox name="isFeatured" label="Featured (Editor's pick)" defaultChecked={tool.isFeatured} />
            <Checkbox name="isTrending" label="Trending" defaultChecked={tool.isTrending} />
          </div>
        </FormSection>

        <FormSection title="Categories">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="categoryIds"
                  value={cat.id}
                  defaultChecked={tool.categories.some((c) => c.categoryId === cat.id)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {cat.translations[0]?.name ?? cat.slug}
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection title={`Content — ${language.nativeName}`}>
          <LangTabs
            basePath={`/administracija/tools/${tool.id}`}
            current={language.code}
            languages={languages}
            existing={tool.translations.map((t) => t.language.code)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Localized name">
              <Input name="tr_name" defaultValue={tr?.name ?? tool.name} />
            </Field>
            <Field label="Localized slug">
              <Input name="tr_slug" defaultValue={tr?.slug ?? tool.slug} />
            </Field>
          </div>
          <Field label="Short description">
            <Textarea name="tr_shortDescription" defaultValue={tr?.shortDescription ?? ""} rows={2} />
          </Field>
          <Field label="Long description (HTML)" hint="Full overview shown on the tool page">
            <Textarea name="tr_longDescription" defaultValue={tr?.longDescription ?? ""} rows={8} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pros" hint="One per line">
              <Textarea name="tr_pros" defaultValue={Array.isArray(tr?.prosJson) ? (tr.prosJson as string[]).join("\n") : ""} rows={4} />
            </Field>
            <Field label="Cons" hint="One per line">
              <Textarea name="tr_cons" defaultValue={Array.isArray(tr?.consJson) ? (tr.consJson as string[]).join("\n") : ""} rows={4} />
            </Field>
          </div>
          <Field label="Best use cases" hint="One per line">
            <Textarea name="tr_useCases" defaultValue={Array.isArray(tr?.useCasesJson) ? (tr.useCasesJson as string[]).join("\n") : ""} rows={3} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Who should use it">
              <Textarea name="tr_whoShouldUseIt" defaultValue={tr?.whoShouldUseIt ?? ""} rows={3} />
            </Field>
            <Field label="Who should avoid it">
              <Textarea name="tr_whoShouldAvoidIt" defaultValue={tr?.whoShouldAvoidIt ?? ""} rows={3} />
            </Field>
          </div>
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
              rows={4}
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

        <FormSection title="Features & pricing (all languages)">
          <Field label="Key features" hint="One per line: Feature name | Description">
            <Textarea
              name="features"
              defaultValue={tool.features.map((f) => `${f.name}${f.description ? ` | ${f.description}` : ""}`).join("\n")}
              rows={4}
            />
          </Field>
          <Field label="Pricing plans" hint="One per line: Plan | Price | Period | popular">
            <Textarea
              name="pricingPlans"
              defaultValue={tool.pricingPlans
                .map((p) => `${p.planName} | ${p.price ?? ""} | ${p.billingPeriod}${p.isPopular ? " | popular" : ""}`)
                .join("\n")}
              rows={3}
            />
          </Field>
        </FormSection>

        <SeoFields
          entityType="TOOL"
          entityId={tool.id}
          languageId={language.id}
          title={tool.name}
          slug={tr?.slug ?? tool.slug}
          body={tr?.longDescription ?? tr?.shortDescription ?? ""}
          publicPath={`/${language.code}/tools/${tr?.slug ?? tool.slug}`}
        />

        <SubmitButton label="Save tool" />
      </form>
    </div>
  );
}
