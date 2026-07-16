/** Small FormData parsing helpers shared by CRM server actions. */
export function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
export function opt(v: FormDataEntryValue | null): string | null {
  return str(v) || null;
}
export function decStr(v: FormDataEntryValue | null): string | null {
  const x = str(v).replace(/\s/g, "").replace(",", ".");
  return x && !Number.isNaN(Number(x)) ? x : null;
}
export function intOrNull(v: FormDataEntryValue | null): number | null {
  const x = str(v);
  if (!x) return null;
  const n = parseInt(x, 10);
  return Number.isNaN(n) ? null : n;
}
export function dateOrNull(v: FormDataEntryValue | null): Date | null {
  const x = str(v);
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function boolOf(v: FormDataEntryValue | null): boolean {
  return str(v) === "on" || str(v) === "true";
}

/** Normalize an email for dedup/search (lowercase, trimmed). */
export function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e || null;
}

/** Normalize a Croatian phone to +385… digits for dedup/search. */
export function normalizePhone(phone: string | null | undefined): string | null {
  let d = (phone ?? "").replace(/[^\d+]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = "+" + d.slice(2);
  if (d.startsWith("0")) d = "+385" + d.slice(1);
  if (!d.startsWith("+") && d.length >= 8) d = "+385" + d;
  return d || null;
}

/** RFC-4180-ish CSV builder. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (c: string | number | null | undefined) => {
    const s = c === null || c === undefined ? "" : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}
