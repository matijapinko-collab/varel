import "server-only";
import { db } from "@/lib/db";

/**
 * Relationship Intelligence Engine — core types, roles, seeding, graph, referral
 * stats and "how we reached" (brief §11, §15, §32, §47). Path-finding, scoring
 * and suggestions live in ./relationships/*.
 */

export type RelCategory = "business" | "work" | "referral" | "personal";

/** Person role set (brief §11), stored on BisneysPersonRole.role. */
export const PERSON_ROLES = [
  "CANDIDATE", "CONTACT", "CLIENT", "REFERRER", "DIRECTOR", "OWNER", "HR_MANAGER",
  "MANAGER", "EMPLOYEE", "FORMER_EMPLOYEE", "PARTNER", "SUPPLIER", "SALES_LEAD", "RECRUITER", "OTHER",
] as const;
export type PersonRole = (typeof PERSON_ROLES)[number];

export const PERSON_ROLE_LABELS: Record<string, string> = {
  CANDIDATE: "Kandidat", CONTACT: "Kontakt", CLIENT: "Klijent", REFERRER: "Preporučitelj",
  DIRECTOR: "Direktor", OWNER: "Vlasnik", HR_MANAGER: "HR", MANAGER: "Voditelj", EMPLOYEE: "Zaposlenik",
  FORMER_EMPLOYEE: "Bivši zaposlenik", PARTNER: "Partner", SUPPLIER: "Dobavljač",
  SALES_LEAD: "Sales lead", RECRUITER: "Recruiter", OTHER: "Ostalo",
};

/** Extended relationship type catalogue with slug + metadata (brief §15). */
type TypeDef = { name: string; slug: string; category: RelCategory; symmetric: boolean; color: string; icon: string };
export const DEFAULT_RELATIONSHIP_TYPES: TypeDef[] = [
  // Referral
  { name: "Preporučio kandidata", slug: "REFERRED_CANDIDATE", category: "referral", symmetric: false, color: "#10b981", icon: "user-plus" },
  { name: "Preporučio klijenta", slug: "REFERRED_CLIENT", category: "referral", symmetric: false, color: "#10b981", icon: "briefcase" },
  { name: "Preporučio kontakt", slug: "REFERRED_CONTACT", category: "referral", symmetric: false, color: "#10b981", icon: "contact" },
  { name: "Preporučio tvrtku", slug: "REFERRED_COMPANY", category: "referral", symmetric: false, color: "#10b981", icon: "building" },
  { name: "Doveo lead", slug: "BROUGHT_LEAD", category: "referral", symmetric: false, color: "#10b981", icon: "trending-up" },
  { name: "Upoznao s", slug: "INTRODUCED_TO", category: "referral", symmetric: false, color: "#34d399", icon: "handshake" },
  // Work
  { name: "Trenutni kolega", slug: "CURRENT_COLLEAGUE", category: "work", symmetric: true, color: "#6366f1", icon: "users" },
  { name: "Bivši kolega", slug: "FORMER_COLLEAGUE", category: "work", symmetric: true, color: "#818cf8", icon: "users" },
  { name: "Nadređeni", slug: "MANAGER_OF", category: "work", symmetric: false, color: "#6366f1", icon: "chevron-up" },
  { name: "Podređeni", slug: "REPORTS_TO", category: "work", symmetric: false, color: "#6366f1", icon: "chevron-down" },
  { name: "Član istog tima", slug: "SAME_TEAM", category: "work", symmetric: true, color: "#818cf8", icon: "users" },
  { name: "Radili zajedno", slug: "WORKED_TOGETHER", category: "work", symmetric: true, color: "#818cf8", icon: "users" },
  // Business
  { name: "Vlasnik tvrtke", slug: "OWNER_OF", category: "business", symmetric: false, color: "#f59e0b", icon: "crown" },
  { name: "Direktor tvrtke", slug: "DIRECTOR_OF", category: "business", symmetric: false, color: "#f59e0b", icon: "star" },
  { name: "HR u tvrtki", slug: "HR_AT", category: "business", symmetric: false, color: "#f59e0b", icon: "users" },
  { name: "Zaposlen u tvrtki", slug: "EMPLOYEE_AT", category: "business", symmetric: false, color: "#f59e0b", icon: "briefcase" },
  { name: "Bivši zaposlenik tvrtke", slug: "FORMER_EMPLOYEE_AT", category: "business", symmetric: false, color: "#fbbf24", icon: "briefcase" },
  { name: "Kontakt klijenta", slug: "CLIENT_CONTACT_AT", category: "business", symmetric: false, color: "#f59e0b", icon: "contact" },
  { name: "Partner", slug: "PARTNER_OF", category: "business", symmetric: true, color: "#f59e0b", icon: "handshake" },
  { name: "Kontakt dobavljača", slug: "SUPPLIER_CONTACT_AT", category: "business", symmetric: false, color: "#f59e0b", icon: "truck" },
  // Personal
  { name: "Prijatelj", slug: "FRIEND", category: "personal", symmetric: true, color: "#64748b", icon: "heart" },
  { name: "Poznanik", slug: "ACQUAINTANCE", category: "personal", symmetric: true, color: "#94a3b8", icon: "user" },
  { name: "Član obitelji", slug: "FAMILY_MEMBER", category: "personal", symmetric: true, color: "#64748b", icon: "heart" },
];

