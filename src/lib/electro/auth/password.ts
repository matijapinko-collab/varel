/**
 * Varel Electric password policy (brief §62): ≥10 chars, upper, lower, digit,
 * special, and must differ from the current password. Server-side is
 * authoritative; any client-side check is UX only. Returns a Croatian error
 * message, or null when acceptable.
 */
export function validateElectroPassword(
  pw: string,
  opts: { reused?: boolean } = {}
): string | null {
  if (pw.length < 10) return "Lozinka mora imati najmanje 10 znakova.";
  if (!/[A-Z]/.test(pw)) return "Lozinka mora sadržavati barem jedno veliko slovo.";
  if (!/[a-z]/.test(pw)) return "Lozinka mora sadržavati barem jedno malo slovo.";
  if (!/[0-9]/.test(pw)) return "Lozinka mora sadržavati barem jednu znamenku.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Lozinka mora sadržavati barem jedan poseban znak.";
  if (opts.reused) return "Nova lozinka mora se razlikovati od trenutne lozinke.";
  return null;
}
