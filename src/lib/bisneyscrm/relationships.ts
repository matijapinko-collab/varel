import "server-only";
import { db } from "@/lib/db";

/**
 * Relationship Engine (brief §41–48): default relationship types, a bounded
 * BFS graph builder around a focus person, referral statistics, and the
 * "how we reached this person" chain — all derived strictly from stored
 * relationships/referrals (the system never invents links, brief §48).
 */

export type RelCategory = "business" | "work" | "referral" | "personal";

export const DEFAULT_RELATIONSHIP_TYPES: { name: string; category: RelCategory; symmetric: boolean }[] = [
  // Poslovni
  { name: "Radi u tvrtki", category: "business", symmetric: false },
  { name: "Radio u tvrtki", category: "business", symmetric: false },
  { name: "Direktor tvrtke", category: "business", symmetric: false },
  { name: "Vlasnik tvrtke", category: "business", symmetric: false },
  { name: "HR u tvrtki", category: "business", symmetric: false },
  { name: "Partner tvrtke", category: "business", symmetric: false },
  { name: "Klijent", category: "business", symmetric: false },
  { name: "Dobavljač", category: "business", symmetric: false },
  // Radni
  { name: "Trenutni kolega", category: "work", symmetric: true },
  { name: "Bivši kolega", category: "work", symmetric: true },
  { name: "Nadređeni", category: "work", symmetric: false },
  { name: "Podređeni", category: "work", symmetric: false },
  { name: "Član istog tima", category: "work", symmetric: true },
  // Referral
  { name: "Preporučio kandidata", category: "referral", symmetric: false },
  { name: "Preporučio klijenta", category: "referral", symmetric: false },
  { name: "Preporučio zaposlenika", category: "referral", symmetric: false },
  { name: "Doveo lead", category: "referral", symmetric: false },
  { name: "Preporučio kontakt", category: "referral", symmetric: false },
  { name: "Preporučio tvrtku", category: "referral", symmetric: false },
  // Osobni
  { name: "Prijatelj", category: "personal", symmetric: true },
  { name: "Poznanik", category: "personal", symmetric: true },
  { name: "Član obitelji", category: "personal", symmetric: true },
];

/** Idempotently seeds the default relationship types (brief §43). */
export async function ensureRelationshipTypes(): Promise<void> {
  const count = await db.bisneysRelationshipType.count();
  if (count > 0) return;
  await db.bisneysRelationshipType.createMany({
    data: DEFAULT_RELATIONSHIP_TYPES.map((t) => ({ ...t, isSystem: true })),
    skipDuplicates: true,
  });
}

/* ---------------- graph ---------------- */

export type GraphNode = { id: string; label: string; kind: "focus" | "candidate" | "contact" | "person"; depth: number };
export type GraphEdge = { id: string; source: string; target: string; label: string; directed: boolean };
export type RelationshipGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

/** Bounded BFS around a focus person up to `maxDepth` (brief §46, lazy/small). */
export async function buildGraph(personId: string, maxDepth = 2): Promise<RelationshipGraph> {
  const nodeDepth = new Map<string, number>([[personId, 0]]);
  const edges = new Map<string, GraphEdge>();
  let frontier = [personId];

  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const rels = await db.bisneysRelationship.findMany({
      where: { OR: [{ sourcePersonId: { in: frontier } }, { targetPersonId: { in: frontier } }] },
      include: { type: { select: { name: true } } },
    });
    const next: string[] = [];
    for (const r of rels) {
      edges.set(r.id, {
        id: r.id, source: r.sourcePersonId, target: r.targetPersonId,
        label: r.type.name, directed: r.direction === "DIRECTED",
      });
      for (const pid of [r.sourcePersonId, r.targetPersonId]) {
        if (!nodeDepth.has(pid)) { nodeDepth.set(pid, depth + 1); next.push(pid); }
      }
    }
    frontier = next;
  }

  const ids = [...nodeDepth.keys()];
  const people = await db.bisneysPerson.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true, candidate: { select: { id: true } }, _count: { select: { contacts: true } } },
  });
  const nodes: GraphNode[] = people.map((p) => ({
    id: p.id,
    label: p.fullName,
    kind: p.id === personId ? "focus" : p.candidate ? "candidate" : p._count.contacts > 0 ? "contact" : "person",
    depth: nodeDepth.get(p.id) ?? 1,
  }));

  return { nodes, edges: [...edges.values()] };
}

/* ---------------- referral statistics (brief §47) ---------------- */

const INTERVIEW_STATUSES = ["FIRST_CALL", "SECOND_INTERVIEW", "CLIENT_INTERVIEW", "SENT_TO_CLIENT", "CLIENT_INTERESTED", "OFFERED", "HIRED"];

export type ReferralStats = {
  total: number; candidates: number; interviews: number; hires: number;
  successRate: number; dealValue: number; lastAt: Date | null;
};

export async function referralStats(personId: string): Promise<ReferralStats> {
  const referrals = await db.bisneysReferral.findMany({
    where: { referrerPersonId: personId },
    include: { referred: { select: { candidate: { select: { status: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  let candidates = 0, interviews = 0, hires = 0, dealValue = 0;
  for (const r of referrals) {
    const st = r.referred.candidate?.status;
    if (st) candidates++;
    if (st && INTERVIEW_STATUSES.includes(st)) interviews++;
    if (st === "HIRED" || r.resultedInHire) hires++;
    dealValue += Number(r.dealValue ?? 0);
  }
  return {
    total: referrals.length, candidates, interviews, hires,
    successRate: referrals.length ? Math.round((hires / referrals.length) * 100) : 0,
    dealValue, lastAt: referrals[0]?.createdAt ?? null,
  };
}

/* ---------------- "how we reached this person" (brief §48) ---------------- */

export type ReachStep = { fromId: string; fromName: string; toId: string; toName: string };

/** Traces the incoming referral chain (who referred whom) up to `maxHops`. */
export async function howWeReached(personId: string, maxHops = 4): Promise<ReachStep[]> {
  const steps: ReachStep[] = [];
  let current = personId;
  const seen = new Set([personId]);
  for (let i = 0; i < maxHops; i++) {
    const ref = await db.bisneysReferral.findFirst({
      where: { referredPersonId: current },
      include: { referrer: { select: { id: true, fullName: true } }, referred: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "asc" },
    });
    if (!ref || seen.has(ref.referrerPersonId)) break;
    steps.unshift({ fromId: ref.referrer.id, fromName: ref.referrer.fullName, toId: ref.referred.id, toName: ref.referred.fullName });
    seen.add(ref.referrerPersonId);
    current = ref.referrerPersonId;
  }
  return steps;
}
