import "server-only";
import { db } from "@/lib/db";
import { referralStats } from "@/lib/bisneyscrm/relationships";

/**
 * Relationship scores (brief §30). Never arbitrary — each score is derived from
 * countable facts and returned with a breakdown for the tooltip. Three scores:
 * network reach, referral track record, company access.
 */

export type ScoreBreakdown = { label: string; value: number }[];
export type PersonScores = {
  network: number; referral: number; companyAccess: number;
  networkBreakdown: ScoreBreakdown; referralBreakdown: ScoreBreakdown; companyBreakdown: ScoreBreakdown;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export async function computePersonScores(personId: string): Promise<PersonScores> {
  const [relFrom, relTo, employments, memberships, contacts, ref] = await Promise.all([
    db.bisneysRelationship.count({ where: { deletedAt: null, sourcePersonId: personId } }),
    db.bisneysRelationship.count({ where: { deletedAt: null, targetPersonId: personId } }),
    db.bisneysEmployment.findMany({ where: { personId, deletedAt: null }, select: { companyId: true, companyName: true } }),
    db.bisneysCompanyMembership.findMany({ where: { personId }, select: { companyId: true } }),
    db.bisneysContact.findMany({ where: { personId }, select: { companyId: true } }),
    referralStats(personId),
  ]);

  const directRelations = relFrom + relTo;
  const companies = new Set<string>();
  for (const e of employments) companies.add(e.companyId ?? e.companyName ?? "");
  for (const m of memberships) companies.add(m.companyId);
  for (const c of contacts) companies.add(c.companyId);
  companies.delete("");

  const networkBreakdown: ScoreBreakdown = [
    { label: "Direktne veze", value: directRelations },
    { label: "Povezane tvrtke", value: companies.size },
    { label: "Dane preporuke", value: ref.total },
  ];
  const network = clamp(directRelations * 8 + companies.size * 6 + ref.total * 4);

  const referralBreakdown: ScoreBreakdown = [
    { label: "Preporuke", value: ref.total },
    { label: "Intervjui", value: ref.interviews },
    { label: "Zaposleni", value: ref.hires },
  ];
  const referral = clamp(ref.total * 6 + ref.interviews * 10 + ref.hires * 30);

  const companyBreakdown: ScoreBreakdown = [
    { label: "Tvrtke pristupa", value: companies.size },
    { label: "Uspješne preporuke", value: ref.hires },
  ];
  const companyAccess = clamp(companies.size * 12 + ref.hires * 15 + directRelations * 3);

  return { network, referral, companyAccess, networkBreakdown, referralBreakdown, companyBreakdown };
}
