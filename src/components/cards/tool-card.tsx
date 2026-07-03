import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export type ToolCardData = {
  id: string;
  name: string;
  slug: string;
  pricingModel: string;
  hasFreeTrial: boolean;
  editorRating: number | null;
  logo: { url: string; altText: string | null } | null;
  translations: { name: string; slug: string; shortDescription: string | null }[];
  categories: {
    category: {
      slug: string;
      translations: { name: string; slug: string }[];
    };
  }[];
};

const PRICING_LABELS: Record<string, string> = {
  FREE: "Free",
  FREEMIUM: "Freemium",
  PAID: "Paid",
  TRIAL: "Trial",
  OPEN_SOURCE: "Open source",
  CUSTOM: "Custom",
};

export function ToolCard({ tool, locale }: { tool: ToolCardData; locale: Locale }) {
  const t = getDictionary(locale);
  const tr = tool.translations[0];
  const name = tr?.name ?? tool.name;
  const slug = tr?.slug ?? tool.slug;
  const category = tool.categories[0]?.category;
  const categoryName = category?.translations[0]?.name;

  return (
    <Link
      href={`/${locale}/tools/${slug}`}
      className="group flex flex-col rounded-card border border-border bg-card p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-md active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {tool.logo ? (
            <Image
              src={tool.logo.url}
              alt={tool.logo.altText ?? name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-lg border border-border object-contain transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft text-sm font-bold text-primary">
              {name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold leading-tight group-hover:text-primary">
              {name}
            </div>
            {categoryName && (
              <div className="text-xs text-muted">{categoryName}</div>
            )}
          </div>
        </div>
        {tool.editorRating != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 text-xs font-semibold text-primary">
            <Star size={11} fill="currentColor" /> {tool.editorRating.toFixed(1)}
          </span>
        )}
      </div>
      {tr?.shortDescription && (
        <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted">
          {tr.shortDescription}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="rounded-full border border-border px-2 py-0.5 text-muted">
          {PRICING_LABELS[tool.pricingModel] ?? tool.pricingModel}
        </span>
        {tool.hasFreeTrial && (
          <span className="rounded-full bg-soft px-2 py-0.5 font-medium text-primary">
            {t.free_trial}
          </span>
        )}
      </div>
    </Link>
  );
}
