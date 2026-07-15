/** Croatian OIB validation (11 digits, ISO 7064 MOD 11,10 checksum). */
export function isValidOib(input: string): boolean {
  const oib = (input || "").trim();
  if (!/^\d{11}$/.test(oib)) return false;
  let a = 10;
  for (let i = 0; i < 10; i++) {
    a = (Number(oib[i]) + a) % 10;
    if (a === 0) a = 10;
    a = (a * 2) % 11;
  }
  let control = 11 - a;
  if (control === 10) control = 0;
  return control === Number(oib[10]);
}
