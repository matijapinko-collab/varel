import "server-only";
import { formatEur } from "./format";

function fmtDate(d: Date | null | undefined): string {
  return d ? new Date(d).toLocaleDateString("hr-HR") : "";
}

export function quotationEmail(o: {
  tenantName: string;
  customerName: string;
  number: string;
  totalEur: number;
  validUntil: Date | null;
  link: string;
}): { subject: string; text: string } {
  const subject = `Ponuda ${o.number} — ${o.tenantName}`;
  const lines = [
    `Poštovani${o.customerName ? ` ${o.customerName}` : ""},`,
    "",
    `u prilogu vam dostavljamo ponudu ${o.number} u iznosu od ${formatEur(o.totalEur)}.`,
    o.validUntil ? `Ponuda vrijedi do ${fmtDate(o.validUntil)}.` : "",
    "",
    `Ponudu možete pregledati na poveznici:`,
    o.link,
    "",
    `Srdačan pozdrav,`,
    o.tenantName,
  ].filter((l) => l !== "");
  return { subject, text: lines.join("\n") };
}

export function invoiceEmail(o: {
  tenantName: string;
  customerName: string;
  number: string;
  totalEur: number;
  dueDate: Date | null;
  link: string;
  iban?: string | null;
}): { subject: string; text: string } {
  const subject = `Račun ${o.number} — ${o.tenantName}`;
  const lines = [
    `Poštovani${o.customerName ? ` ${o.customerName}` : ""},`,
    "",
    `u prilogu vam dostavljamo račun ${o.number} u iznosu od ${formatEur(o.totalEur)}.`,
    o.dueDate ? `Molimo podmirenje do ${fmtDate(o.dueDate)}.` : "",
    o.iban ? `Uplatu izvršite na IBAN: ${o.iban} (poziv na broj: ${o.number}).` : "",
    "",
    `Račun možete pregledati na poveznici:`,
    o.link,
    "",
    `Srdačan pozdrav,`,
    o.tenantName,
  ].filter((l) => l !== "");
  return { subject, text: lines.join("\n") };
}
