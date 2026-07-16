import "server-only";
import { db } from "@/lib/db";

/**
 * Shortest-path / company-entry finder (brief §25–28). BFS over the person↔person
 * relationship graph, plus person→company links from employment / membership /
 * contact, to answer "how do we get into this company?". Paths are ranked
 * (brief §27): fewer hops, verified + referral edges, and insider role weigh in.
 * Bounded by maxDepth (default 4) for safety/performance (brief §45).
 */

type Edge = { to: string; relId: string; type: string; verified: boolean; strength: number };

async function loadAdjacency(verifiedOnly: boolean): Promise<Map<string, Edge[]>> {
  const rels = await db.bisneysRelationship.findMany({
    where: { deletedAt: null, ...(verifiedOnly ? { confirmed: true } : {}) },
    select: { id: true, sourcePersonId: true, targetPersonId: true, confirmed: true, strengthScore: true, type: { select: { name: true, category: true } } },
  });
  const adj = new Map<string, Edge[]>();
  const add = (from: string, e: Edge) => { (adj.get(from) ?? adj.set(from, []).get(from)!).push(e); };
  for (const r of rels) {
    const type = r.type.name;
    const strength = r.strengthScore ?? (r.type.category === "referral" ? 70 : 50);
    add(r.sourcePersonId, { to: r.targetPersonId, relId: r.id, type, verified: r.confirmed, strength });
    add(r.targetPersonId, { to: r.sourcePersonId, relId: r.id, type, verified: r.confirmed, strength });
  }
  return adj;
}

export type CompanyInsider = { personId: string; role: string; current: boolean };

/** People connected to a company via employment, membership or contact. */
export async function companyInsiders(companyId: string): Promise<Map<string, CompanyInsider>> {
  const [emp, mem, con] = await Promise.all([
    db.bisneysEmployment.findMany({ where: { companyId, deletedAt: null }, select: { personId: true, isCurrent: true, title: true } }),
    db.bisneysCompanyMembership.findMany({ where: { companyId }, select: { personId: true, current: true, role: true } }),
    db.bisneysContact.findMany({ where: { companyId }, select: { personId: true, title: true } }),
  ]);
  const map = new Map<string, CompanyInsider>();
  for (const e of emp) map.set(e.personId, { personId: e.personId, role: e.title ?? "zaposlenik", current: e.isCurrent });
  for (const m of mem) if (!map.has(m.personId)) map.set(m.personId, { personId: m.personId, role: m.role ?? "zaposlenik", current: m.current });
  for (const c of con) if (!map.has(c.personId)) map.set(c.personId, { personId: c.personId, role: c.title ?? "kontakt", current: true });
  return map;
}

export type PathStep = { fromId: string; fromName: string; toId: string; toName: string; relType: string; verified: boolean };
export type EntryPath = {
  insiderId: string; insiderName: string; insiderRole: string; insiderCurrent: boolean;
  steps: PathStep[]; hops: number; score: number; band: "Niska" | "Srednja" | "Visoka";
};

function band(score: number): EntryPath["band"] {
  return score >= 70 ? "Visoka" : score >= 45 ? "Srednja" : "Niska";
}

/** BFS parent map from source over the adjacency graph, up to maxDepth. */
function bfs(adj: Map<string, Edge[]>, source: string, maxDepth: number) {
  const parent = new Map<string, { via: Edge; from: string }>();
  const dist = new Map<string, number>([[source, 0]]);
  let frontier = [source];
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const e of adj.get(node) ?? []) {
        if (!dist.has(e.to)) { dist.set(e.to, d + 1); parent.set(e.to, { via: e, from: node }); next.push(e.to); }
      }
    }
    frontier = next;
  }
  return { parent, dist };
}

/** Finds ranked entry paths from a person into a target company. */
export async function findEntryToCompany(sourcePersonId: string, companyId: string, opts: { maxDepth?: number; verifiedOnly?: boolean } = {}): Promise<EntryPath[]> {
  const maxDepth = Math.min(opts.maxDepth ?? 4, 4);
  const [adj, insiders] = await Promise.all([loadAdjacency(!!opts.verifiedOnly), companyInsiders(companyId)]);
  if (insiders.size === 0) return [];

  const { parent, dist } = bfs(adj, sourcePersonId, maxDepth);

  // Collect names for people that appear in reconstructed paths.
  const reachableInsiders = [...insiders.keys()].filter((id) => dist.has(id));
  const involved = new Set<string>([sourcePersonId, ...reachableInsiders]);
  for (const id of reachableInsiders) {
    let cur = id;
    while (parent.has(cur)) { const p = parent.get(cur)!; involved.add(p.from); cur = p.from; }
  }
  const people = await db.bisneysPerson.findMany({ where: { id: { in: [...involved] } }, select: { id: true, fullName: true } });
  const nameOf = (id: string) => people.find((p) => p.id === id)?.fullName ?? "—";

  const paths: EntryPath[] = [];
  for (const insiderId of reachableInsiders) {
    // reconstruct source → insider
    const chain: string[] = [insiderId];
    let cur = insiderId;
    while (parent.has(cur)) { const p = parent.get(cur)!; chain.unshift(p.from); cur = p.from; }
    const steps: PathStep[] = [];
    let verifiedAll = true, strengthSum = 0;
    for (let i = 0; i < chain.length - 1; i++) {
      const e = parent.get(chain[i + 1])!.via;
      steps.push({ fromId: chain[i], fromName: nameOf(chain[i]), toId: chain[i + 1], toName: nameOf(chain[i + 1]), relType: e.type, verified: e.verified });
      verifiedAll = verifiedAll && e.verified;
      strengthSum += e.strength;
    }
    const insider = insiders.get(insiderId)!;
    const hops = steps.length + 1; // +1 for insider → company
    const avgStrength = steps.length ? strengthSum / steps.length : 60;
    // Score: closeness + verification + strength + current-insider bonus.
    let score = 100 - (hops - 1) * 18;
    if (verifiedAll && steps.length) score += 12;
    score += (avgStrength - 50) * 0.3;
    if (insider.current) score += 8;
    score = Math.max(5, Math.min(100, Math.round(score)));
    paths.push({ insiderId, insiderName: nameOf(insiderId), insiderRole: insider.role, insiderCurrent: insider.current, steps, hops, score, band: band(score) });
  }
  return paths.sort((a, b) => b.score - a.score || a.hops - b.hops).slice(0, 8);
}

/** Shortest path between two people (brief §26). */
export async function findPathBetween(sourcePersonId: string, targetPersonId: string, opts: { maxDepth?: number; verifiedOnly?: boolean } = {}): Promise<PathStep[] | null> {
  const maxDepth = Math.min(opts.maxDepth ?? 4, 4);
  const adj = await loadAdjacency(!!opts.verifiedOnly);
  const { parent, dist } = bfs(adj, sourcePersonId, maxDepth);
  if (!dist.has(targetPersonId)) return null;
  const chain: string[] = [targetPersonId];
  let cur = targetPersonId;
  while (parent.has(cur)) { const p = parent.get(cur)!; chain.unshift(p.from); cur = p.from; }
  const people = await db.bisneysPerson.findMany({ where: { id: { in: chain } }, select: { id: true, fullName: true } });
  const nameOf = (id: string) => people.find((p) => p.id === id)?.fullName ?? "—";
  const steps: PathStep[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const e = parent.get(chain[i + 1])!.via;
    steps.push({ fromId: chain[i], fromName: nameOf(chain[i]), toId: chain[i + 1], toName: nameOf(chain[i + 1]), relType: e.type, verified: e.verified });
  }
  return steps;
}
