import "server-only";
import { db } from "@/lib/db";
import type { BisneysCompanyRelationType } from "@/generated/prisma/client";

/**
 * Candidate ↔ company aggregation (Company Intelligence Faza 5). Unifies three
 * sources into one relation view: explicit typed links, employment history
 * (current/former employee), and applications (applicant → sent-to-client →
 * hired). One Person is never duplicated — everything hangs off candidateId.
 */

export const COMPANY_RELATION_LABELS: Record<BisneysCompanyRelationType, string> = {
  CURRENT_EMPLOYEE: "Trenutačni zaposlenik",
  FORMER_EMPLOYEE: "Bivši zaposlenik",
  APPLICANT: "Prijavio se na posao",
  SOURCED_FROM_COMPANY: "Pronađen kroz tvrtku",
  REFERRED_BY_EMPLOYEE: "Preporučio zaposlenik",
  SENT_TO_CLIENT: "Poslan klijentu",
  CLIENT_INTERVIEW: "Intervju kod klijenta",
  OFFERED: "Dobio ponudu",
  HIRED: "Zaposlen",
  REJECTED_BY_CLIENT: "Odbijen od klijenta",
  PLACEMENT: "Uspješan placement",
  POTENTIAL_CONTACT: "Potencijalni kontakt",
};
export const COMPANY_RELATION_VALUES = Object.keys(COMPANY_RELATION_LABELS) as BisneysCompanyRelationType[];

const APPLICATION_STATUS_TO_RELATION: Record<string, BisneysCompanyRelationType> = {
  SENT_TO_CLIENT: "SENT_TO_CLIENT",
  CLIENT_REVIEW: "SENT_TO_CLIENT",
  CLIENT_INTERVIEW: "CLIENT_INTERVIEW",
  OFFERED: "OFFERED",
  OFFER_PENDING: "OFFERED",
  HIRED: "HIRED",
};

export type CompanyCandidateRow = {
  candidateId: string;
  name: string;
  profession: string | null;
  relation: BisneysCompanyRelationType;
  relationLabel: string;
  status: string | null;
  source: "link" | "employment" | "application";
  linkId?: string;
  lastActivity: string | null;
};

export type CompanyCandidateSummary = {
  rows: CompanyCandidateRow[];
  counts: { total: number; current: number; former: number; sentToClient: number; interview: number; hired: number };
};

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function companyCandidateSummary(companyId: string): Promise<CompanyCandidateSummary> {
  const [links, employments, applications] = await Promise.all([
    db.bisneysCandidateCompanyLink.findMany({
      where: { companyId, deletedAt: null },
      include: { candidate: { include: { person: { select: { fullName: true } }, professions: { where: { isPrimary: true }, include: { profession: { select: { name: true } } }, take: 1 } } } },
      orderBy: { createdAt: "desc" },
    }),
    db.bisneysEmployment.findMany({ where: { companyId, deletedAt: null }, orderBy: { updatedAt: "desc" } }),
    db.bisneysCandidateApplication.findMany({
      where: { companyId, deletedAt: null },
      include: { candidate: { include: { person: { select: { fullName: true } }, professions: { where: { isPrimary: true }, include: { profession: { select: { name: true } } }, take: 1 } } } },
      orderBy: { appliedAt: "desc" },
    }),
  ]);

  const rows: CompanyCandidateRow[] = [];

  for (const l of links) {
    rows.push({
      candidateId: l.candidateId, name: l.candidate.person.fullName,
      profession: l.candidate.professions[0]?.profession.name ?? null,
      relation: l.relation, relationLabel: COMPANY_RELATION_LABELS[l.relation],
      status: null, source: "link", linkId: l.id, lastActivity: iso(l.eventAt ?? l.createdAt),
    });
  }

  // Employment → current/former employee. Resolve person → candidate.
  const empPersonIds = employments.map((e) => e.personId);
  const empCandidates = empPersonIds.length
    ? await db.bisneysCandidate.findMany({
        where: { personId: { in: empPersonIds }, deletedAt: null },
        include: { person: { select: { id: true, fullName: true } }, professions: { where: { isPrimary: true }, include: { profession: { select: { name: true } } }, take: 1 } },
      })
    : [];
  const candByPerson = new Map(empCandidates.map((c) => [c.person.id, c]));
  for (const e of employments) {
    const cand = candByPerson.get(e.personId);
    if (!cand) continue; // employment for a non-candidate person — not shown here
    const relation: BisneysCompanyRelationType = e.isCurrent ? "CURRENT_EMPLOYEE" : "FORMER_EMPLOYEE";
    rows.push({
      candidateId: cand.id, name: cand.person.fullName,
      profession: cand.professions[0]?.profession.name ?? null,
      relation, relationLabel: COMPANY_RELATION_LABELS[relation],
      status: e.title ?? null, source: "employment", lastActivity: iso(e.updatedAt),
    });
  }

  for (const a of applications) {
    const relation = APPLICATION_STATUS_TO_RELATION[a.status] ?? "APPLICANT";
    rows.push({
      candidateId: a.candidateId, name: a.candidate.person.fullName,
      profession: a.candidate.professions[0]?.profession.name ?? null,
      relation, relationLabel: COMPANY_RELATION_LABELS[relation],
      status: a.status, source: "application", lastActivity: iso(a.appliedAt),
    });
  }

  const distinct = new Set(rows.map((r) => r.candidateId));
  const countRel = (rel: BisneysCompanyRelationType) => new Set(rows.filter((r) => r.relation === rel).map((r) => r.candidateId)).size;

  return {
    rows,
    counts: {
      total: distinct.size,
      current: countRel("CURRENT_EMPLOYEE"),
      former: countRel("FORMER_EMPLOYEE"),
      sentToClient: countRel("SENT_TO_CLIENT"),
      interview: countRel("CLIENT_INTERVIEW"),
      hired: countRel("HIRED") + countRel("PLACEMENT"),
    },
  };
}

