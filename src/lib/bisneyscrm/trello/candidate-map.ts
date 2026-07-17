import "server-only";
import { db } from "@/lib/db";
import type { CandidateLabelMap } from "@/lib/bisneyscrm/import/trello-parse";

/**
 * Persisted Trello label → candidate mapping (Faza 10). Recruiters map each
 * Trello label onto a profession / pipeline status / tag; the sync + parser
 * then enrich candidates created from cards. Stored as BisneysSetting JSON.
 */

const KEY = "candidate_label_map";

export async function getCandidateLabelMap(): Promise<CandidateLabelMap> {
  const s = await db.bisneysSetting.findUnique({ where: { key: KEY } }).catch(() => null);
  return (s?.valueJson ?? {}) as CandidateLabelMap;
}

export async function setCandidateLabelMap(map: CandidateLabelMap): Promise<void> {
  await db.bisneysSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, valueJson: map as object },
    update: { valueJson: map as object },
  });
}

/** Extracts label display names from a Trello card's stored labelsJson. */
export function labelNames(labelsJson: unknown): string[] {
  if (!Array.isArray(labelsJson)) return [];
  return labelsJson
    .map((l) => (typeof l === "string" ? l : (l as { name?: string })?.name || ""))
    .filter(Boolean);
}

/** Distinct label names seen across all synced Trello cards (for the mapping UI). */
export async function distinctCandidateLabels(): Promise<string[]> {
  const cards = await db.bisneysTrelloCard.findMany({ select: { labelsJson: true }, take: 5000 });
  const set = new Set<string>();
  for (const c of cards) for (const n of labelNames(c.labelsJson)) set.add(n);
  return [...set].sort((a, b) => a.localeCompare(b, "hr"));
}
