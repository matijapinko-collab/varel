/**
 * Crmble field mapping (Company Intelligence Faza 4). Crmble stores contacts as
 * Trello Power-Up data that is NOT reliably reachable through the standard
 * Trello API (brief §7), so the sanctioned path is a CSV/Excel export → import.
 * These target fields + the header auto-guesser are pure and unit-testable.
 */

export const CRMBLE_TARGET_FIELDS: { key: string; label: string; hints: string[] }[] = [
  // fullName first so "Ime i prezime" doesn't get grabbed by firstName's "ime" hint.
  { key: "fullName", label: "Ime i prezime", hints: ["full name", "ime i prezime", "kontakt", "contact"] },
  { key: "firstName", label: "Ime", hints: ["name", "ime", "first"] },
  { key: "lastName", label: "Prezime", hints: ["surname", "prezime", "last"] },
  { key: "email", label: "Email", hints: ["email", "e-mail", "mail"] },
  { key: "phone", label: "Telefon", hints: ["phone", "tel", "mobitel", "mobile", "broj"] },
  { key: "company", label: "Tvrtka", hints: ["company", "tvrtka", "organizacija", "firma"] },
  { key: "jobTitle", label: "Funkcija", hints: ["job title", "title", "funkcija", "pozicija", "radno mjesto"] },
  { key: "source", label: "Izvor", hints: ["source", "izvor"] },
  { key: "dealValue", label: "Vrijednost posla", hints: ["deal value", "value", "vrijednost", "iznos", "deal"] },
  { key: "creationDate", label: "Datum kreiranja", hints: ["creation date", "created", "datum", "date"] },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Best-effort mapping of Crmble CSV headers → target field keys (no field dropped silently). */
export function guessCrmbleMapping(headers: string[]): Record<number, string> {
  const map: Record<number, string> = {};
  const used = new Set<string>();
  headers.forEach((h, i) => {
    const hn = norm(h);
    for (const f of CRMBLE_TARGET_FIELDS) {
      if (used.has(f.key)) continue;
      if (f.hints.some((hint) => hn === norm(hint) || hn.includes(norm(hint)))) {
        map[i] = f.key; used.add(f.key); break;
      }
    }
  });
  return map;
}
