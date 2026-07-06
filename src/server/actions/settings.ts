"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { setSetting } from "@/lib/settings";
import { requirePermission, fd, fdBool } from "./helpers";
import type { ThemeMode } from "@/generated/prisma/client";

export async function saveAnalyticsSettings(form: FormData) {
  const { userId } = await requirePermission("settings.manage");
  await setSetting("google_analytics_id", fd(form, "google_analytics_id"));
  await setSetting("google_tag_manager_id", fd(form, "google_tag_manager_id"));
  await setSetting("search_console_verification", fd(form, "search_console_verification"));
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "SETTINGS", details: { section: "analytics" } });
  revalidatePath("/administracija/analytics");
  revalidatePath("/", "layout");
}

export async function saveGeneralSettings(form: FormData) {
  const { userId } = await requirePermission("settings.manage");
  await setSetting("site_name", fd(form, "site_name"));
  await setSetting("cookie_banner_enabled", fdBool(form, "cookie_banner_enabled"));
  await setSetting("default_language", fd(form, "default_language"));
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "SETTINGS", details: { section: "general" } });
  revalidatePath("/", "layout");
}

export async function saveBranding(form: FormData) {
  const { userId } = await requirePermission("settings.manage");
  const existing = await db.brandingSetting.findFirst();
  const data = {
    siteName: fd(form, "siteName") || "Varel",
    tagline: fd(form, "tagline") || null,
    lightLogoId: fd(form, "lightLogoId") || null,
    darkLogoId: fd(form, "darkLogoId") || null,
    faviconId: fd(form, "faviconId") || null,
    appIconId: fd(form, "appIconId") || null,
    defaultOgImageId: fd(form, "defaultOgImageId") || null,
    primaryColor: fd(form, "primaryColor") || "#2563EB",
    accentColor: fd(form, "accentColor") || "#0EA5E9",
    defaultTheme: (fd(form, "defaultTheme") || "LIGHT") as ThemeMode,
    enableThemeToggle: fdBool(form, "enableThemeToggle"),
    fontFamily: fd(form, "fontFamily") || "Inter",
    borderRadius: fd(form, "borderRadius") || "0.75rem",
    buttonStyle: fd(form, "buttonStyle") || "rounded",
  };
  if (existing) {
    await db.brandingSetting.update({ where: { id: existing.id }, data });
  } else {
    await db.brandingSetting.create({ data });
  }
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "BRANDING" });
  revalidatePath("/", "layout");
}
