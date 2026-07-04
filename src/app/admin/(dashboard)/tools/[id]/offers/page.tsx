import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createOffer, saveOffer, deleteOffer } from "@/server/actions/deals";
import {
  PageHeader,
  Field,
  Input,
  Select,
  Checkbox,
  SubmitButton,
  FormSection,
} from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/delete-button";

const AVAIL = ["IN_STOCK", "OUT_OF_STOCK", "LIMITED", "PREORDER", "UNKNOWN"];

function OfferFields({
  partners,
  offer,
}: {
  partners: { id: string; name: string }[];
  offer?: {
    partnerId: string;
    merchantName: string | null;
    productUrl: string | null;
    affiliateUrl: string;
    currentPrice: unknown;
    oldPrice: unknown;
    currency: string;
    couponCode: string | null;
    couponDescription: string | null;
    shippingCost: unknown;
    availability: string;
    manuallyVerified: boolean;
    sponsored: boolean;
    isActive: boolean;
  };
}) {
  const S = (v: unknown) => (v == null ? "" : String(v));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Partner">
          <Select name="partnerId" defaultValue={offer?.partnerId ?? ""} required>
            <option value="" disabled>— select —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Merchant name" hint="Shown to users">
          <Input name="merchantName" defaultValue={offer?.merchantName ?? ""} />
        </Field>
        <Field label="Availability">
          <Select name="availability" defaultValue={offer?.availability ?? "UNKNOWN"}>
            {AVAIL.map((a) => (
              <option key={a} value={a}>{a.toLowerCase().replace("_", " ")}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Affiliate URL">
        <Input name="affiliateUrl" type="url" defaultValue={offer?.affiliateUrl ?? ""} required />
      </Field>
      <Field label="Product URL (non-affiliate, optional)">
        <Input name="productUrl" type="url" defaultValue={offer?.productUrl ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Current price">
          <Input name="currentPrice" type="number" step="0.01" defaultValue={S(offer?.currentPrice)} />
        </Field>
        <Field label="Old price">
          <Input name="oldPrice" type="number" step="0.01" defaultValue={S(offer?.oldPrice)} />
        </Field>
        <Field label="Shipping cost">
          <Input name="shippingCost" type="number" step="0.01" defaultValue={S(offer?.shippingCost)} />
        </Field>
        <Field label="Currency">
          <Input name="currency" defaultValue={offer?.currency ?? "EUR"} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Coupon code">
          <Input name="couponCode" defaultValue={offer?.couponCode ?? ""} />
        </Field>
        <Field label="Coupon description">
          <Input name="couponDescription" defaultValue={offer?.couponDescription ?? ""} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-5">
        <Checkbox name="isActive" label="Active" defaultChecked={offer?.isActive ?? true} />
        <Checkbox name="manuallyVerified" label="Manually verified" defaultChecked={offer?.manuallyVerified ?? false} />
        <Checkbox name="sponsored" label="Sponsored" defaultChecked={offer?.sponsored ?? false} />
      </div>
    </>
  );
}

export default async function ToolOffersPage(props: PageProps<"/admin/tools/[id]/offers">) {
  const { id } = await props.params;
  const [tool, partners] = await Promise.all([
    db.tool.findUnique({
      where: { id },
      include: { offers: { include: { partner: true }, orderBy: { currentPrice: "asc" } } },
    }),
    db.affiliatePartner.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  if (!tool) notFound();

  return (
    <div>
      <PageHeader title={`Offers: ${tool.name}`}>
        <Link href={`/admin/tools/${tool.id}`} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary">
          ← Back to tool
        </Link>
      </PageHeader>

      {partners.length === 0 && (
        <div className="mb-4 rounded-card border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm">
          No affiliate partners yet. <Link href="/admin/affiliate-partners/new" className="font-semibold text-primary">Create one first</Link>.
        </div>
      )}

      <div className="space-y-4">
        {tool.offers.map((offer) => (
          <details key={offer.id} className="rounded-card border border-border bg-card">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5">
              <span className="font-medium">
                {offer.merchantName ?? offer.partner.name}
                <span className="ml-2 text-sm text-muted">
                  {offer.currentPrice != null ? `${offer.currency} ${String(offer.currentPrice)}` : "—"}
                </span>
              </span>
              <span className="text-xs text-muted">
                {offer.isActive ? offer.availability.toLowerCase().replace("_", " ") : "inactive"}
              </span>
            </summary>
            <form action={saveOffer.bind(null, offer.id)} className="space-y-4 border-t border-border p-5">
              <OfferFields partners={partners} offer={offer} />
              <div className="flex items-center justify-between">
                <SubmitButton label="Save offer" />
                <DeleteButton action={deleteOffer.bind(null, offer.id)} confirmText="Delete this offer?" />
              </div>
            </form>
          </details>
        ))}
        {tool.offers.length === 0 && (
          <p className="text-sm text-muted">No offers yet — add the first below.</p>
        )}
      </div>

      {partners.length > 0 && (
        <form action={createOffer.bind(null, tool.id)} className="mt-8 max-w-2xl">
          <FormSection title="Add offer">
            <OfferFields partners={partners} />
            <SubmitButton label="Add offer" />
          </FormSection>
        </form>
      )}
    </div>
  );
}
