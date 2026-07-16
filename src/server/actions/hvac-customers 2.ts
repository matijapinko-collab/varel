"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext, logActivity } from "@/lib/hvac/tenant";
import { parseCsvRecords } from "@/lib/hvac/csv";
import { fd, fdNum, ActionError } from "./helpers";
import type { HvacCustomerType, HvacSource, HvacUnitType, HvacUnitStatus } from "@/generated/prisma/client";

/* ---------------- customers ---------------- */

function customerData(form: FormData) {
  const type = (fd(form, "type") || "INDIVIDUAL") as HvacCustomerType;
  return {
    type,
    firstName: fd(form, "firstName") || null,
    lastName: fd(form, "lastName") || null,
    companyName: fd(form, "companyName") || null,
    oib: fd(form, "oib") || null,
    email: fd(form, "email") || null,
    phone: fd(form, "phone") || null,
    altPhone: fd(form, "altPhone") || null,
    preferredContact: fd(form, "preferredContact") || null,
    billingAddress: fd(form, "billingAddress") || null,
    billingCity: fd(form, "billingCity") || null,
    billingPostalCode: fd(form, "billingPostalCode") || null,
    notes: fd(form, "notes") || null,
    source: (fd(form, "source") || "MANUAL") as HvacSource,
  };
}

export async function createCustomer(form: FormData) {
  const ctx = await requireTenantContext();
  const data = customerData(form);
  if (data.type === "COMPANY" ? !data.companyName : !(data.firstName || data.lastName)) {
    throw new ActionError("Unesite ime klijenta ili naziv tvrtke.");
  }
  const customer = await db.hvacCustomer.create({ data: { tenantId: ctx.tenantId, ...data } });
  await logActivity(ctx, "customer_created", "customer", customer.id);
  revalidatePath("/hvac-b2b/klijenti");
  redirect(`/hvac-b2b/klijenti/${customer.id}`);
}

export async function updateCustomer(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  await db.hvacCustomer.updateMany({ where: { id, tenantId: ctx.tenantId }, data: customerData(form) });
  await logActivity(ctx, "customer_updated", "customer", id);
  revalidatePath(`/hvac-b2b/klijenti/${id}`);
  redirect(`/hvac-b2b/klijenti/${id}`);
}

export async function archiveCustomer(id: string) {
  const ctx = await requireTenantContext();
  await db.hvacCustomer.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { archivedAt: new Date(), isActive: false } });
  await logActivity(ctx, "customer_archived", "customer", id);
  revalidatePath("/hvac-b2b/klijenti");
  redirect("/hvac-b2b/klijenti");
}

export async function restoreCustomer(id: string) {
  const ctx = await requireTenantContext();
  await db.hvacCustomer.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { archivedAt: null, isActive: true } });
  revalidatePath(`/hvac-b2b/klijenti/${id}`);
}

/* ---------------- locations ---------------- */

function locationData(form: FormData) {
  return {
    name: fd(form, "name") || "Glavna lokacija",
    address: fd(form, "address") || null,
    city: fd(form, "city") || null,
    postalCode: fd(form, "postalCode") || null,
    floor: fd(form, "floor") || null,
    accessInstructions: fd(form, "accessInstructions") || null,
    parkingInfo: fd(form, "parkingInfo") || null,
    contactPerson: fd(form, "contactPerson") || null,
    contactPhone: fd(form, "contactPhone") || null,
    notes: fd(form, "notes") || null,
  };
}

export async function createLocation(customerId: string, form: FormData) {
  const ctx = await requireTenantContext();
  const customer = await db.hvacCustomer.findFirst({ where: { id: customerId, tenantId: ctx.tenantId } });
  if (!customer) throw new ActionError("Klijent nije pronađen.");
  await db.hvacLocation.create({ data: { tenantId: ctx.tenantId, customerId, ...locationData(form) } });
  await logActivity(ctx, "location_created", "location", customerId);
  revalidatePath(`/hvac-b2b/klijenti/${customerId}`);
}

export async function updateLocation(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const loc = await db.hvacLocation.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!loc) return;
  await db.hvacLocation.update({ where: { id }, data: locationData(form) });
  revalidatePath(`/hvac-b2b/klijenti/${loc.customerId}`);
  revalidatePath(`/hvac-b2b/lokacije/${id}`);
}

