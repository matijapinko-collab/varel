/**
 * Minimal RFC-4180-ish CSV parser (no dependencies).
 * Handles quoted fields, escaped quotes (""), commas and newlines inside
 * quotes, and both \n and \r\n line endings. Returns rows of string cells.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++; // escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      // Skip completely empty trailing lines
      if (row.length > 1 || row[0].trim() !== "") rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  // Final cell/row (file may not end with a newline)
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
  }
  return rows;
}

/** Parse a CSV with a header row into objects keyed by lowercased header name. */
export function parseCsvObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
}
