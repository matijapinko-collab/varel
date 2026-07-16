import "server-only";
import { db } from "@/lib/db";

/**
 * Automatic relationship suggestions (brief §33/§34). Signals are surfaced for
 * human confirmation — never auto-promoted to a real relationship. Current
 * signal: overlapping employment at the same company → possible (former)
 * colleagues, with a confidence band.
 */

function overlaps(aStart?: Date | null, aEnd?: Date | null, bStart?: Date | null, bEnd?: Date | null): boolean {
  const as = aStart?.getTime() ?? -Infinity, ae = aEnd?.getTime() ?? Infinity;
  const bs = bStart?.getTime() ?? -Infinity, be = bEnd?.getTime() ?? Infinity;
  return as <= be && bs <= ae;
}

export async function generateEmploymentSuggestions(): Promise<{ created: number }> {
  const emps = await db.bisneysEmployment.findMany({
    where: { deletedAt: null, companyId: { not: null } },
    select: { personId: true, companyId: true, startDate: true, endDate: true, isCurrent: true, company: { select: { name: true } } },
  });
  // Group by company.
  const byCompany = new Map<string, typeof emps>();
  for (const e of emps) { const k = e.companyId!; (byCompany.get(k) ?? byCompany.set(k, []).get(k)!).push(e); }

  // Existing relationships + suggestions to avoid duplicates.
  const [rels, existingSug] = await Promise.all([
    db.bisneysRelationship.findMany({ where: { deletedAt: null }, select: { sourcePersonId: true, targetPersonId: true } }),
    db.bisneysRelationshipSuggestion.findMany({ where: { signalType: "EMPLOYMENT_OVERLAP" }, select: { sourcePersonId: true, targetPersonId: true } }),
  ]);
  const pairKey = (a: string, b: string) => [a, b].sort().join(":");
  const related = new Set(rels.map((r) => pairKey(r.sourcePersonId, r.targetPersonId)));
  const suggested = new Set(existingSug.map((s) => pairKey(s.sourcePersonId, s.targetPersonId)));

  const toCreate: { sourcePersonId: string; targetPersonId: string; companyId: string; suggestedType: string; reason: string; confidence: string }[] = [];
  const seenThisRun = new Set<string>();

  for (const [companyId, list] of byCompany) {
    if (list.length > 60) continue; // guardrail (brief §44)
    const companyName = list[0].company?.name ?? "tvrtki";
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.personId === b.personId) continue;
        const key = pairKey(a.personId, b.personId);
        if (related.has(key) || suggested.has(key) || seenThisRun.has(key)) continue;
        const ov = overlaps(a.startDate, a.endDate, b.startDate, b.endDate);
        const hasDates = (a.startDate || a.endDate) && (b.startDate || b.endDate);
        const bothCurrent = a.isCurrent && b.isCurrent;
        const [s, t] = [a.personId, b.personId].sort();
        toCreate.push({
          sourcePersonId: s, targetPersonId: t, companyId,
          suggestedType: bothCurrent ? "Trenutni kolega" : "Bivši kolega",
          reason: hasDates && ov
            ? `Preklapajuće zaposlenje u ${companyName} — mogući ${bothCurrent ? "kolege" : "bivši kolege"}.`
            : `Rade/radili u istoj tvrtki (${companyName}).`,
          confidence: hasDates && ov ? "MEDIUM" : "LOW",
        });
        seenThisRun.add(key);
      }
    }
  }

  if (toCreate.length) {
    await db.bisneysRelationshipSuggestion.createMany({
      data: toCreate.map((c) => ({ ...c, signalType: "EMPLOYMENT_OVERLAP", status: "PENDING" })),
      skipDuplicates: true,
    });
  }
  return { created: toCreate.length };
}

/** Companies in the pipeline with no direct contact yet (brief §29). */
export async function companiesWithoutContact(limit = 30) {
  const companies = await db.bisneysCompany.findMany({
    where: { deletedAt: null, contacts: { none: {} }, memberships: { none: {} } },
    orderBy: [{ dealValue: "desc" }, { lastActivityAt: "desc" }],
    take: limit,
    select: { id: true, name: true, industry: true, status: true, dealValue: true, currency: true, lastActivityAt: true, _count: { select: { employments: true } } },
  });
  return companies;
}
