import "server-only";
import { db } from "@/lib/db";

/**
 * Generates the next per-company project code, "P-0001" style (brief §17).
 * Scoped to the company so codes are unique within a tenant (enforced by the
 * @@unique([companyId, code]) constraint as a backstop against races).
 */
export async function nextProjectCode(companyId: string): Promise<string> {
  const count = await db.electroProject.count({ where: { companyId } });
  return `P-${String(count + 1).padStart(4, "0")}`;
}
