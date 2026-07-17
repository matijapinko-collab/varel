import {
  PROFILE_STATUS_LABELS, PROFILE_STATUS_VALUES, AVAILABILITY_LABELS, AVAILABILITY_VALUES,
  RELOCATION_LABELS, RELOCATION_VALUES, EDUCATION_LEVEL_LABELS, EDUCATION_LEVEL_VALUES,
  CANDIDATE_SOURCE_LABELS, CANDIDATE_SOURCE_VALUES,
} from "@/lib/bisneyscrm/candidates/labels";
import { FIELD_BUILDERS, type FieldBuilder } from "@/lib/bisneyscrm/candidates/filter-core";

/**
 * UI layer of the advanced candidate filter (Faza 6). Decorates the pure field
 * builders (filter-core.ts) with Croatian labels + enum options. The scoring/
 * where-building logic and types are re-exported from filter-core.
 */

export {
  buildAdvancedWhere, parseFilterParam, OPERATOR_LABELS, BUILDER_BY_KEY,
} from "@/lib/bisneyscrm/candidates/filter-core";
export type {
  FilterCombinator, FilterOperator, FilterCondition, FilterGroup, BuiltFilter, FieldBuilder,
} from "@/lib/bisneyscrm/candidates/filter-core";

const enumOptions = (labels: Record<string, string>, values: readonly string[]): [string, string][] =>
  values.map((v) => [v, labels[v]]);

const LABELS: Record<string, string> = {
  profileStatus: "Status profila", availabilityStatus: "Dostupnost", relocationPreference: "Selidba",
  educationLevel: "Obrazovanje", candidateSource: "Izvor", city: "Grad", tag: "Tag",
  totalExperienceMonths: "Iskustvo (mj.)", expectedSalaryMax: "Očekivana plaća (max)", candidateScore: "Ocjena kandidata",
  fieldWorkWilling: "Terenski rad", multiDayField: "Višednevni teren", shiftWork: "Smjenski rad",
  ownVehicle: "Vlastito vozilo", doNotContact: "Ne kontaktirati", profession: "Zanimanje (aliasi)", pool: "Talent pool",
};

const OPTIONS: Record<string, [string, string][]> = {
  profileStatus: enumOptions(PROFILE_STATUS_LABELS, PROFILE_STATUS_VALUES),
  availabilityStatus: enumOptions(AVAILABILITY_LABELS, AVAILABILITY_VALUES),
  relocationPreference: enumOptions(RELOCATION_LABELS, RELOCATION_VALUES),
  educationLevel: enumOptions(EDUCATION_LEVEL_LABELS, EDUCATION_LEVEL_VALUES),
  candidateSource: enumOptions(CANDIDATE_SOURCE_LABELS, CANDIDATE_SOURCE_VALUES),
};

export type FieldDef = FieldBuilder & { label: string; options?: [string, string][] };

export const CANDIDATE_FIELDS: FieldDef[] = FIELD_BUILDERS.map((b) => ({
  ...b, label: LABELS[b.key] ?? b.key, options: OPTIONS[b.key],
}));

export const FIELD_BY_KEY = new Map(CANDIDATE_FIELDS.map((f) => [f.key, f]));