/** Idempotently seeds/updates the relationship type catalogue (brief §15/§43). */
export async function ensureRelationshipTypes(): Promise<void> {
  for (const t of DEFAULT_RELATIONSHIP_TYPES) {
    await db.bisneysRelationshipType.upsert({
      where: { name: t.name },
      create: { name: t.name, slug: t.slug, category: t.category, symmetric: t.symmetric, directed: !t.symmetric, color: t.color, icon: t.icon, isSystem: true, isActive: true },
      update: { slug: t.slug, category: t.category, color: t.color, icon: t.icon, directed: !t.symmetric },
    });
  }
}

/* ---------------- graph (person-centric, for the profile card) ---------------- */

export type GraphNode = { id: string; label: string; kind: "focus" | "candidate" | "contact" | "person"; depth: number };
export type GraphEdge = { id: string; source: string; target: string; label: string; directed: boolean };
export type RelationshipGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

export async function buildGraph(personId: string, maxDepth = 2): Promise<RelationshipGraph> {
  const nodeDepth = new Map<string, number>([[personId, 0]]);
  const edges = new Map<string, GraphEdge>();
  let frontier = [personId];

  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const rels = await db.bisneysRelationship.findMany({
      where: { deletedAt: null, OR: [{ sourcePersonId: { in: frontier } }, { targetPersonId: { in: frontier } }] },
      include: { type: { select: { name: true } } },
    });
    const next: string[] = [];
    for (const r of rels) {
      edges.set(r.id, { id: r.id, source: r.sourcePersonId, target: r.targetPersonId, label: r.type.name, directed: r.direction === "DIRECTED" });
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
    id: p.id, label: p.fullName,
    kind: p.id === personId ? "focus" : p.candidate ? "candidate" : p._count.contacts > 0 ? "contact" : "person",
    depth: nodeDepth.get(p.id) ?? 1,
  }));
  return { nodes, edges: [...edges.values()] };
}

/* ---------------- referral statistics (brief §31/§47) ---------------- */

const INTERVIEW_STATUSES = ["FIRST_CALL", "SECOND_INTERVIEW", "CLIENT_INTERVIEW", "SENT_TO_CLIENT", "CLIENT_INTERESTED", "OFFERED", "HIRED"];

export type ReferralStats = { total: number; candidates: number; interviews: number; hires: number; successRate: number; dealValue: number; lastAt: Date | null };

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
  return { total: referrals.length, candidates, interviews, hires, successRate: referrals.length ? Math.round((hires / referrals.length) * 100) : 0, dealValue, lastAt: referrals[0]?.createdAt ?? null };
}

/* ---------------- "how we reached this person" (brief §32) ---------------- */

export type ReachStep = { fromId: string; fromName: string; toId: string; toName: string };

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