/** Reverse view: companies a candidate is related to (for the candidate profile). */
export async function candidateCompanies(candidateId: string): Promise<{ companyId: string; name: string; relation: BisneysCompanyRelationType; relationLabel: string; source: string }[]> {
  const candidate = await db.bisneysCandidate.findUnique({ where: { id: candidateId }, select: { personId: true } });
  const [links, applications, employments] = await Promise.all([
    db.bisneysCandidateCompanyLink.findMany({ where: { candidateId, deletedAt: null }, include: { company: { select: { name: true } } } }),
    db.bisneysCandidateApplication.findMany({ where: { candidateId, deletedAt: null, companyId: { not: null } } }),
    candidate ? db.bisneysEmployment.findMany({ where: { personId: candidate.personId, deletedAt: null, companyId: { not: null } } }) : Promise.resolve([]),
  ]);

  // BisneysCandidateApplication/Employment carry only a companyId scalar — resolve names in one batch.
  const companyIds = [...new Set([...applications.map((a) => a.companyId), ...employments.map((e) => e.companyId)].filter(Boolean) as string[])];
  const companies = companyIds.length ? await db.bisneysCompany.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }) : [];
  const nameById = new Map(companies.map((c) => [c.id, c.name]));

  const out: { companyId: string; name: string; relation: BisneysCompanyRelationType; relationLabel: string; source: string }[] = [];
  for (const l of links) out.push({ companyId: l.companyId, name: l.company.name, relation: l.relation, relationLabel: COMPANY_RELATION_LABELS[l.relation], source: "link" });
  for (const a of applications) if (a.companyId) { const rel = APPLICATION_STATUS_TO_RELATION[a.status] ?? "APPLICANT"; out.push({ companyId: a.companyId, name: nameById.get(a.companyId) ?? "—", relation: rel, relationLabel: COMPANY_RELATION_LABELS[rel], source: "application" }); }
  for (const e of employments) if (e.companyId) { const rel: BisneysCompanyRelationType = e.isCurrent ? "CURRENT_EMPLOYEE" : "FORMER_EMPLOYEE"; out.push({ companyId: e.companyId, name: nameById.get(e.companyId) ?? e.companyName ?? "—", relation: rel, relationLabel: COMPANY_RELATION_LABELS[rel], source: "employment" }); }
  return out;
}
