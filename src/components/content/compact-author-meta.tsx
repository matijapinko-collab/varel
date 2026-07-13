import Link from "next/link";
import type { Author } from "@/generated/prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { localizeAuthor, authorLabels } from "@/lib/authors";
import { AuthorAvatar } from "./author-avatar";

function fmtDate(d: Date | null | undefined, locale: Locale): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Compact author byline shown near the top of an article/review, under the
 * title. Server-rendered. For reviews it surfaces "last tested" / "pricing
 * checked"; for standard articles it shows "updated".
 */
export function CompactAuthorMeta({
  author,
  locale,
  variant = "article",
  updated,
  lastTested,
  pricingChecked,
  reviewerName,
  extra,
}: {
  author: Author;
  locale: Locale;
  variant?: "article" | "review";
  updated?: Date | null;
  lastTested?: Date | null;
  pricingChecked?: Date | null;
  reviewerName?: string | null;
  extra?: React.ReactNode;
}) {
  const a = localizeAuthor(author, locale);
  const t = authorLabels(locale);
  const isReview = variant === "review";

  const bits: { label: string; value: string }[] = [];
  const u = fmtDate(updated, locale);
  const lt = fmtDate(lastTested, locale);
  const pc = fmtDate(pricingChecked, locale);
  if (isReview) {
    if (lt) bits.push({ label: t.lastTested, value: lt });
    if (pc) bits.push({ label: t.pricingChecked, value: pc });
    if (!lt && !pc && u) bits.push({ label: t.updated, value: u });
  } else if (u) {
    bits.push({ label: t.updated, value: u });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
      <AuthorAvatar photoUrl={a.photoUrl} alt={a.photoAlt} name={a.displayName} size={28} />
      <span>
        {isReview ? t.writtenBy : t.by}{" "}
        <Link href={a.path} className="font-medium text-foreground hover:text-primary">{a.displayName}</Link>
      </span>
      {reviewerName && (
        <span>· {t.reviewedBy} <span className="font-medium text-foreground">{reviewerName}</span></span>
      )}
      {bits.map((b) => (
        <span key={b.label}>· {b.label}: {b.value}</span>
      ))}
      {extra}
    </div>
  );
}
