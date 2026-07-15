/**
 * Croatian price/number formatting for Varel HVAC.
 * 50 → "50 €", 62.5 → "62,50 €", 1000 → "1.000 €".
 * Integers render with no decimals; non-integers with exactly two.
 */
export function formatEur(value: number, opts?: { decimals?: number }): string {
  const decimals = opts?.decimals ?? (Number.isInteger(value) ? 0 : 2);
  const num = new Intl.NumberFormat("hr-HR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${num} €`;
}
