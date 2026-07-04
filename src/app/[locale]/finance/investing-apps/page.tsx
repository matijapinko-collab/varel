import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { PlatformDirectory } from "@/components/finance/platform-directory";

export const metadata: Metadata = {
  title: "Best Investing Apps — Reviews & Comparison",
  description:
    "Compare investing apps by fees, features, beginner-friendliness and availability. Editorial reviews and ratings — educational content, not financial advice.",
};

export default async function InvestingAppsPage(
  props: PageProps<"/[locale]/finance/investing-apps">
) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const searchParams = await props.searchParams;

  return (
    <PlatformDirectory
      locale={locale}
      type={["INVESTING_APP", "PERSONAL_FINANCE_APP", "PORTFOLIO_TOOL"]}
      title="Investing Apps"
      intro="Compare investing and personal-finance apps by fees, usability and features — with editorial reviews and honest pros and cons."
      basePath={`/${locale}/finance/investing-apps`}
      searchParams={searchParams}
    />
  );
}
