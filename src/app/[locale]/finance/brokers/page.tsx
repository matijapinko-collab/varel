import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { PlatformDirectory } from "@/components/finance/platform-directory";

export const metadata: Metadata = {
  title: "Broker Reviews — Fees, Safety & Comparison",
  description:
    "Independent editorial broker reviews: fees, supported assets, minimum deposits, safety and availability. Educational content, not financial advice.",
};

export default async function BrokersPage(props: PageProps<"/[locale]/finance/brokers">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const searchParams = await props.searchParams;

  return (
    <PlatformDirectory
      locale={locale}
      type="BROKER"
      title="Broker Reviews"
      intro="How different brokers compare on fees, assets, safety and usability — with editorial reviews and honest pros and cons."
      basePath={`/${locale}/finance/brokers`}
      searchParams={searchParams}
      tradingRisk
    />
  );
}
