import "server-only";
import { db } from "@/lib/db";

/**
 * Profession alias engine (brief §9). Resolves a profession query to the set of
 * matching profession ids — not a naive LIKE. Distinguishes exact/alias/related.
 * `includeAliases` folds in synonyms; `includeRelated` folds in srodna zanimanja.
 */
export async function resolveProfessionIds(
  query: string,
  opts: { includeAliases?: boolean; includeRelated?: boolean } = {}
): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  const like = { contains: q, mode: "insensitive" as const };

  const ids = new Set<string>();

  // Exact / name match.
  const byName = await db.bisneysProfession.findMany({ where: { name: like }, select: { id: true } });
  byName.forEach((p) => ids.add(p.id));

  // Aliases.
  if (opts.includeAliases !== false) {
    const byAlias = await db.bisneysProfessionAlias.findMany({ where: { alias: like }, select: { professionId: true } });
    byAlias.forEach((a) => ids.add(a.professionId));
  }

  // Related professions (one hop).
  if (opts.includeRelated && ids.size) {
    const rel = await db.bisneysRelatedProfession.findMany({
      where: { OR: [{ professionId: { in: [...ids] } }, { relatedProfessionId: { in: [...ids] } }] },
      select: { professionId: true, relatedProfessionId: true },
    });
    rel.forEach((r) => { ids.add(r.professionId); ids.add(r.relatedProfessionId); });
  }

  return [...ids];
}

/** Candidate ids that have any of the given professions (primary or additional). */
export async function candidateIdsForProfessions(professionIds: string[]): Promise<string[]> {
  if (!professionIds.length) return [];
  const rows = await db.bisneysCandidateProfession.findMany({
    where: { professionId: { in: professionIds } },
    select: { candidateId: true },
    distinct: ["candidateId"],
  });
  return rows.map((r) => r.candidateId);
}
