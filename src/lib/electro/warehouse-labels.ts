import type {
  ElectroWarehouseType,
  ElectroStockMovementType,
  ElectroConsumptionStatus,
} from "@/generated/prisma/client";

/** Db-free labels for the materials module (brief §37–§41). */

export const ELECTRO_WAREHOUSE_TYPE_LABELS: Record<ElectroWarehouseType, string> = {
  CENTRAL: "Centralno",
  REGIONAL: "Područno",
  MOBILE: "Mobilno",
  SITE: "Gradilišno",
  TEMPORARY: "Privremeno",
  RETURNS: "Skladište povrata",
  DEFECTIVE: "Neispravna roba",
};

export const ELECTRO_MOVEMENT_TYPE_LABELS: Record<ElectroStockMovementType, string> = {
  OPENING_BALANCE: "Početno stanje",
  RECEIPT: "Primka",
  TRANSFER_OUT: "Otprema (transfer)",
  TRANSFER_IN: "Zaprimanje (transfer)",
  ISSUE_TO_PROJECT: "Izdano na projekt",
  CONSUMPTION_CONFIRMED: "Potvrđena potrošnja",
  RETURN_FROM_PROJECT: "Povrat s projekta",
  ADJUSTMENT_IN: "Korekcija +",
  ADJUSTMENT_OUT: "Korekcija −",
  DAMAGE: "Oštećenje",
  LOSS: "Gubitak",
  WRITE_OFF: "Otpis",
  ERP_IMPORT: "ERP uvoz",
};

export const ELECTRO_CONSUMPTION_STATUS_LABELS: Record<ElectroConsumptionStatus, string> = {
  DRAFT: "Nacrt",
  PENDING_CONFIRMATION: "Čeka potvrdu",
  PARTIALLY_CONFIRMED: "Djelomično potvrđeno",
  CONFIRMED: "Potvrđeno",
  REJECTED: "Odbijeno",
  CANCELLED: "Otkazano",
};
