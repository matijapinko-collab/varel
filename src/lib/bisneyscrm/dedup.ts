import "server-only";
import { db } from "@/lib/db";

/**
 * Duplicate detection (brief §57). Never merges automatically — surfaces likely
 * duplicate groups for manual review. People match on email / phone / name;
 * companies on name / OIB.
 */

export type DupMember = { id: string; label: string; sub: string; createdAt: Date };
export type DupGroup = { reason: string; members: DupMember[] };

function dedupeGroups(groups: Map<string, DupMember[]>): DupGroup[] {
  const out: DupGroup[] = [];
  const seenSets = new Set<string>();
  for (const [key, members] of groups) {
    if (members.length < 2) continue;
    const ids = members.map((m) => m.id).sort();
    const setKey = ids.join(",");
    if (seenSets.has(setKey)) continue;
    seenSets.add(setKey);
    out.push({ reason: key.split(":")[0], members: members.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) });
  }
  return out;
}

const REASON: Record<string, string> = { e: "Isti email", p: "Isti telefon", n: "Isto ime", o: "Isti OIB", cn: "Isti naziv" };

export async function findDuplicatePeople(): Promise<DupGroup[]> {
  const people = await db.bisneysPerson.findMany({ where: { deletedAt: null }, select: { id: true, fullName: true, email: true, phone: true, city: true, createdAt: true } });
  const g = new Map<string, DupMember[]>();
  const push = (k: string, m: DupMember) => { (g.get(k) ?? g.set(k, []).get(k)!).push(m); };
  for (const p of people) {
    const m: DupMember = { id: p.id, label: p.fullName, sub: [p.email, p.phone, p.city].filter(Boolean).join(" · "), createdAt: p.createdAt };
    if (p.email) push(`e:${p.email.toLowerCase().trim()}`, m);
    if (p.phone) push(`p:${p.phone.replace(/\s/g, "")}`, m);
    push(`n:${p.fullName.toLowerCase().trim()}`, m);
  }
  return dedupeGroups(g).map((x) => ({ ...x, reason: REASON[x.reason] ?? x.reason }));
}

export async function findDuplicateCompanies(): Promise<DupGroup[]> {
  const companies = await db.bisneysCompany.findMany({ where: { deletedAt: null }, select: { id: true, name: true, oib: true, city: true, createdAt: true } });
  const g = new Map<string, DupMember[]>();
  const push = (k: string, m: DupMember) => { (g.get(k) ?? g.set(k, []).get(k)!).push(m); };
  for (const c of companies) {
    const m: DupMember = { id: c.id, label: c.name, sub: [c.oib, c.city].filter(Boolean).join(" · "), createdAt: c.createdAt };
    push(`cn:${c.name.toLowerCase().trim()}`, m);
    if (c.oib) push(`o:${c.oib.trim()}`, m);
  }
  return dedupeGroups(g).map((x) => ({ ...x, reason: REASON[x.reason] ?? x.reason }));
}
