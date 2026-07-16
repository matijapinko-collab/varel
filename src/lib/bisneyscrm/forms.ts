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

/** RFC-4180-ish CSV builder. */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (c: string | number | null | undefined) => {
    const s = c === null || c === undefined ? "" : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}
