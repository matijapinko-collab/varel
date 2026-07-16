import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "./auth/session";

/**
 * Idempotently seeds the two initial CRM users from environment secrets
 * (brief §7). Initial passwords are NEVER hardcoded in the repo, returned to
 * the client, or logged — they arrive via env, are hashed, and only the hash
 * is stored. Safe to call repeatedly (existing users are never recreated).
 *
 *   BISNEYS_SUPERADMIN_USERNAME / _EMAIL / _INITIAL_PASSWORD   → mpinko (SUPERADMIN, mustChange=false)
 *   BISNEYS_ADMIN_USERNAME      / _EMAIL / _INITIAL_PASSWORD   → ccoklica (ADMIN, mustChange=true)
 */
export async function ensureBisneysBootstrap(): Promise<string[]> {
  const created: string[] = [];

  const seedUser = async (
    username: string | undefined,
    email: string | undefined,
    password: string | undefined,
    role: "SUPERADMIN" | "ADMIN",
    mustChangePassword: boolean,
    label: string
  ) => {
    const u = username?.trim().toLowerCase();
    const e = email?.trim().toLowerCase();
    if (!u || !e || !password) return; // nothing to seed (env may be absent after setup)

    const exists = await db.bisneysUser.findFirst({
      where: { OR: [{ username: u }, { email: e }] },
    });
    if (exists) return; // never recreate / overwrite

    await db.bisneysUser.create({
      data: {
        username: u,
        email: e,
        passwordHash: await hashPassword(password),
        role,
        mustChangePassword,
        isActive: true,
        passwordChangedAt: mustChangePassword ? null : new Date(),
      },
    });
    created.push(label);
  };

  await seedUser(
    process.env.BISNEYS_SUPERADMIN_USERNAME,
    process.env.BISNEYS_SUPERADMIN_EMAIL,
    process.env.BISNEYS_SUPERADMIN_INITIAL_PASSWORD,
    "SUPERADMIN",
    false,
    "superadmin"
  );
  await seedUser(
    process.env.BISNEYS_ADMIN_USERNAME,
    process.env.BISNEYS_ADMIN_EMAIL,
    process.env.BISNEYS_ADMIN_INITIAL_PASSWORD,
    "ADMIN",
    true,
    "admin"
  );

  if (created.length) console.info(`[bisneys] bootstrapped: ${created.join(", ")}`); // no credentials logged
  return created;
}

/**
 * Resyncs the two seed users' password hashes from the current environment
 * values (for existing users). Use only to recover from a mistyped initial
 * password env var — the plaintext still comes only from env, never logged.
 */
export async function resyncBisneysPasswords(): Promise<string[]> {
  const updated: string[] = [];
  const resync = async (username: string | undefined, password: string | undefined, mustChange: boolean, label: string) => {
    const u = username?.trim().toLowerCase();
    if (!u || !password) return;
    const existing = await db.bisneysUser.findFirst({ where: { username: u } });
    if (!existing) return;
    await db.bisneysUser.update({
      where: { id: existing.id },
      data: { passwordHash: await hashPassword(password), mustChangePassword: mustChange, sessionVersion: { increment: 1 } },
    });
    updated.push(label);
  };
  await resync(process.env.BISNEYS_SUPERADMIN_USERNAME, process.env.BISNEYS_SUPERADMIN_INITIAL_PASSWORD, false, "superadmin");
  await resync(process.env.BISNEYS_ADMIN_USERNAME, process.env.BISNEYS_ADMIN_INITIAL_PASSWORD, true, "admin");
  return updated;
}
