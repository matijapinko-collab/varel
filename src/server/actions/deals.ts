"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, slugify, fd, fdBool, fdNum } from "./helpers";
import type { OfferAvailability, PartnerType } from "@/generated/prisma/client";

/* ---------------- Affiliate partners ---------------- */

export async function createAffiliatePartner(form: FormData) {
  const { userId } = await requirePermission("affiliate.manage");
  const name = fd(form, "name");
  if (!name) throw new Error("Name is required");
  const partner = await db.affiliatePartner.create({
    data: { name, slug: slugify(fd(form, "slug") || name) },
  });
  await audit({ userId, action: "AFFILIATE_UPDATE", entityType: "PARTNER", entityId: partner.id, details: { created: true } });
  redirect(`/administracija/affiliate-partners/${partner.id}`);
}

export async function saveAffiliatePartner(partnerId: string, form: FormData) {
  const { userId } = await requirePermission("affiliate.manage");
  await db.affiliatePartner.update({
    where: { id: partnerId },
    data: {
      name: fd(form, "name"),
      slug: slugify(fd(form, "slug") || fd(form, "name")),
      websiteUrl: fd(form, "websiteUrl") || null,
      affiliateNetwork: fd(form, "affiliateNetwork") || null,
      partnerType: (fd(form, "partnerType") || "DIRECT") as PartnerType,
      defaultTrackingParams: fd(form, "defaultTrackingParams") || null,
      feedUrl: fd(form, "feedUrl") || null,
      contactEmail: fd(form, "contactEmail") || null,
      priority: fdNum(form, "priority") ?? 0,
      isActive: fdBool(form, "isActive"),
      notes: fd(form, "notes") || null,
      logoId: fd(form, "logoId") || null,
    },
  });
  await audit({ userId, action: "AFFILIATE_UPDATE", entityType: "PARTNER", entityId: partnerId });
  revalidatePath("/administracija/affiliate-partners");
  revalidatePath("/", "layout");
}

export async function deleteAffiliatePartner(partnerId: string) {
  const { userId } = await requirePermission("affiliate.manage");
  await db.affiliatePartner.update({
    where: { id: partnerId },
    data: { deletedAt: new Date(), isActive: false },
  });
  await audit({ userId, action: "AFFILIATE_UPDATE", entityType: "PARTNER", entityId: partnerId, details: { deleted: true } });
  revalidatePath("/administracija/affiliate-partners");
}

/* ---------------- Product offers ---------------- */

export async function createOffer(toolId: string, form: FormData) {
  const { userId } = await requirePermission("affiliate.manage");
  const partnerId = fd(form, "partnerId");
  const affiliateUrl = fd(form, "affiliateUrl");
  if (!partnerId || !affiliateUrl) throw new Error("Partner and affiliate URL are required");
  const offer = await db.productOffer.create({
    data: {
      toolId,
      partnerId,
      merchantName: fd(form, "merchantName") || null,
      productUrl: fd(form, "productUrl") || null,
      affiliateUrl,
      currentPrice: fdNum(form, "currentPrice"),
      oldPrice: fdNum(form, "oldPrice"),
      currency: fd(form, "currency") || "EUR",
      couponCode: fd(form, "couponCode") || null,
      couponDescription: fd(form, "couponDescription") || null,
      shippingCost: fdNum(form, "shippingCost"),
      availability: (fd(form, "availability") || "UNKNOWN") as OfferAvailability,
      manuallyVerified: fdBool(form, "manuallyVerified"),
      sponsored: fdBool(form, "sponsored"),
      isActive: fdBool(form, "isActive"),
      lastCheckedAt: new Date(),
    },
  });
  // Seed the first price-history point.
  await db.priceHistory.create({
    data: {
      offerId: offer.id,
      toolId,
      partnerId,
      price: offer.currentPrice,
      oldPrice: offer.oldPrice,
      currency: offer.currency,
      availability: offer.availability,
    },
  });
  await audit({ userId, action: "AFFILIATE_UPDATE", entityType: "OFFER", entityId: offer.id, details: { created: true } });
  revalidatePath(`/administracija/tools/${toolId}/offers`);
  revalidatePath("/", "layout");
}

