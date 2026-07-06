import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { saveAffiliateLink } from "@/server/actions/affiliate";
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

const NETWORKS = [
  "PARTNERSTACK", "IMPACT", "AWIN", "CJ_AFFILIATE", "AMAZON_ASSOCIATES",
  "REWARDFUL", "FIRSTPROMOTER", "DIRECT", "OTHER",
];

export default async function EditAffiliateLinkPage(
  props: PageProps<"/administracija/affiliate/[id]">
) {
  const { id } = await props.params;
  const [link, tools, clicksByCountry] = await Promise.all([
    db.affiliateLink.findUnique({
      where: { id },
      include: { _count: { select: { clicks: true } } },
    }),
    db.tool.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
    db.affiliateClick.groupBy({
      by: ["country"],
      where: { affiliateLinkId: id },
      _count: true,
      orderBy: { _count: { affiliateLinkId: "desc" } },
      take: 5,
    }),
  ]);
  if (!link) notFound();

  return (
    <div>
      <PageHeader title={`Affiliate link: ${link.brandName}`}>
        <StatusBadge status={link.status} />
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-card border border-border bg-card p-4">
          <div className="text-2xl font-bold">{link._count.clicks}</div>
          <div className="mt-1 text-xs text-muted">Total clicks</div>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <div className="truncate text-sm font-bold">
            <code className="select-all">/go/{link.id}</code>
          </div>
          <div className="mt-1 text-xs text-muted">Use this URL in content</div>
        </div>
        <div className="rounded-card border border-border bg-card p-4 sm:col-span-2">
          <div className="text-xs text-muted">Top countries</div>
          <div className="mt-1 text-sm">
            {clicksByCountry.length
              ? clicksByCountry.map((c) => `${c.country ?? "?"} (${c._count})`).join(" · ")
              : "No clicks yet"}
          </div>
        </div>
      </div>

      <form action={saveAffiliateLink.bind(null, link.id)} className="space-y-6">
        <FormSection title="Link settings">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand name">
              <Input name="brandName" defaultValue={link.brandName} required />
            </Field>
            <Field label="Network">
              <Select name="network" defaultValue={link.network}>
                {NETWORKS.map((n) => (
                  <option key={n} value={n}>{n.toLowerCase().replace(/_/g, " ")}</option>
                ))}
              </Select>
            </Field>
            <Field label="Affiliate URL" hint="Where /go/… redirects to">
              <Input name="affiliateUrl" type="url" defaultValue={link.affiliateUrl} required />
            </Field>
            <Field label="Original URL">
              <Input name="originalUrl" type="url" defaultValue={link.originalUrl ?? ""} />
            </Field>
            <Field label="Linked entity type">
              <Select name="entityType" defaultValue={link.entityType}>
                {["TOOL", "DEAL", "AMAZON_PRODUCT", "CUSTOM"].map((t) => (
                  <option key={t} value={t}>{t.toLowerCase().replace("_", " ")}</option>
                ))}
              </Select>
            </Field>
            <Field label="Linked tool (optional)">
              <Select name="toolId" defaultValue={link.toolId ?? ""}>
                <option value="">— none —</option>
                {tools.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Commission type" hint="e.g. percentage / flat / recurring">
              <Input name="commissionType" defaultValue={link.commissionType ?? ""} />
            </Field>
            <Field label="Commission value" hint="e.g. 30% or $50">
              <Input name="commissionValue" defaultValue={link.commissionValue ?? ""} />
            </Field>
            <Field label="Cookie duration (days)">
              <Input name="cookieDurationDays" type="number" defaultValue={link.cookieDurationDays ?? ""} />
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={link.status}>
                {["ACTIVE", "INACTIVE", "PENDING", "EXPIRED"].map((s) => (
                  <option key={s} value={s}>{s.toLowerCase()}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Allowed countries" hint="One ISO code per line (empty = worldwide)">
            <Textarea
              name="allowedCountries"
              defaultValue={
                Array.isArray(link.allowedCountriesJson)
                  ? (link.allowedCountriesJson as string[]).join("\n")
                  : ""
              }
              rows={2}
            />
          </Field>
          <Field label="Notes">
            <Textarea name="notes" defaultValue={link.notes ?? ""} rows={3} />
          </Field>
          <Checkbox name="markChecked" label={`Mark as checked today${link.lastCheckedAt ? ` (last: ${link.lastCheckedAt.toLocaleDateString()})` : ""}`} />
        </FormSection>
        <SubmitButton label="Save affiliate link" />
      </form>
    </div>
  );
}
