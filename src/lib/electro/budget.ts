import type { ElectroCostCategory } from "@/generated/prisma/client";

/**
 * Budget & profitability math (brief §45–§48). Pure and testable. Varel is an
 * operational cost view, not an accounting system — the numbers guide project
 * management, an ERP stays the financial source of truth (brief §46).
 */

export const ELECTRO_COST_CATEGORY_LABELS: Record<ElectroCostCategory, string> = {
  MATERIAL: "Materijal",
  LABOR: "Rad",
  SUBCONTRACTOR: "Podizvođači",
  EQUIPMENT_RENTAL: "Najam opreme",
  TRANSPORT: "Transport",
  ADMINISTRATION: "Administracija",
  EXTRA_WORK: "Dodatni radovi",
  OTHER: "Ostalo",
};

export type BudgetInput = {
  materialBudget?: number | null;
  laborBudget?: number | null;
  subcontractorBudget?: number | null;
  otherBudget?: number | null;
  reserve?: number | null;
};

export function plannedBudgetTotal(b: BudgetInput): number {
  return (
    (b.materialBudget ?? 0) +
    (b.laborBudget ?? 0) +
    (b.subcontractorBudget ?? 0) +
    (b.otherBudget ?? 0) +
    (b.reserve ?? 0)
  );
}

/** Budget utilisation as a fraction 0..∞ (can exceed 1 when over budget). */
export function budgetUtilisation(planned: number, actual: number): number {
  if (planned <= 0) return actual > 0 ? Infinity : 0;
  return actual / planned;
}

/** Estimated margin = contract value − estimated total cost (brief §48). */
export function estimatedMargin(contractValue: number | null | undefined, estimatedCost: number): number {
  return (contractValue ?? 0) - estimatedCost;
}

/** Variance = actual − planned (positive = over) (brief §45). */
export function variance(planned: number, actual: number): number {
  return actual - planned;
}
