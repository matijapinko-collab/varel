import { affiliateDisclosure } from "@/lib/deals";

/** Clear affiliate disclosure shown on deal, product, review and comparison pages. */
export function AffiliateDisclosure({
  locale,
  className = "",
}: {
  locale: string;
  className?: string;
}) {
  return (
    <p
      className={`rounded-card border border-border bg-background-secondary px-4 py-2.5 text-xs text-muted ${className}`}
    >
      {affiliateDisclosure(locale)}
    </p>
  );
}
