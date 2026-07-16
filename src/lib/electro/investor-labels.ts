import type { ElectroInvestorType } from "@/generated/prisma/client";

/** Db-free labels (brief §15) so they're usable on the client and in tests. */
export const ELECTRO_INVESTOR_TYPE_LABELS: Record<ElectroInvestorType, string> = {
  LEGAL_ENTITY: "Pravna osoba",
  NATURAL_PERSON: "Fizička osoba",
  PUBLIC_BODY: "Javno tijelo",
  FUND: "Fond",
  GROUP: "Grupa povezanih osoba",
};

export const ELECTRO_LOCATION_TYPE_LABELS: Record<string, string> = {
  SUBPROJECT: "Podprojekt",
  BUILDING: "Zgrada / objekt",
  ENTRANCE: "Ulaz",
  ZONE: "Zona",
  FLOOR: "Etaža / kat",
  ROOM: "Prostorija",
  TECHNICAL_UNIT: "Tehnička cjelina",
};

export const ELECTRO_PHASE_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Nije započeta",
  IN_PROGRESS: "U tijeku",
  BLOCKED: "Blokirana",
  WAITING_FOR_REVIEW: "Čeka pregled",
  CHANGES_REQUIRED: "Potrebne izmjene",
  APPROVED: "Odobrena",
  COMPLETED: "Završena",
};
