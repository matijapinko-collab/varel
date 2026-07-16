import "server-only";
import { db } from "@/lib/db";
import { companyInsiders } from "./pathfinder";

/**
 * Full network graph data for the star-map view (brief §18–24, §42). Person and
 * company nodes; person↔person edges from relationships and person→company edges
 * from employment. Bounded by depth + node limit for performance (brief §23/§44).
 */

export type NetNode = {
  id: string; type: "person" | "company"; label: string; depth: number;
  meta: { role?: string; company?: string | null; candidate?: boolean; industry?: string | null; contacts?: number; focus?: boolean; target?: boolean };
};
export type NetEdge = { id: string; source: string; target: string; type: string; verified: boolean; directed: boolean };
export type Network = { nodes: NetNode[]; edges: NetEdge[]; truncated: boolean };

const NODE_LIMIT = 220;

export async function buildNetwork(opts: {
  personId?: string; companyId?: string; depth?: number; includeCompanies?: boolean; verifiedOnly?: boolean;
}): Promise<Network> {
  const depth = Math.min(Math.max(opts.depth ?? 1, 1), 3);
  const includeCompanies = opts.includeCompanies !== false;
  const nodeDepth = new Map<string, number>();
  const edges = new Map<string, NetEdge>();
  const companyNodeIds = new Set<string>();

  // Seed frontier.
  let frontier: string[] = [];
  let focusId = opts.personId ?? null;
  if (opts.personId) { nodeDepth.set(opts.personId, 0); frontier = [opts.personId]; }
  else if (opts.companyId) {
    const insiders = await companyInsiders(opts.companyId);
    for (const id of insiders.keys()) { nodeDepth.set(id, 1); frontier.push(id); }
  }

  let truncated = false;
  for (let d = 0; d < depth && frontier.length; d++) {
    if (nodeDepth.size > NODE_LIMIT) { truncated = true; break; }
    const rels = await db.bisneysRelationship.findMany({
      where: { deletedAt: null, ...(opts.verifiedOnly ? { confirmed: true } : {}), OR: [{ sourcePersonId: { in: frontier } }, { targetPersonId: { in: frontier } }] },
      include: { type: { select: { name: true } } },
    });
    const next: string[] = [];
    for (const r of rels) {
      edges.set(r.id, { id: r.id, source: r.sourcePersonId, target: r.targetPersonId, type: r.type.name, verified: r.confirmed, directed: r.direction === "DIRECTED" });
      for (const pid of [r.sourcePersonId, r.targetPersonId]) {
        if (!nodeDepth.has(pid)) { nodeDepth.set(pid, d + 1); next.push(pid); }
      }
    }
    frontier = next;
  }

  const personIds = [...nodeDepth.keys()];
  const people = await db.bisneysPerson.findMany({
    where: { id: { in: personIds } },
    select: {
      id: true, fullName: true, networkScore: true, candidate: { select: { id: true } },
      employments: { where: { deletedAt: null, isCurrent: true }, select: { companyId: true, companyName: true, title: true, company: { select: { name: true } } }, take: 1 },
      roles: { select: { role: true }, take: 3 },
    },
  });

  const nodes: NetNode[] = [];
  for (const p of people) {
    const emp = p.employments[0];
    nodes.push({
      id: p.id, type: "person", label: p.fullName, depth: nodeDepth.get(p.id) ?? 1,
      meta: { role: p.roles[0]?.role, company: emp?.company?.name ?? emp?.companyName ?? null, candidate: !!p.candidate, focus: p.id === focusId },
    });
    // person → company edge
    if (includeCompanies && emp?.companyId) {
      const cid = `c:${emp.companyId}`;
      companyNodeIds.add(emp.companyId);
      edges.set(`emp:${p.id}:${emp.companyId}`, { id: `emp:${p.id}:${emp.companyId}`, source: p.id, target: cid, type: emp.title ?? "radi u", verified: true, directed: true });
    }
  }

  if (includeCompanies) {
    if (opts.companyId) companyNodeIds.add(opts.companyId);
    if (companyNodeIds.size) {
      const companies = await db.bisneysCompany.findMany({ where: { id: { in: [...companyNodeIds] } }, select: { id: true, name: true, industry: true, _count: { select: { contacts: true } } } });
      for (const c of companies) {
        nodes.push({ id: `c:${c.id}`, type: "company", label: c.name, depth: 1, meta: { industry: c.industry, contacts: c._count.contacts, target: c.id === opts.companyId } });
      }
    }
  }

  // Drop edges whose endpoints aren't in the node set.
  const nodeIdSet = new Set(nodes.map((n) => n.id));
  const finalEdges = [...edges.values()].filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));
  return { nodes, edges: finalEdges, truncated };
}
