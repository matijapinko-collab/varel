/**
 * Pure, dependency-free core of the advanced candidate filter (Faza 6/9).
 * Holds the operator logic and where-builder with NO label imports, so it is
 * unit-testable in isolation. filter-engine.ts decorates these builders with
 * Croatian labels + enum options for the UI.
 */

export type FilterCombinator = "AND" | "OR";
export type FilterOperator = "eq" | "neq" | "contains" | "gte" | "lte" | "isTrue" | "isFalse" | "hasTag";
export type FilterCondition = { field: string; op: FilterOperator; value?: string };
export type FilterGroup = { combinator: FilterCombinator; conditions: FilterCondition[] };
export type FieldType = "enum" | "text" | "number" | "bool" | "tag" | "special";

export type FieldBuilder = {
  key: string;
  type: FieldType;
  /** operators offered in the UI */
  ops: FilterOperator[];
  /** how to build the Prisma leaf; omitted for special (async-resolved) fields */
  build?: (op: FilterOperator, value: string) => Record<string, unknown> | null;
};

const num = (v: string) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const enumLeaf = (field: string) => (op: FilterOperator, v: string) => (op === "neq" ? { [field]: { not: v } } : { [field]: v });

/** The field registry — logic only (labels/options live in filter-engine.ts). */
export const FIELD_BUILDERS: FieldBuilder[] = [
  { key: "profileStatus", type: "enum", ops: ["eq", "neq"], build: enumLeaf("profileStatus") },
  { key: "availabilityStatus", type: "enum", ops: ["eq", "neq"], build: enumLeaf("availabilityStatus") },
  { key: "relocationPreference", type: "enum", ops: ["eq", "neq"], build: enumLeaf("relocationPreference") },
  { key: "educationLevel", type: "enum", ops: ["eq", "neq"], build: enumLeaf("educationLevel") },
  { key: "candidateSource", type: "enum", ops: ["eq", "neq"], build: enumLeaf("candidateSource") },
  { key: "city", type: "text", ops: ["contains"], build: (_op, v) => (v ? { person: { city: { contains: v, mode: "insensitive" } } } : null) },
  { key: "tag", type: "tag", ops: ["hasTag"], build: (_op, v) => (v ? { tags: { has: v } } : null) },
  { key: "totalExperienceMonths", type: "number", ops: ["gte", "lte"], build: (op, v) => { const n = num(v); return n === null ? null : { totalExperienceMonths: op === "lte" ? { lte: n } : { gte: n } }; } },
  { key: "expectedSalaryMax", type: "number", ops: ["gte", "lte"], build: (op, v) => { const n = num(v); return n === null ? null : { expectedSalaryMax: op === "lte" ? { lte: n } : { gte: n } }; } },
  { key: "candidateScore", type: "number", ops: ["gte", "lte"], build: (op, v) => { const n = num(v); return n === null ? null : { candidateScore: op === "lte" ? { lte: n } : { gte: n } }; } },
  { key: "fieldWorkWilling", type: "bool", ops: ["isTrue", "isFalse"], build: (op) => ({ fieldWorkWilling: op === "isTrue" }) },
  { key: "multiDayField", type: "bool", ops: ["isTrue", "isFalse"], build: (op) => ({ multiDayField: op === "isTrue" }) },
  { key: "shiftWork", type: "bool", ops: ["isTrue", "isFalse"], build: (op) => ({ shiftWork: op === "isTrue" }) },
  { key: "ownVehicle", type: "bool", ops: ["isTrue", "isFalse"], build: (op) => ({ ownVehicle: op === "isTrue" }) },
  { key: "doNotContact", type: "bool", ops: ["isTrue", "isFalse"], build: (op) => ({ doNotContact: op === "isTrue" }) },
  { key: "profession", type: "special", ops: ["contains"] },
  { key: "pool", type: "special", ops: ["eq"] },
];

export const BUILDER_BY_KEY = new Map(FIELD_BUILDERS.map((f) => [f.key, f]));

export type BuiltFilter = {
  where: Record<string, unknown>;
  professionQuery: string | null;
  poolId: string | null;
};

/** Compiles a filter group into a Prisma `where` plus the async "special" needs. */
export function buildAdvancedWhere(group: FilterGroup | null): BuiltFilter {
  const empty: BuiltFilter = { where: {}, professionQuery: null, poolId: null };
  if (!group || !Array.isArray(group.conditions) || group.conditions.length === 0) return empty;

  const leaves: Record<string, unknown>[] = [];
  let professionQuery: string | null = null;
  let poolId: string | null = null;

  for (const c of group.conditions) {
    const def = BUILDER_BY_KEY.get(c.field);
    if (!def) continue;
    if (def.type === "special") {
      if (def.key === "profession" && c.value) professionQuery = c.value;
      if (def.key === "pool" && c.value) poolId = c.value;
      continue;
    }
    const leaf = def.build?.(c.op, c.value ?? "");
    if (leaf) leaves.push(leaf);
  }

  const where: Record<string, unknown> = {};
  if (leaves.length === 1) Object.assign(where, leaves[0]);
  else if (leaves.length > 1) where[group.combinator] = leaves;

  return { where, professionQuery, poolId };
}

/** Parses the URL-encoded JSON filter param; returns null if absent/invalid. */
export function parseFilterParam(raw: string | undefined): FilterGroup | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(raw));
    if (obj && (obj.combinator === "AND" || obj.combinator === "OR") && Array.isArray(obj.conditions)) {
      return { combinator: obj.combinator, conditions: obj.conditions.filter((c: unknown) => c && typeof (c as FilterCondition).field === "string") };
    }
  } catch { /* ignore malformed */ }
  return null;
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "je", neq: "nije", contains: "sadrži", gte: "≥", lte: "≤", isTrue: "da", isFalse: "ne", hasTag: "ima tag",
};
