"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { bisneysAudit } from "@/lib/bisneyscrm/audit";
import { normalizeEmail, normalizePhone } from "@/lib/bisneyscrm/forms";
import { parseCandidateFromCard, type CandidateLabelMap } from "@/lib/bisneyscrm/import/trello-parse";

export type ImportRow = {
  fullName?: string; firstName?: string; lastName?: string;
  email?: string; phone?: string; city?: string; country?: string;
  profession?: string; source?: string; seniority?: string; expectedSalary?: string;
  notes?: string; tags?: string;
};

export type PreviewRow = {
  index: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: "new" | "duplicate" | "invalid";
  matchName?: string;
  reason?: string;
};

function resolveName(r: ImportRow): string {
  if (r.fullName && r.fullName.trim()) return r.fullName.trim();
  return [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
}

/** Dry-run: classifies each row as new / duplicate (existing person) / invalid. */
export async function previewCandidateImport(rows: ImportRow[]): Promise<{ rows: PreviewRow[]; counts: { new: number; duplicate: number; invalid: number } }> {
  await requireBisneysUser();
  const out: PreviewRow[] = [];
  const seenEmail = new Set<string>();
  const seenPhone = new Set<string>();
  const counts = { new: 0, duplicate: 0, invalid: 0 };

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fullName = resolveName(r);
    const nEmail = normalizeEmail(r.email ?? null);
    const nPhone = normalizePhone(r.phone ?? null);
    if (!fullName) { out.push({ index: i, fullName: "(bez imena)", email: nEmail, phone: nPhone, status: "invalid", reason: "Nedostaje ime" }); counts.invalid++; continue; }

    let dup = false; let matchName: string | undefined;
    // In-file duplicate.
    if (nEmail && seenEmail.has(nEmail)) { dup = true; matchName = "isti u datoteci"; }
    else if (nPhone && seenPhone.has(nPhone)) { dup = true; matchName = "isti u datoteci"; }
    // Existing DB person.
    if (!dup && (nEmail || nPhone)) {
      const existing = await db.bisneysPerson.findFirst({
        where: { OR: [...(nEmail ? [{ normalizedEmail: nEmail }] : []), ...(nPhone ? [{ normalizedPhone: nPhone }] : [])] },
        select: { fullName: true },
      });
      if (existing) { dup = true; matchName = existing.fullName; }
    }
    if (nEmail) seenEmail.add(nEmail);
    if (nPhone) seenPhone.add(nPhone);

    out.push({ index: i, fullName, email: nEmail, phone: nPhone, status: dup ? "duplicate" : "new", matchName });
    dup ? counts.duplicate++ : counts.new++;
  }
  return { rows: out, counts };
}

async function resolveProfessionId(name: string | undefined): Promise<string | null> {
  const n = (name ?? "").trim();
  if (!n) return null;
  const exact = await db.bisneysProfession.findFirst({ where: { name: { equals: n, mode: "insensitive" } }, select: { id: true } });
  if (exact) return exact.id;
  const alias = await db.bisneysProfessionAlias.findFirst({ where: { alias: { equals: n, mode: "insensitive" } }, select: { professionId: true } });
  return alias?.professionId ?? null;
}

/** Commits the import. skipDuplicates skips rows matching an existing person. */
export async function runCandidateImport(rows: ImportRow[], opts: { skipDuplicates: boolean }): Promise<{ created: number; skipped: number; failed: number }> {
  const user = await requireBisneysUser();
  let created = 0, skipped = 0, failed = 0;

  for (const r of rows) {
    try {
      const fullName = resolveName(r);
      if (!fullName) { failed++; continue; }
      const nEmail = normalizeEmail(r.email ?? null);
      const nPhone = normalizePhone(r.phone ?? null);

      if (opts.skipDuplicates && (nEmail || nPhone)) {
        const existing = await db.bisneysPerson.findFirst({
          where: { OR: [...(nEmail ? [{ normalizedEmail: nEmail }] : []), ...(nPhone ? [{ normalizedPhone: nPhone }] : [])] },
          select: { id: true },
        });
        if (existing) { skipped++; continue; }
      }

      const professionId = await resolveProfessionId(r.profession);
      const tags = (r.tags ?? "").split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
      const parts = fullName.split(/\s+/);

      const person = await db.bisneysPerson.create({
        data: {
          fullName, firstName: r.firstName || parts[0] || null, lastName: r.lastName || (parts.length > 1 ? parts.slice(1).join(" ") : null),
          email: r.email || null, phone: r.phone || null, normalizedEmail: nEmail, normalizedPhone: nPhone,
          city: r.city || null, country: r.country || null, source: r.source || "IMPORT", createdById: user.id,
        },
      });
      const candidate = await db.bisneysCandidate.create({
        data: {
          personId: person.id, recruiterId: user.id, source: r.source || "IMPORT",
          seniority: r.seniority || null, expectedSalary: r.expectedSalary || null, notes: r.notes || null,
          primaryProfessionId: professionId, tags, enteredAt: new Date(), lastActivityAt: new Date(),
        },
      });
      if (professionId) {
        await db.bisneysCandidateProfession.create({ data: { candidateId: candidate.id, professionId, isPrimary: true } }).catch(() => {});
      }
      created++;
    } catch {
      failed++;
    }
  }

  await bisneysAudit({ userId: user.id, action: "candidates_imported", entityType: "candidate", after: { created, skipped, failed } });
  revalidatePath("/bisneyscrm/candidates");
  return { created, skipped, failed };
}

/** Reads label names off a synced Trello card's labelsJson. */
function cardLabels(labelsJson: unknown): string[] {
  if (!Array.isArray(labelsJson)) return [];
  return labelsJson.map((l) => (typeof l === "string" ? l : (l as { name?: string; color?: string })?.name || "")).filter(Boolean);
}

/**
 * Parses synced Trello cards (BisneysTrelloCard) into candidate rows via the
 * Trello parser + a persisted label map (BisneysSetting "candidate_label_map"),
 * then imports them (skipping duplicates). Cards already linked to a candidate
 * are ignored.
 */
export async function importCandidatesFromTrello(opts?: { listId?: string }): Promise<{ parsed: number; created: number; skipped: number; failed: number }> {
  const user = await requireBisneysUser();
  const setting = await db.bisneysSetting.findUnique({ where: { key: "candidate_label_map" } }).catch(() => null);
  const labelMap = (setting?.valueJson ?? {}) as CandidateLabelMap;

  const cards = await db.bisneysTrelloCard.findMany({
    where: { closed: false, ...(opts?.listId ? { listId: opts.listId } : {}), OR: [{ linkedType: null }, { linkedType: "CANDIDATE" }] },
    take: 1000,
  });

  const rows: ImportRow[] = cards.map((c) => {
    const parsed = parseCandidateFromCard({ name: c.name, desc: c.description, labels: cardLabels(c.labelsJson) }, labelMap);
    return {
      fullName: parsed.fullName,
      email: parsed.email ?? undefined,
      phone: parsed.phone ?? undefined,
      profession: parsed.professionHint ?? undefined,
      source: "TRELLO",
      notes: parsed.notes ?? undefined,
      tags: parsed.tags.join(", ") || undefined,
    };
  });

  const res = await runCandidateImport(rows, { skipDuplicates: true });
  await bisneysAudit({ userId: user.id, action: "candidates_imported_trello", entityType: "candidate", after: { parsed: rows.length, ...res } });
  return { parsed: rows.length, ...res };
}