export async function saveOffer(offerId: string, form: FormData) {
  const { userId } = await requirePermission("affiliate.manage");
  const prev = await db.productOffer.findUnique({ where: { id: offerId } });
  if (!prev) throw new Error("Offer not found");

  const currentPrice = fdNum(form, "currentPrice");
  const availability = (fd(form, "availability") || "UNKNOWN") as OfferAvailability;

  const offer = await db.productOffer.update({
    where: { id: offerId },
    data: {
      partnerId: fd(form, "partnerId") || prev.partnerId,
      merchantName: fd(form, "merchantName") || null,
      productUrl: fd(form, "productUrl") || null,
      affiliateUrl: fd(form, "affiliateUrl") || prev.affiliateUrl,
      currentPrice,
      oldPrice: fdNum(form, "oldPrice"),
      currency: fd(form, "currency") || "EUR",
      couponCode: fd(form, "couponCode") || null,
      couponDescription: fd(form, "couponDescription") || null,
      shippingCost: fdNum(form, "shippingCost"),
      availability,
      manuallyVerified: fdBool(form, "manuallyVerified"),
      sponsored: fdBool(form, "sponsored"),
      isActive: fdBool(form, "isActive"),
      lastCheckedAt: new Date(),
    },
  });

  // Record a price-history point when the price or availability changed.
  const changed =
    String(prev.currentPrice) !== String(offer.currentPrice) ||
    prev.availability !== offer.availability;
  if (changed) {
    await db.priceHistory.create({
      data: {
        offerId: offer.id,
        toolId: offer.toolId,
        partnerId: offer.partnerId,
        price: offer.currentPrice,
        oldPrice: offer.oldPrice,
        currency: offer.currency,
        availability: offer.availability,
      },
    });
  }
  await audit({ userId, action: "AFFILIATE_UPDATE", entityType: "OFFER", entityId: offerId });
  revalidatePath(`/administracija/tools/${offer.toolId}/offers`);
  revalidatePath("/", "layout");
}

export async function deleteOffer(offerId: string) {
  const { userId } = await requirePermission("affiliate.manage");
  const offer = await db.productOffer.delete({ where: { id: offerId } });
  await audit({ userId, action: "AFFILIATE_UPDATE", entityType: "OFFER", entityId: offerId, details: { deleted: true } });
  revalidatePath(`/administracija/tools/${offer.toolId}/offers`);
  revalidatePath("/", "layout");
}

/* ---------------- Expired deal handling (Phase 2) ---------------- */

/** Archives all published deals whose end date has passed. */
export async function archiveExpiredDeals() {
  const { userId } = await requirePermission("content.edit");
  const now = new Date();
  const result = await db.deal.updateMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      OR: [{ endsAt: { lt: now } }, { AND: [{ endsAt: null }, { validUntil: { lt: now } }] }],
    },
    data: { status: "ARCHIVED" },
  });
  await audit({
    userId,
    action: "UPDATE",
    entityType: "DEAL",
    details: { archivedExpired: result.count },
  });
  revalidatePath("/administracija/deals");
  revalidatePath("/", "layout");
}

/* ---------------- Partner feed fetch (Phase 3) ---------------- */

/** Downloads a partner's official CSV datafeed and imports it now. */
export async function fetchFeedNow(partnerId: string) {
  const { userId } = await requirePermission("affiliate.manage");
  const { fetchPartnerFeed } = await import("@/server/import-offers");
  const report = await fetchPartnerFeed(partnerId);
  await audit({
    userId,
    action: "AFFILIATE_UPDATE",
    entityType: "PARTNER_FEED",
    entityId: partnerId,
    details: "error" in report ? { error: report.error } : { ...report, errors: report.errors.length },
  });
  if ("error" in report) throw new Error(report.error);
  revalidatePath("/administracija/affiliate-partners");
  revalidatePath("/", "layout");
}
