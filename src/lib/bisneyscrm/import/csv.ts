/**
 * Dependency-free CSV/TSV parser (Faza 7). Handles quoted fields, escaped
 * quotes (""), embedded newlines and commas, and CRLF. Auto-detects the
 * delimiter (comma / semicolon / tab) from the header line — Croatian Excel
 * exports commonly use ';'. XLSX is not parsed here; users export to CSV.
 */

export type ParsedTable = { headers: string[]; rows: string[][] };

function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/)[0] ?? "";
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] || ",";
}

export function parseDelimited(text: string, delimiter?: string): ParsedTable {
  const clean = text.replace(/^﻿/, ""); // strip BOM
  const delim = delimiter ?? detectDelimiter(clean);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); field = ""; row = [];
    } else if (c === "\r") {
      // handled by \n; ignore lone CR
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const headers = nonEmpty[0].map((h) => h.trim());
  return { headers, rows: nonEmpty.slice(1) };
}

/** Candidate import target fields the wizard can map columns onto. */
export const IMPORT_FIELDS: { key: string; label: string; hints: string[] }[] = [
  { key: "fullName", label: "Ime i prezime", hints: ["ime", "name", "kandidat", "full name", "prezime"] },
  { key: "firstName", label: "Ime", hints: ["first", "ime"] },
  { key: "lastName", label: "Prezime", hints: ["last", "prezime", "surname"] },
  { key: "email", label: "Email", hints: ["email", "e-mail", "mail"] },
  { key: "phone", label: "Telefon", hints: ["phone", "tel", "mobitel", "mobile", "broj"] },
  { key: "city", label: "Grad", hints: ["city", "grad", "mjesto", "town"] },
  { key: "country", label: "Država", hints: ["country", "drzava", "država"] },
  { key: "profession", label: "Zanimanje", hints: ["profession", "zanimanje", "struka", "position", "pozicija", "radno mjesto"] },
  { key: "source", label: "Izvor", hints: ["source", "izvor"] },
  { key: "seniority", label: "Senioritet", hints: ["seniority", "senioritet", "razina"] },
  { key: "expectedSalary", label: "Očekivana plaća", hints: ["salary", "placa", "plaća", "očekivana"] },
  { key: "notes", label: "Bilješke", hints: ["note", "notes", "biljeske", "bilješke", "napomena", "komentar"] },
  { key: "tags", label: "Tagovi", hints: ["tag", "tags", "oznake", "labels", "labele"] },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Best-effort auto-mapping of source headers → import field keys. */
export function guessMapping(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  const used = new Set<string>();
  headers.forEach((h, i) => {
    const hn = norm(h);
    for (const f of IMPORT_FIELDS) {
      if (used.has(f.key)) continue;
      if (f.hints.some((hint) => hn === norm(hint) || hn.includes(norm(hint)))) {
        map[i] = f.key; used.add(f.key); break;
      }
    }
  });
  return map;
}
