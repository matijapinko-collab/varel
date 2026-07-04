import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { PlatformDirectory } from "@/components/finance/platform-directory";

export const metadata: Metadata = {
  title: "Best Trading Platforms — Reviews & Comparison",
  description:
    "Compare trading platforms by fees, supported assets, tools and beginner-friendliness. Editorial reviews — educational content, not financial advice.",
};

export default async function TradingPlatformsPage(
  props: PageProps<"/[locale]/finance/trading-platforms">
) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const searchParams = await props.searchParams;

  return (
    <PlatformDirectory
      locale={locale}
      type="TRADING_PLATFORM"
      title="Trading Platforms"
      intro="Compare trading platforms by fees, supported assets, charting tools and experience level — with editorial reviews and honest pros and cons."
      basePath={`/${locale}/finance/trading-platforms`}
      searchParams={searchParams}
      tradingRisk
    />
  );
}
