"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/security";
import { getSetting, setSetting } from "@/lib/settings";
import { requirePermission, fd, fdBool, fdNum } from "./helpers";
import { getAmazonCredentials, PRICE_CHECKER_SETTINGS_KEY } from "@/lib/price-checker/config";
import { searchItems, AmazonApiError } from "@/lib/price-checker/amazon";
import type { PriceCheckerSettings } from "@/lib/price-checker/config";

const AMAZON_STATUS_KEY = "amazon_integration_status";

export type AmazonIntegrationStatus = {
  lastTestedAt?: string;
  lastSuccessAt?: string;
  lastError?: string | null;
};

export async function getAmazonStatus(): Promise<AmazonIntegrationStatus> {
  return (await getSetting<AmazonIntegrationStatus>(AMAZON_STATUS_KEY)) ?? {};
}

/**
 * Tests the Amazon PA-API connection using the env-configured credentials and
 * records the outcome. Secrets are never returned to the client — only status.
 */
export async function testAmazonConnection() {
  const { userId } = await requirePermission("settings.manage");
  const creds = getAmazonCredentials();
  const now = new Date().toISOString();

  if (!creds) {
    const status: AmazonIntegrationStatus = {
      lastTestedAt: now,
      lastError: "Not configured — set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY and AMAZON_PARTNER_TAG.",
    };
    await setSetting(AMAZON_STATUS_KEY, status);
    await audit({
      userId,
      action: "SETTINGS_UPDATE",
      entityType: "INTEGRATION",
      entityId: "amazon-paapi",
      details: { test: "not_configured" },
    });
    revalidatePath("/administracija/integrations");
    return;
  }

  let status: AmazonIntegrationStatus;
  try {
    await searchItems(creds, "test", 1);
    status = { lastTestedAt: now, lastSuccessAt: now, lastError: null };
  } catch (e) {
    const message =
      e instanceof AmazonApiError
        ? `${e.code ? `[${e.code}] ` : ""}${e.message}`
        : (e as Error).message;
    status = { lastTestedAt: now, lastError: message };
  }

  await setSetting(AMAZON_STATUS_KEY, status);
  await audit({
    userId,
    action: "SETTINGS_UPDATE",
    entityType: "INTEGRATION",
    entityId: "amazon-paapi",
    details: { test: status.lastError ? "failed" : "success" },
  });
  revalidatePath("/administracija/integrations");
}

/** Saves non-secret Varel Price Checker settings. */
export async function savePriceCheckerSettings(form: FormData) {
  const { userId } = await requirePermission("settings.manage");

  const resultsRaw = fdNum(form, "resultsPerSearch") ?? 10;
  const cacheRaw = fdNum(form, "cacheMinutes") ?? 30;

  const settings: PriceCheckerSettings = {
    enabled: fdBool(form, "enabled"),
    resultsPerSearch: Math.min(15, Math.max(10, resultsRaw)),
    showPrime: fdBool(form, "showPrime"),
    showRating: fdBool(form, "showRating"),
    showReviews: fdBool(form, "showReviews"),
    showAvailability: fdBool(form, "showAvailability"),
    cacheEnabled: fdBool(form, "cacheEnabled"),
    cacheMinutes: Math.min(1440, Math.max(1, cacheRaw)),
    affiliateDisclosure: fd(form, "affiliateDisclosure"),
    pageTitle: fd(form, "pageTitle") || "Varel Price Checker",
    pageSubtitle: fd(form, "pageSubtitle"),
    searchPlaceholder: fd(form, "searchPlaceholder"),
    noResultsMessage: fd(form, "noResultsMessage"),
    errorMessage: fd(form, "errorMessage"),
    unavailableMessage: fd(form, "unavailableMessage"),
  };

  await setSetting(PRICE_CHECKER_SETTINGS_KEY, settings, "Varel Price Checker settings");
  await audit({
    userId,
    action: "SETTINGS_UPDATE",
    entityType: "SETTINGS",
    details: { section: "price_checker" },
  });
  revalidatePath("/administracija/price-checker");
  revalidatePath("/", "layout");
}