/* ---------------- units (devices) ---------------- */

function unitData(form: FormData) {
  const d = (k: string) => { const v = fd(form, k); return v ? new Date(v) : null; };
  return {
    internalName: fd(form, "internalName") || null,
    manufacturer: fd(form, "manufacturer") || null,
    model: fd(form, "model") || null,
    serialNumber: fd(form, "serialNumber") || null,
    unitType: (fd(form, "unitType") || "SPLIT") as HvacUnitType,
    nominalPowerKw: fdNum(form, "nominalPowerKw"),
    installationDate: d("installationDate"),
    manufactureYear: fdNum(form, "manufactureYear"),
    room: fd(form, "room") || null,
    refrigerant: fd(form, "refrigerant") || null,
    warrantyStart: d("warrantyStart"),
    warrantyEnd: d("warrantyEnd"),
    status: (fd(form, "status") || "ACTIVE") as HvacUnitStatus,
    nextServiceDate: d("nextServiceDate"),
    notes: fd(form, "notes") || null,
  };
}

export async function createUnit(customerId: string, form: FormData) {
  const ctx = await requireTenantContext();
  const locationId = fd(form, "locationId");
  const loc = await db.hvacLocation.findFirst({ where: { id: locationId, tenantId: ctx.tenantId, customerId } });
  if (!loc) throw new ActionError("Odaberite lokaciju uređaja.");
  const unit = await db.hvacUnit.create({ data: { tenantId: ctx.tenantId, customerId, locationId, ...unitData(form) } });
  await logActivity(ctx, "unit_created", "unit", unit.id);
  revalidatePath(`/hvac-b2b/klijenti/${customerId}`);
  revalidatePath("/hvac-b2b/uredaji");
  redirect(`/hvac-b2b/uredaji/${unit.id}`);
}

export async function updateUnit(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  await db.hvacUnit.updateMany({ where: { id, tenantId: ctx.tenantId }, data: unitData(form) });
  await logActivity(ctx, "unit_updated", "unit", id);
  revalidatePath(`/hvac-b2b/uredaji/${id}`);
  redirect(`/hvac-b2b/uredaji/${id}`);
}

/* ---------------- CSV import ---------------- */

export type ImportResult = { imported?: number; skipped?: number; errors?: string[]; error?: string };

export async function importCustomersCsv(_prev: ImportResult, form: FormData): Promise<ImportResult> {
  const ctx = await requireTenantContext();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Odaberite CSV datoteku." };
  if (file.size > 2 * 1024 * 1024) return { error: "Datoteka je prevelika (maks. 2 MB)." };

  const text = await file.text();
  const records = parseCsvRecords(text);
  if (records.length === 0) return { error: "CSV nema podataka ili nedostaje zaglavlje." };

  let imported = 0, skipped = 0;
  const errors: string[] = [];
  for (const [i, r] of records.entries()) {
    const isCompany = /tvrt|firm|company|d\.o\.o|obrt/i.test(r["tip"] ?? "");
    const firstName = r["ime"] || null;
    const lastName = r["prezime"] || null;
    const companyName = r["naziv_tvrtke"] || r["tvrtka"] || null;
    if (!firstName && !lastName && !companyName) { skipped++; errors.push(`Red ${i + 2}: nedostaje ime/naziv.`); continue; }
    try {
      await db.hvacCustomer.create({
        data: {
          tenantId: ctx.tenantId,
          type: isCompany || companyName ? "COMPANY" : "INDIVIDUAL",
          firstName, lastName, companyName,
          oib: r["oib"] || null, email: r["email"] || null, phone: r["telefon"] || r["mobitel"] || null,
          billingAddress: r["adresa"] || null, billingCity: r["grad"] || null, billingPostalCode: r["postanski_broj"] || null,
          notes: r["napomena"] || null, source: "EXISTING_CUSTOMER",
        },
      });
      imported++;
    } catch {
      skipped++; errors.push(`Red ${i + 2}: greška pri spremanju.`);
    }
  }
  await logActivity(ctx, "customers_imported", "customer", undefined, { imported, skipped });
  revalidatePath("/hvac-b2b/klijenti");
  return { imported, skipped, errors: errors.slice(0, 10) };
}
