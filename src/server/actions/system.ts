"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI } from "otplib";
import { db } from "@/lib/db";
import { audit } from "@/lib/security";
import { validatePassword } from "@/lib/security";
import { requirePermission, fd, fdBool } from "./helpers";
import type { UserRoleType, VersionStatus } from "@/generated/prisma/client";

/* ---------------- Languages ---------------- */

export async function saveLanguage(languageId: string, form: FormData) {
  const { userId } = await requirePermission("settings.manage");
  await db.language.update({
    where: { id: languageId },
    data: {
      isEnabled: fdBool(form, "isEnabled"),
      isDefault: fdBool(form, "isDefault"),
    },
  });
  if (fdBool(form, "isDefault")) {
    await db.language.updateMany({
      where: { id: { not: languageId }, isDefault: true },
      data: { isDefault: false },
    });
  }
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LANGUAGE", entityId: languageId });
  revalidatePath("/admin/languages");
  revalidatePath("/", "layout");
}

export async function addLanguage(form: FormData) {
  const { userId } = await requirePermission("settings.manage");
  const code = fd(form, "code").toLowerCase().slice(0, 5);
  const name = fd(form, "name");
  const nativeName = fd(form, "nativeName") || name;
  if (!code || !name) throw new Error("Code and name are required");
  const count = await db.language.count();
  await db.language.upsert({
    where: { code },
    create: { code, name, nativeName, isEnabled: true, position: count },
    update: { isEnabled: true },
  });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "LANGUAGE", details: { added: code } });
  revalidatePath("/admin/languages");
}

/* ---------------- Users ---------------- */

export async function createUser(form: FormData) {
  const { userId } = await requirePermission("users.manage");
  const password = fd(form, "password");
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);

  const role = await db.role.findUnique({
    where: { type: (fd(form, "roleType") || "VIEWER") as UserRoleType },
  });
  if (!role) throw new Error("Role not found");

  const user = await db.user.create({
    data: {
      name: fd(form, "name"),
      username: fd(form, "username").toLowerCase(),
      email: fd(form, "email").toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      roleId: role.id,
    },
  });
  await audit({ userId, action: "CREATE", entityType: "USER", entityId: user.id });
  revalidatePath("/admin/users");
}

export async function updateUser(targetUserId: string, form: FormData) {
  const { userId } = await requirePermission("users.manage");
  const role = await db.role.findUnique({
    where: { type: (fd(form, "roleType") || "VIEWER") as UserRoleType },
  });
  if (!role) throw new Error("Role not found");

  const data: Record<string, unknown> = {
    name: fd(form, "name"),
    roleId: role.id,
    isActive: fdBool(form, "isActive"),
  };
  const password = fd(form, "password");
  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);
    data.passwordHash = await bcrypt.hash(password, 12);
  }
  if (fdBool(form, "disable2fa")) {
    data.twoFactorEnabled = false;
    data.twoFactorSecret = null;
  }

  await db.user.update({ where: { id: targetUserId }, data });
  await audit({
    userId,
    action: "ROLE_CHANGE",
    entityType: "USER",
    entityId: targetUserId,
    details: { role: role.type },
  });
  revalidatePath("/admin/users");
}

/** Step 1 of 2FA setup: generate a secret and otpauth URI for the current user. */
export async function generateTwoFactorSecret() {
  const { userId } = await requirePermission("analytics.view"); // any signed-in admin role
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const secret = generateSecret();
  await db.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });
  return {
    secret,
    uri: generateURI({ secret, issuer: "Varel", label: user.email }),
  };
}

/** Step 2: verify a code from the authenticator app and enable 2FA. */
export async function enableTwoFactor(form: FormData) {
  const { userId } = await requirePermission("analytics.view");
  const { verifySync } = await import("otplib");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) throw new Error("Generate a secret first");
  const token = fd(form, "token").replace(/\s/g, "");
  if (!verifySync({ token, secret: user.twoFactorSecret }).valid) {
    throw new Error("Invalid code — try again");
  }
  await db.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  await audit({ userId, action: "SETTINGS_UPDATE", entityType: "USER", entityId: userId, details: { twoFactor: "enabled" } });
  revalidatePath("/admin/users");
}

/* ---------------- Version manager & backups ---------------- */

export async function createVersion(form: FormData) {
  const { userId } = await requirePermission("versions.manage");
  const version = fd(form, "version");
  const title = fd(form, "title");
  if (!version || !title) throw new Error("Version and title are required");

  const v = await db.appVersion.create({
    data: {
      version,
      title,
      changelog: fd(form, "changelog") || null,
      createdById: userId,
      packages: {
        create: {
          codePatch: fd(form, "codePatch") || null,
          migrationPatch: fd(form, "migrationPatch") || null,
          configPatch: fd(form, "configPatch") || null,
          notes: fd(form, "notes") || null,
        },
      },
    },
  });
  await audit({ userId, action: "VERSION_UPDATE", entityType: "APP_VERSION", entityId: v.id, details: { created: version } });
  revalidatePath("/admin/versions");
}

export async function setVersionStatus(versionId: string, status: VersionStatus) {
  const { userId } = await requirePermission("versions.manage");
  await db.appVersion.update({
    where: { id: versionId },
    data: {
      status,
      appliedAt: status === "APPLIED" ? new Date() : undefined,
    },
  });
  await audit({
    userId,
    action: status === "ROLLED_BACK" ? "ROLLBACK" : "VERSION_UPDATE",
    entityType: "APP_VERSION",
    entityId: versionId,
    details: { status },
  });
  revalidatePath("/admin/versions");
}

export async function recordBackup(form: FormData) {
  const { userId } = await requirePermission("versions.manage");
  await db.backup.create({
    data: {
      type: "MANUAL",
      status: "COMPLETED",
      notes: fd(form, "notes") || "Manual backup (see docs/BACKUP.md for the export command)",
      createdById: userId,
    },
  });
  await audit({ userId, action: "BACKUP_CREATED", entityType: "BACKUP" });
  revalidatePath("/admin/versions");
}
