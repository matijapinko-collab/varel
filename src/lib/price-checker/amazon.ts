import crypto from "node:crypto";
import type { AmazonCredentials } from "./config";
import type { PriceCheckerResult } from "./types";

/**
 * Amazon Product Advertising API (PA-API v5) client — SearchItems operation.
 *
 * Server-side only. Requests are signed with AWS Signature Version 4. Secrets
 * are never logged or returned to the client. Amazon is NOT scraped: this is
 * the official API. All product links use the configured Partner Tag.
 */

const SERVICE = "ProductAdvertisingAPI";
const OPERATION = "SearchItems";
const TARGET = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${OPERATION}`;
const PATH = "/paapi5/searchitems";
const CONTENT_ENCODING = "amz-1.0";

const RESOURCES = [
  "Images.Primary.Large",
  "ItemInfo.Title",
  "Offers.Listings.Price",
  "Offers.Listings.SavingBasis",
  "Offers.Listings.Availability.Message",
  "Offers.Listings.DeliveryInfo.IsPrimeEligible",
  "Offers.Listings.MerchantInfo",
  "CustomerReviews.Count",
  "CustomerReviews.StarRating",
];

function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function signatureKey(secretKey: string, dateStamp: string, region: string): Buffer {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

type AmazonImage = { URL?: string };
type AmazonListing = {
  Price?: { Amount?: number; Currency?: string; DisplayAmount?: string };
  SavingBasis?: { Amount?: number };
  Availability?: { Message?: string };
  DeliveryInfo?: { IsPrimeEligible?: boolean };
  MerchantInfo?: { Name?: string };
};
type AmazonItem = {
  ASIN?: string;
  DetailPageURL?: string;
  Images?: { Primary?: { Large?: AmazonImage } };
  ItemInfo?: { Title?: { DisplayValue?: string } };
  Offers?: { Listings?: AmazonListing[] };
  CustomerReviews?: { Count?: number; StarRating?: { Value?: number } };
};
type SearchItemsResponse = {
  SearchResult?: { Items?: AmazonItem[] };
  Errors?: { Code?: string; Message?: string }[];
};

export class AmazonApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "AmazonApiError";
  }
}

function mapItem(item: AmazonItem, partnerTag: string): PriceCheckerResult | null {
  const asin = item.ASIN;
  const title = item.ItemInfo?.Title?.DisplayValue;
  if (!asin || !title) return null;

  const listing = item.Offers?.Listings?.[0];
  const price = listing?.Price?.Amount;
  const currency = listing?.Price?.Currency;
  const oldPrice = listing?.SavingBasis?.Amount;
  let discountPercent: number | undefined;
  if (price != null && oldPrice != null && oldPrice > price) {
    discountPercent = Math.round(((oldPrice - price) / oldPrice) * 100);
  }

  // Prefer Amazon's affiliate-tagged DetailPageURL; fall back to a tagged URL.
  const affiliateUrl =
    item.DetailPageURL ??
    `https://www.amazon.de/dp/${asin}?tag=${encodeURIComponent(partnerTag)}`;

  const rating = item.CustomerReviews?.StarRating?.Value;
  const reviewCount = item.CustomerReviews?.Count;

  return {
    id: asin,
    title,
    imageUrl: item.Images?.Primary?.Large?.URL,
    price: price ?? undefined,
    currency: currency ?? undefined,
    oldPrice: oldPrice != null && oldPrice > (price ?? 0) ? oldPrice : undefined,
    discountPercent,
    rating: rating ?? undefined,
    reviewCount: reviewCount ?? undefined,
    isPrime: listing?.DeliveryInfo?.IsPrimeEligible ?? undefined,
    availability: listing?.Availability?.Message ?? undefined,
    merchantName: listing?.MerchantInfo?.Name ?? undefined,
    affiliateUrl,
  };
}

/**
 * Runs a SearchItems request against PA-API v5 and returns normalized results.
 * Throws AmazonApiError on transport/API failure (callers map to a generic
 * user-facing error and log the technical detail server-side).
 */
export async function searchItems(
  creds: AmazonCredentials,
  keywords: string,
  itemCount: number
): Promise<PriceCheckerResult[]> {
  const payload = JSON.stringify({
    Keywords: keywords,
    SearchIndex: "All",
    ItemCount: Math.min(10, Math.max(1, itemCount)), // PA-API caps ItemCount at 10
    PartnerTag: creds.partnerTag,
    PartnerType: "Associates",
    Marketplace: creds.marketplaceUrl,
    Resources: RESOURCES,
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders =
    `content-encoding:${CONTENT_ENCODING}\n` +
    `host:${creds.host}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-target:${TARGET}\n`;
  const signedHeaders = "content-encoding;host;x-amz-date;x-amz-target";
  const payloadHash = sha256Hex(payload);

  const canonicalRequest = [
    "POST",
    PATH,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${creds.region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = hmac(
    signatureKey(creds.secretKey, dateStamp, creds.region),
    stringToSign
  ).toString("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${creds.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  let res: Response;
  try {
    res = await fetch(`https://${creds.host}${PATH}`, {
      method: "POST",
      headers: {
        "content-encoding": CONTENT_ENCODING,
        "content-type": "application/json; charset=utf-8",
        host: creds.host,
        "x-amz-date": amzDate,
        "x-amz-target": TARGET,
        Authorization: authorization,
      },
      body: payload,
      // PA-API is fast; keep a bounded timeout so the route never hangs.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    throw new AmazonApiError(
      `PA-API request failed: ${(e as Error).message}`
    );
  }

  const text = await res.text();
  let json: SearchItemsResponse;
  try {
    json = JSON.parse(text) as SearchItemsResponse;
  } catch {
    throw new AmazonApiError(`PA-API returned non-JSON (status ${res.status})`, res.status);
  }

  if (!res.ok) {
    const err = json.Errors?.[0];
    throw new AmazonApiError(
      err?.Message ?? `PA-API error (status ${res.status})`,
      res.status,
      err?.Code
    );
  }

  const items = json.SearchResult?.Items ?? [];
  return items
    .map((it) => mapItem(it, creds.partnerTag))
    .filter((r): r is PriceCheckerResult => r !== null);
}
