import "server-only";
import { db } from "@/lib/db";
import { normalizeEmail, normalizePhone } from "@/lib/bisneyscrm/forms";
import { normalizeCompanyName } from "@/lib/bisneyscrm/companywall/normalize";

/**
 * Crmble CSV import (Faza 4). Creates/links Company + Person + Contact (+ deal
 * value) from a Crmble export. Idempotent: companies dedupe by normalized name,
 * people by normalized email/phone, contacts by (company, person) — re-running
 * the same file never creates duplicates (brief §7).
 */

export type CrmbleRow = {
  firstName?: string; lastName?: string; fullName?: string;
  email?: string; phone?: string; company?: string; jobTitle?: string; source?: string; dealValue?: string;
};

export type CrmblePreviewRow = {
  index: number; name: string; company: string | null;
  personStatus: "new" | "existing"; companyStatus: "new" | "existing" | "none"; valid: boolean;
};

function resolveName(r: CrmbleRow): string {
  if (r.fullName?.trim()) return r.fullName.trim();
  return [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
}

function parseAmount(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.replace(/\./g, "").replace(/,/g, ".").match(/\d+(?:\.\d+)?/);
  const n = m ? Number(m[0]) : NaN;
  return Number.isFinite(n) ? n : null;
}

export async function previewCrmbleImport(rows: CrmbleRow[]): Promise<{ rows: CrmblePreviewRow[]; counts: { newPeople: number; existingPeople: number; newCompanies: number } }> {
  const companies = await db.bisneysCompany.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
  const companyByNorm = new Map(companies.map((c) => [normalizeCompanyName(c.name), c.id]));

  const out: CrmblePreviewRow[] = [];
  const seenNewCompanies = new Set<string>();
  let newPeople = 0, existingPeople = 0, newCompanies = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = resolveName(r);
    const nEmail = normalizeEmail(r.email ?? null);
    const nPhone = normalizePhone(r.phone ?? null);

    let personStatus: "new" | "existing" = "new";
    if (nEmail || nPhone) {
      const p = await db.bisneysPerson.findFirst({ where: { OR: [...(nEmail ? [{ normalizedEmail: nEmail }] : []), ...(nPhone ? [{ normalizedPhone: nPhone }] : [])] }, select: { id: true } });
      if (p) personStatus = "existing";
    }
    personStatus === "existing" ? existingPeople++ : newPeople++;

    let companyStatus: "new" | "existing" | "none" = "none";
    if (r.company?.trim()) {
      const norm = normalizeCompanyName(r.company);
      if (companyByNorm.has(norm)) companyStatus = "existing";
      else { companyStatus = "new"; if (!seenNewCompanies.has(norm)) { seenNewCompanies.add(norm); newCompanies++; } }
    }

    out.push({ index: i, name: name || "(bez imena)", company: r.company?.trim() || null, personStatus, companyStatus, valid: !!name });
  }
  return { rows: out, counts: { newPeople, existingPeople, newCompanies } };
}

export async function runCrmbleImport(rows: CrmbleRow[], userId: string): Promise<{ people: number; companies: number; contacts: number; deals: number; skipped: number }> {
  const companies = await db.bisneysCompany.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
  const companyByNorm = new Map(companies.map((c) => [normalizeCompanyName(c.name), c.id]));

  let peopleCreated = 0, companiesCreated = 0, contactsCreated = 0, dealsCreated = 0, skipped = 0;

  const findOrCreateCompany = async (name: string): Promise<string> => {
    const norm = normalizeCompanyName(name);
    const existing = companyByNorm.get(norm);
    if (existing) return existing;
    const created = await db.bisneysCompany.create({ data: { name: name.trim(), createdById: userId } });
    companyByNorm.set(norm, created.id);
    companiesCreated++;
    return created.id;
  };

  for (const r of rows) {
    try {
      const name = resolveName(r);
      if (!name) { skipped++; continue; }
      const nEmail = normalizeEmail(r.email ?? null);
      const nPhone = normalizePhone(r.phone ?? null);
      const parts = name.split(/\s+/);

      // Person dedup by normalized email/phone.
      let person = (nEmail || nPhone)
        ? await db.bisneysPerson.findFirst({ where: { OR: [...(nEmail ? [{ normalizedEmail: nEmail }] : []), ...(nPhone ? [{ normalizedPhone: nPhone }] : [])] } })
        : null;
      if (!person) {
        person = await db.bisneysPerson.create({
          data: {
            fullName: name, firstName: r.firstName || parts[0] || null, lastName: r.lastName || (parts.length > 1 ? parts.slice(1).join(" ") : null),
            email: r.email || null, phone: r.phone || null, normalizedEmail: nEmail, normalizedPhone: nPhone,
            source: r.source || "CRMBLE", createdById: userId,
          },
        });
        peopleCreated++;
      }

      if (r.company?.trim()) {
        const companyId = await findOrCreateCompany(r.company);
        // Contact dedup by (company, person).
        const existingContact = await db.bisneysContact.findFirst({ where: { companyId, personId: person.id } });
        if (!existingContact) {
          await db.bisneysContact.create({ data: { companyId, personId: person.id, title: r.jobTitle || null, email: r.email || null, phone: r.phone || null } });
          contactsCreated++;
        }
        // Optional deal value.
        const amount = parseAmount(r.dealValue);
        if (amount != null) {
          const hasDeal = await db.bisneysDeal.findFirst({ where: { companyId, deletedAt: null }, select: { id: true } });
          if (!hasDeal) { await db.bisneysDeal.create({ data: { companyId, name: "Crmble deal", amount, currency: "EUR", ownerId: userId } }); dealsCreated++; }
        }
      }
    } catch {
      skipped++;
    }
  }

  return { people: peopleCreated, companies: companiesCreated, contacts: contactsCreated, deals: dealsCreated, skipped };
}
