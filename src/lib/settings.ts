import { db } from "@/lib/db";
import type { BrandingSetting } from "@/generated/prisma/client";

/**
 * Global settings + branding access. Values are editable in the admin
 * dashboard; nothing here is hardcoded into pages.
 */

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return (row?.valueJson as T) ?? null;
}

export async function setSetting(key: string, value: unknown, description?: string) {
  await db.setting.upsert({
    where: { key },
    create: { key, valueJson: value as object, description },
    update: { valueJson: value as object },
  });
}

const DEFAULT_BRANDING: Omit<BrandingSetting, "id" | "createdAt" | "updatedAt"> = {
  siteName: "Varel",
  tagline: "Find the right tools for modern work.",
  lightLogoId: null,
  darkLogoId: null,
  faviconId: null,
  appIconId: null,
  defaultOgImageId: null,
  primaryColor: "#2563EB",
  accentColor: "#0EA5E9",
  defaultTheme: "LIGHT",
  enableThemeToggle: true,
  fontFamily: "Inter",
  borderRadius: "0.75rem",
  buttonStyle: "rounded",
  socialLinksJson: null,
};

export type BrandingWithLogos = BrandingSetting & {
  lightLogoUrl: string | null;
  darkLogoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
};

export async function getBranding(): Promise<BrandingWithLogos> {
  const row = await db.brandingSetting.findFirst();
  const base: BrandingSetting =
    row ??
    ({
      ...DEFAULT_BRANDING,
      id: "default",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as BrandingSetting);

  const mediaIds = [
    base.lightLogoId,
    base.darkLogoId,
    base.faviconId,
    base.defaultOgImageId,
  ].filter((id): id is string => Boolean(id));

  const media = mediaIds.length
    ? await db.media.findMany({ where: { id: { in: mediaIds } } })
    : [];
  const urlOf = (id: string | null) =>
    media.find((m) => m.id === id)?.url ?? null;

  return {
    ...base,
    lightLogoUrl: urlOf(base.lightLogoId),
    darkLogoUrl: urlOf(base.darkLogoId),
    faviconUrl: urlOf(base.faviconId),
    ogImageUrl: urlOf(base.defaultOgImageId),
  };
}
