import "server-only";
import { db } from "@/lib/db";
import { companyInsiders } from "@/lib/bisneyscrm/relationships/pathfinder";
import { COMPANY_RELATION_LABELS } from "@/lib/bisneyscrm/companies/candidate-links";
import type { BisneysCompanyRelationType } from "@/generated/prisma/client";

/**
 * Company access summary (Company Intelligence Faza 6). Answers "how do we get
 * into this company": how many insiders we already know, how many are our own
 * candidates (a direct way in), and whether we have any direct contact. The
 * ranked entry-path search lives in the Relationship Engine
 * (/relationships/company-entry); this card links there pre-filled.
 */

export type CandidateEntry = { candidateId: string; name: string; relation: BisneysCompanyRelationType; relationLabel: string };

export type CompanyAccess = {
  directContacts: number;
  currentEmployees: number;
  formerEmployees: number;
  totalInsiders: number;
  candidateEntries: CandidateEntry[];
};

export async function companyAccessSummary(companyId: string): Promise<CompanyAccess> {
  const insiders = await companyInsiders(companyId);
  let current = 0, former = 0;
  for (const v of insiders.values()) v.current ? current++ : former++;
  const directContacts = await db.bisneysContact.count({ where: { companyId } });

  // Candidate entries: our candidates who are current/former employees here.
  const [links, candFromEmployment] = await Promise.all([
    db.bisneysCandidateCompanyLink.findMany({
      where: { companyId, deletedAt: null, relation: { in: ["CURRENT_EMPLOYEE", "FORMER_EMPLOYEE"] } },
      include: { candidate: { include: { person: { select: { fullName: true } } } } },
    }),
    insiders.size
      ? db.bisneysCandidate.findMany({ where: { personId: { in: [...insiders.keys()] }, deletedAt: null }, include: { person: { select: { id: true, fullName: true } } } })
      : Promise.resolve([]),
  ]);

  const entries = new Map<string, CandidateEntry>();
  for (const l of links) {
    entries.set(l.candidateId, { candidateId: l.candidateId, name: l.candidate.person.fullName, relation: l.relation, relationLabel: COMPANY_RELATION_LABELS[l.relation] });
  }
  for (const c of candFromEmployment) {
    if (entries.has(c.id)) continue;
    const ins = insiders.get(c.person.id);
    const relation: BisneysCompanyRelationType = ins?.current ? "CURRENT_EMPLOYEE" : "FORMER_EMPLOYEE";
    entries.set(c.id, { candidateId: c.id, name: c.person.fullName, relation, relationLabel: COMPANY_RELATION_LABELS[relation] });
  }

  return { directContacts, currentEmployees: current, formerEmployees: former, totalInsiders: insiders.size, candidateEntries: [...entries.values()] };
}
