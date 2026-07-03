import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveDeal } from "@/server/actions/content";
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

export default async function EditDealPage(props: PageProps<"/admin/deals/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const langCode = typeof searchParams.lang === "string" ? searchParams.lang : "hr";

  const [deal, languages, affiliateLinks] = await Promise.all([
    db.deal.findUnique({
      where: { id },
      include: { translations: { include: { language: true } } },
    }),
    db.language.findMany({ where: { isEnabled: true }, orderBy: { position: "asc" } }),
    db.affiliateLink.findMany({
      where: { deletedAt: null },
      orderBy: { brandName: "asc" },
    }),
  ]);
  if (!deal) notFound();

  const language = languages.find((l) => l.code === langCode) ?? languages[0];
  const tr = deal.translations.find((t) => t.languageId === language.id);
  const action = saveDeal.bind(null, deal.id, language.id);

  return (
    <div>
      <PageHeader title={`Edit deal: ${deal.brandName}`}>
        <StatusBadge status={deal.status} />
      </PageHeader>
      <form action={action} className="space-y-6">
        <FormSection title="Base settings (all languages)">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Brand">
              <Input name="brandName" defaultValue={deal.brandName} required />
            </Field>
            <Field label="Affiliate link" hint="Managed in Affiliate Manager">
              <Select name="affiliateLinkId" defaultValue={deal.affiliateLinkId ?? ""}>
                <option value="">— none —</option>
                {affiliateLinks.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.brandName} ({l.network.toLowerCase()})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={deal.status}>
                {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
            <Field label="Old price">
              <Input name="oldPrice" type="number" step="0.01" defaultValue={deal.oldPrice ? String(deal.oldPrice) : ""} />
            </Field>
            <Field label="New price">
              <Input name="newPrice" type="number" step="0.01" defaultValue={deal.newPrice ? String(deal.newPrice) : ""} />
            </Field>
            <Field label="Currency">
              <Input name="currency" defaultValue={deal.currency} />
            </Field>
            <Field label="Discount %">
              <Input name="discountPercent" type="number" defaultValue={deal.discountPercent ?? ""} />
            </Field>
            <Field label="Valid until">
              <Input
                name="validUntil"
                type="date"
                defaultValue={deal.validUntil ? deal.validUntil.toISOString().slice(0, 10) : ""}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title={`Content — ${language.nativeName}`}>
          <LangTabs
            basePath={`/admin/deals/${deal.id}`}
            current={language.code}
            languages={languages}
            existing={deal.translations.map((t) => t.language.code)}
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
            <Textarea name="tr_description" defaultValue={tr?.description ?? ""} rows={3} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CTA text">
              <Input name="tr_ctaText" defaultValue={tr?.ctaText ?? ""} />
            </Field>
            <Field label="Translation status">
              <Select name="tr_status" defaultValue={tr?.status ?? "DRAFT"}>
                {["DRAFT", "REVIEW", "PUBLISHED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
        </FormSection>

        <SeoFields entityType="DEAL" entityId={deal.id} languageId={language.id} />
        <SubmitButton label="Save deal" />
      </form>
    </div>
  );
}
