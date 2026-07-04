import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveFinancePlatform } from "@/server/actions/finance";
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
import { SeoFields } from "@/components/admin/seo-fields";
import { strList } from "@/lib/finance-data";

export default async function EditFinancePlatformPage(
  props: PageProps<"/admin/finance-platforms/[id]">
) {
  const { id } = await props.params;
  const [platform, others, defaultLang] = await Promise.all([
    db.financePlatform.findUnique({
      where: { id },
      include: { alternatives: true },
    }),
    db.financePlatform.findMany({
      where: { deletedAt: null, id: { not: id } },
      orderBy: { name: "asc" },
    }),
    db.language.findFirst({ where: { isDefault: true } }),
  ]);
  if (!platform || !defaultLang) notFound();

  const faqText = Array.isArray(platform.faqJson)
    ? (platform.faqJson as { question: string; answer: string }[])
        .map((f) => `${f.question} | ${f.answer}`)
        .join("\n")
    : "";

  return (
    <div>
      <PageHeader title={`Review: ${platform.name}`}>
        <StatusBadge status={platform.status} />
        <Link
          href={`/en/finance/platforms/${platform.slug}`}
          target="_blank"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          Preview ↗
        </Link>
      </PageHeader>

      <form action={saveFinancePlatform.bind(null, platform.id)} className="space-y-6">
        <FormSection title="Basics">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name"><Input name="name" defaultValue={platform.name} required /></Field>
            <Field label="Slug"><Input name="slug" defaultValue={platform.slug} /></Field>
            <Field label="Type">
              <Select name="type" defaultValue={platform.type}>
                <option value="BROKER">Broker</option>
                <option value="TRADING_PLATFORM">Trading platform</option>
                <option value="INVESTING_APP">Investing app</option>
                <option value="PORTFOLIO_TOOL">Portfolio tool</option>
                <option value="PERSONAL_FINANCE_APP">Personal finance app</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Company"><Input name="companyName" defaultValue={platform.companyName ?? ""} /></Field>
            <Field label="Website URL"><Input name="websiteUrl" type="url" defaultValue={platform.websiteUrl ?? ""} /></Field>
            <Field label="Affiliate / referral URL"><Input name="affiliateUrl" type="url" defaultValue={platform.affiliateUrl ?? ""} /></Field>
            <Field label="Logo media ID"><Input name="logoId" defaultValue={platform.logoId ?? ""} /></Field>
            <Field label="Status">
              <Select name="status" defaultValue={platform.status}>
                {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Short description">
            <Textarea name="description" defaultValue={platform.description ?? ""} rows={2} />
          </Field>
          <div className="flex flex-wrap gap-5">
            <Checkbox name="demoAccount" label="Demo account" defaultChecked={platform.demoAccount} />
            <Checkbox name="mobileApp" label="Mobile app" defaultChecked={platform.mobileApp} />
            <Checkbox name="desktopPlatform" label="Desktop platform" defaultChecked={platform.desktopPlatform} />
            <Checkbox name="webPlatform" label="Web platform" defaultChecked={platform.webPlatform} />
            <Checkbox name="beginnerFriendly" label="Beginner-friendly" defaultChecked={platform.beginnerFriendly} />
            <Checkbox name="markReviewed" label={`Mark as reviewed today${platform.lastReviewedAt ? ` (last: ${platform.lastReviewedAt.toLocaleDateString()})` : ""}`} />
          </div>
        </FormSection>

        <FormSection title="Fees, deposits & availability">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Minimum deposit"><Input name="minimumDeposit" defaultValue={platform.minimumDeposit ?? ""} /></Field>
            <Field label="Pricing model"><Input name="pricingModel" defaultValue={platform.pricingModel ?? ""} /></Field>
          </div>
          <Field label="Fee summary"><Textarea name="feeSummary" defaultValue={platform.feeSummary ?? ""} rows={2} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Supported countries" hint="One per line">
              <Textarea name="supportedCountries" defaultValue={strList(platform.supportedCountriesJson).join("\n")} rows={3} />
            </Field>
            <Field label="Supported assets" hint="One per line">
              <Textarea name="supportedAssets" defaultValue={strList(platform.supportedAssetsJson).join("\n")} rows={3} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Ratings (0–5, decimals allowed)">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["ratingOverall", "Overall", platform.ratingOverall],
              ["ratingFees", "Fees", platform.ratingFees],
              ["ratingEaseOfUse", "Ease of use", platform.ratingEaseOfUse],
              ["ratingFeatures", "Features", platform.ratingFeatures],
              ["ratingResearchTools", "Research tools", platform.ratingResearchTools],
              ["ratingSupport", "Support", platform.ratingSupport],
            ].map(([name, label, value]) => (
              <Field key={String(name)} label={String(label)}>
                <Input name={String(name)} type="number" step="0.1" min="0" max="5" defaultValue={value == null ? "" : String(value)} />
              </Field>
            ))}
          </div>
        </FormSection>

        <FormSection title="Editorial content">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pros" hint="One per line">
              <Textarea name="pros" defaultValue={strList(platform.prosJson).join("\n")} rows={4} />
            </Field>
            <Field label="Cons" hint="One per line">
              <Textarea name="cons" defaultValue={strList(platform.consJson).join("\n")} rows={4} />
            </Field>
          </div>
          <Field label="Best for"><Input name="bestFor" defaultValue={platform.bestFor ?? ""} /></Field>
          <Field label="Who should avoid it">
            <Textarea name="whoShouldAvoid" defaultValue={platform.whoShouldAvoid ?? ""} rows={2} />
          </Field>
          <Field label="Risk overview (shown in a highlighted box)">
            <Textarea name="riskDisclaimer" defaultValue={platform.riskDisclaimer ?? ""} rows={2} />
          </Field>
          <Field label="Full review (HTML)">
            <Textarea name="reviewContent" defaultValue={platform.reviewContent ?? ""} rows={12} />
          </Field>
          <Field label="FAQ" hint="One per line: Question | Answer">
            <Textarea name="faq" defaultValue={faqText} rows={3} />
          </Field>
        </FormSection>

        <FormSection title="Alternatives">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {others.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="alternativeIds"
                  value={o.id}
                  defaultChecked={platform.alternatives.some((a) => a.alternativePlatformId === o.id)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                {o.name}
              </label>
            ))}
            {others.length === 0 && <p className="text-sm text-muted">No other platforms yet.</p>}
          </div>
        </FormSection>

        <SeoFields entityType="FINANCE_PLATFORM" entityId={platform.id} languageId={defaultLang.id} />
        <SubmitButton label="Save review" />
      </form>
    </div>
  );
}
