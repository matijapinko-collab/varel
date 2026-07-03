import type { UserRoleType } from "@/generated/prisma/client";

/**
 * Central permission catalogue. The same keys are seeded into the
 * `permissions` table; this map is the runtime source of truth for checks.
 */
export const PERMISSION_KEYS = [
  "content.create",
  "content.edit",
  "content.publish",
  "content.delete",
  "tools.manage",
  "affiliate.manage",
  "seo.manage",
  "media.manage",
  "translations.manage",
  "analytics.view",
  "security.view",
  "settings.manage",
  "users.manage",
  "versions.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_PERMISSIONS: Record<UserRoleType, readonly PermissionKey[]> = {
  OWNER: PERMISSION_KEYS,
  ADMIN: [
    "content.create",
    "content.edit",
    "content.publish",
    "content.delete",
    "tools.manage",
    "affiliate.manage",
    "seo.manage",
    "media.manage",
    "translations.manage",
    "analytics.view",
    "security.view",
    "settings.manage",
  ],
  EDITOR: [
    "content.create",
    "content.edit",
    "content.publish",
    "tools.manage",
    "media.manage",
    "analytics.view",
  ],
  WRITER: ["content.create", "content.edit"],
  TRANSLATOR: ["translations.manage", "content.edit"],
  AFFILIATE_MANAGER: ["affiliate.manage", "analytics.view"],
  SEO_MANAGER: ["seo.manage", "analytics.view"],
  VIEWER: ["analytics.view"],
};

export function roleCan(
  role: UserRoleType | undefined | null,
  permission: PermissionKey
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
