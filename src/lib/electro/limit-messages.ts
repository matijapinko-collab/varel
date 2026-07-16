/**
 * Pure, db-free limit/team messages (brief §9, §72). Separated from limits.ts
 * and team.ts (which import the database) so they are unit-testable in the plain
 * node test runner and reusable on the client.
 */

/** Human names for limit keys, used in the §72-style error message. */
const LIMIT_LABELS: Record<string, string> = {
  maxActiveProjects: "aktivnih projekata",
  maxArchivedProjects: "arhiviranih projekata",
  maxUsers: "korisnika",
  maxAdmins: "administratora",
  maxInvestors: "investitora",
  maxBranches: "podružnica",
  maxWarehouses: "skladišta",
};

/** The §72 message for a reached limit. */
export function limitReachedMessage(key: string, limit: number): string {
  const what = LIMIT_LABELS[key] ?? key;
  return `Dosegnuli ste limit od ${limit} ${what} za svoj paket. Zatražite viši paket ili oslobodite postojeće stavke.`;
}

/** The §9 guard message shown before any action that would drop the last admin. */
export const LAST_ADMIN_MESSAGE =
  "Tvrtka mora imati najmanje jednog aktivnog administratora. Prije uklanjanja ove uloge dodijelite administratorska prava drugom korisniku.";
