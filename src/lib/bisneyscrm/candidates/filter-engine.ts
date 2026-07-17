import {
  PROFILE_STATUS_LABELS, PROFILE_STATUS_VALUES, AVAILABILITY_LABELS, AVAILABILITY_VALUES,
  RELOCATION_LABELS, RELOCATION_VALUES, EDUCATION_LEVEL_LABELS, EDUCATION_LEVEL_VALUES,
  CANDIDATE_SOURCE_LABELS, CANDIDATE_SOURCE_VALUES,
} from "@/lib/bisneyscrm/candidates/labels";

/**
 * Advanced (AND/OR) candidate filter engine (Faza 6).
 *
 * A filter is a single group: a combinator (AND|OR) over a flat list of
 * conditions. Simple fields compile straight to a Prisma `where`; the two
 * relational "special" fields (profession alias search, talent-pool
 * membership) are surfaced separately and AND-merged by the caller, because
 * they require async resolution. Specials always narrow (AND semantics) even
 * when the group combinator is OR — documented and intentional.
 */

export type FilterCombinator = "AND" | "OR";
export type FilterOperator = "eq" | "neq" | "contains" | "gte" | "lte" | "isTrue" | "isFalse" | "hasTag";
export type FilterCondition = { field: string; op: FilterOperator; value?: string };
export type FilterGroup = { combinator: FilterCombinator; conditions: FilterCondition[] };

type FieldType = "enum" | "text" | "number" | "bool" | "tag" | "special";
export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  /** enum options as [value, label] */
  options?: [string, string][];
  /** operators offered in the UI */
  ops: FilterOperator[];
  /** how to build the Prisma leaf; omitted for special fields */
  build?: (op: FilterOperator, value: string) => Record<string, unknown> | null;
};

const enumOptions = (labels: Record<string, string>, values: readonly string[]): [string, string][] =>
  values.map((v) => [v, labels[v]]);

const num = (v: string) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

export const CANDIDATE_FIELDS: FieldDef[] = [
  {
    key: "profileStatus", label: "Status profila", type: "enum", ops: ["eq", "neq"],
    options: enumOptions(PROFILE_STATUS_LABELS, PROFILE_STATUS_VALUES),
    build: (op, v) => (op === "neq" ? { profileStatus: { not: v } } : { profileStatus: v }),
  },
  {
    key: "availabilityStatus", label: "Dostupnost", type: "enum", ops: ["eq", "neq"],
    options: enumOptions(AVAILABILITY_LABELS, AVAILABILITY_VALUES),
    build: (op, v) => (op === "neq" ? { availabilityStatus: { not: v } } : { availabilityStatus: v }),
  },
  {
    key: "relocationPreference", label: "Selidba", type: "enum", ops: ["eq", "neq"],
    options: enumOptions(RELOCATION_LABELS, RELOCATION_VALUES),
    build: (op, v) => (op === "neq" ? { relocationPreference: { not: v } } : { relocationPreference: v }),
  },
  {
    key: "educationLevel", label: "Obrazovanje", type: "enum", ops: ["eq", "neq"],
    options: enumOptions(EDUCATION_LEVEL_LABELS, EDUCATION_LEVEL_VALUES),
    build: (op, v) => (op === "neq" ? { educationLevel: { not: v } } : { educationLevel: v }),
  },
  {
    key: "candidateSource", label: "Izvor", type: "enum", ops: ["eq", "neq"],
    options: enumOptions(CANDIDATE_SOURCE_LABELS, CANDIDATE_SOURCE_VALUES),
    build: (op, v) => (op === "neq" ? { candidateSource: { not: v } } : { candidateSource: v }),
  },
  {
    key: "city", label: "Grad", type: "text", ops: ["contains"],
    build: (_op, v) => (v ? { person: { city: { contains: v, mode: "insensitive" } } } : null),
  },
  {
    key: "tag", label: "Tag", type: "tag", ops: ["hasTag"],
    build: (_op, v) => (v ? { tags: { has: v } } : null),
  },
  {
    key: "totalExperienceMonths", label: "Iskustvo (mj.)", type: "number", ops: ["gte", "lte"],
    build: (op, v) => { const n = num(v); return n === null ? null : { totalExperienceMonths: op === "lte" ? { lte: n } : { gte: n } }; },
  },
  {
    key: "expectedSalaryMax", label: "Očekivana plaća (max)", type: "number", ops: ["gte", "lte"],
    build: (op, v) => { const n = num(v); return n === null ? null : { expectedSalaryMax: op === "lte" ? { lte: n } : { gte: n } }; },
  },
  {
    key: "candidateScore", label: "Ocjena kandidata", type: "number", ops: ["gte", "lte"],
    build: (op, v) => { const n = num(v); return n === null ? null : { candidateScore: op === "lte" ? { lte: n } : { gte: n } }; },
  },
  {
    key: "fieldWorkWilling", label: "Terenski rad", type: "bool", ops: ["isTrue", "isFalse"],
    build: (op) => ({ fieldWorkWilling: op === "isTrue" }),
  },
  {
    key: "multiDayField", label: "Višednevni teren", type: "bool", ops: ["isTrue", "isFalse"],
    build: (op) => ({ multiDayField: op === "isTrue" }),
  },
  {
    key: "shiftWork", label: "Smjenski rad", type: "bool", ops: ["isTrue", "isFalse"],
    build: (op) => ({ shiftWork: op === "isTrue" }),
  },
  {
    key: "ownVehicle", label: "Vlastito vozilo", type: "bool", ops: ["isTrue", "isFalse"],
    build: (op) => ({ ownVehicle: op === "isTrue" }),
  },
  {
    key: "doNotContact", label: "Ne kontaktirati", type: "bool", ops: ["isTrue", "isFalse"],
    build: (op) => ({ doNotContact: op === "isTrue" }),
  },
  { key: "profession", label: "Zanimanje (aliasi)", type: "special", ops: ["contains"] },
  { key: "pool", label: "Talent pool", type: "special", ops: ["eq"] },
];

export const FIELD_BY_KEY = new Map(CANDIDATE_FIELDS.map((f) => [f.key, f]));

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "je", neq: "nije", contains: "sadrži", gte: "≥", lte: "≤", isTrue: "da", isFalse: "ne", hasTag: "ima tag",
};

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
    const def = FIELD_BY_KEY.get(c.field);
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
