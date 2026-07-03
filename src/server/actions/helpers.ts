import "server-only";
import { auth } from "@/lib/auth";
import { roleCan, type PermissionKey } from "@/lib/permissions";
import type { UserRoleType } from "@/generated/prisma/client";

export class ActionError extends Error {}

/** Every mutating server action starts here: session + permission check. */
export async function requirePermission(permission: PermissionKey) {
  const session = await auth();
  const role = session?.user?.role as UserRoleType | undefined;
  if (!session?.user?.id || !roleCan(role, permission)) {
    throw new ActionError(`Missing permission: ${permission}`);
  }
  return { userId: session.user.id, role: role! };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function fd(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function fdBool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

export function fdNum(form: FormData, key: string): number | null {
  const v = fd(form, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** "one per line" textarea → string array */
export function fdLines(form: FormData, key: string): string[] {
  return fd(form, key)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** "question | answer" lines → FAQ array */
export function fdFaq(form: FormData, key: string): { question: string; answer: string }[] {
  return fdLines(form, key)
    .map((line) => {
      const [question, ...rest] = line.split("|");
      return { question: question?.trim() ?? "", answer: rest.join("|").trim() };
    })
    .filter((f) => f.question && f.answer);
}
