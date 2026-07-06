"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { requirePermission, fd, fdNum, fdLines } from "./helpers";
import type {
  AffiliateEntityType,
  AffiliateNetwork,
  AffiliateStatus,
} from "@/generated/prisma/client";

export async function createAffiliateLink(form: FormData) {
  const { userId } = await requirePermission("affiliate.manage");
  const brandName = fd(form, "brandName");
  const affiliateUrl = fd(form, "affiliateUrl");
  if (!brandName || !affiliateUrl) throw new Error("Brand and affiliate URL are required");

  const link = await db.affiliateLink.create({
    data: { brandName, affiliateUrl },
  });
  await audit({
    userId,
    action: "AFFILIATE_UPDATE",
    entityType: "AFFILIATE_LINK",
    entityId: link.id,
    details: { created: true },
  });
  redirect(`/administracija/affiliate/${link.id}`);
}

export async function saveAffiliateLink(linkId: string, form: FormData) {
  const { userId } = await requirePermission("affiliate.manage");
  await db.affiliateLink.update({
    where: { id: linkId },
    data: {
      brandName: fd(form, "brandName"),
      entityType: (fd(form, "entityType") || "CUSTOM") as AffiliateEntityType,
      toolId: fd(form, "toolId") || null,
      originalUrl: fd(form, "originalUrl") || null,
      affiliateUrl: fd(form, "affiliateUrl"),
      network: (fd(form, "network") || "DIRECT") as AffiliateNetwork,
      commissionType: fd(form, "commissionType") || null,
      commissionValue: fd(form, "commissionValue") || null,
      cookieDurationDays: fdNum(form, "cookieDurationDays"),
      allowedCountriesJson: fdLines(form, "allowedCountries"),
      status: (fd(form, "status") || "ACTIVE") as AffiliateStatus,
      notes: fd(form, "notes") || null,
      lastCheckedAt: fd(form, "markChecked") === "on" ? new Date() : undefined,
    },
  });
  await audit({
    userId,
    action: "AFFILIATE_UPDATE",
    entityType: "AFFILIATE_LINK",
    entityId: linkId,
  });
  revalidatePath("/administracija/affiliate");
}

export async function deleteAffiliateLink(linkId: string) {
  const { userId } = await requirePermission("affiliate.manage");
  await db.affiliateLink.update({
    where: { id: linkId },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });
  await audit({
    userId,
    action: "AFFILIATE_UPDATE",
    entityType: "AFFILIATE_LINK",
    entityId: linkId,
    details: { deleted: true },
  });
  revalidatePath("/administracija/affiliate");
}
