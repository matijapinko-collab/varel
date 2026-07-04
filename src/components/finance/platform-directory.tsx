import { getFinancePlatforms } from "@/lib/finance-data";
import { PlatformCard, type PlatformCardData } from "@/components/finance/platform-card";
import { PlatformFilters } from "@/components/finance/platform-filters";
import { FinanceDisclaimer } from "@/components/finance/finance-disclaimer";
import type { FinancePlatformType } from "@/generated/prisma/client";
import type { Locale } from "@/lib/i18n/config";

/**
 * Shared finance platform directory (investing apps / trading platforms /
 * brokers). Search + filters via query params; server-rendered results.
 */
export async function PlatformDirectory({
  locale,
  type,
  title,
  intro,
  basePath,
  searchParams,
  tradingRisk = false,
}: {
  locale: Locale;
  type: FinancePlatformType | FinancePlatformType[];
  title: string;
  intro: string;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  tradingRisk?: boolean;
}) {
  const q = typeof searchParams.q === "string" ? searchParams.q.slice(0, 80) : undefined;
  const sort = (typeof searchParams.sort === "string" ? searchParams.sort : "rating") as
    | "rating" | "newest" | "name";
  const minRating = typeof searchParams.rating === "string" ? Number(searchParams.rating) : undefined;

  const platforms = await getFinancePlatforms({
    type,
    query: q,
    sort,
    minRating: Number.isFinite(minRating) && minRating! > 0 ? minRating : undefined,
    beginnerFriendly: searchParams.beginner === "1" || undefined,
    demoAccount: searchParams.demo === "1" || undefined,
    mobileApp: searchParams.mobile === "1" || undefined,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted">{intro}</p>
      <FinanceDisclaimer variant={tradingRisk ? "trading" : "general"} locale={locale} className="mt-4 max-w-3xl" />

      <div className="mt-6">
        <PlatformFilters
          basePath={basePath}
          current={{
            q: q ?? "",
            sort,
            rating: typeof searchParams.rating === "string" ? searchParams.rating : "0",
            beginner: searchParams.beginner === "1",
            demo: searchParams.demo === "1",
            mobile: searchParams.mobile === "1",
          }}
        />
      </div>

      {platforms.length === 0 ? (
        <p className="mt-10 text-muted">No platforms found.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {platforms.map((p) => (
            <PlatformCard key={p.id} platform={p as unknown as PlatformCardData} locale={locale} />
          ))}
        </div>
      )}

      <FinanceDisclaimer variant="affiliate" locale={locale} className="mt-8 max-w-3xl" />
    </div>
  );
}
