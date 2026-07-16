"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireTenantContext, logActivity } from "@/lib/hvac/tenant";
import { fd, ActionError } from "./helpers";
import type { HvacInquiryStatus, HvacSource } from "@/generated/prisma/client";

export async function createInquiry(form: FormData) {
  const ctx = await requireTenantContext();
  const leadName = fd(form, "leadName");
  if (!leadName) throw new ActionError("Unesite ime podnositelja upita.");
  const inquiry = await db.hvacInquiry.create({
    data: {
      tenantId: ctx.tenantId,
      leadName,
      leadPhone: fd(form, "leadPhone") || null,
      leadEmail: fd(form, "leadEmail") || null,
      customerId: fd(form, "customerId") || null,
      serviceId: fd(form, "serviceId") || null,
      preferredTime: fd(form, "preferredTime") || null,
      issueDescription: fd(form, "issueDescription") || null,
      source: (fd(form, "source") || "PHONE") as HvacSource,
      note: fd(form, "note") || null,
    },
  });
  await logActivity(ctx, "inquiry_created", "inquiry", inquiry.id);
  revalidatePath("/hvac-b2b/upiti");
  redirect(`/hvac-b2b/upiti/${inquiry.id}`);
}

export async function setInquiryStatus(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const status = fd(form, "status") as HvacInquiryStatus;
  await db.hvacInquiry.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { status } });
  await logActivity(ctx, "inquiry_status_changed", "inquiry", id, { status });
  revalidatePath("/hvac-b2b/upiti");
  revalidatePath(`/hvac-b2b/upiti/${id}`);
}

/** Links an existing customer to the inquiry. */
export async function linkInquiryCustomer(id: string, form: FormData) {
  const ctx = await requireTenantContext();
  const customerId = fd(form, "customerId");
  const customer = await db.hvacCustomer.findFirst({ where: { id: customerId, tenantId: ctx.tenantId } });
  if (!customer) throw new ActionError("Klijent nije pronađen.");
  await db.hvacInquiry.updateMany({ where: { id, tenantId: ctx.tenantId }, data: { customerId, status: "CONTACTED" } });
  await logActivity(ctx, "inquiry_customer_linked", "inquiry", id, { customerId });
  revalidatePath(`/hvac-b2b/upiti/${id}`);
}

/** Creates a customer from the inquiry's lead details and links it. */
export async function createCustomerFromInquiry(id: string) {
  const ctx = await requireTenantContext();
  const inq = await db.hvacInquiry.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!inq) throw new ActionError("Upit nije pronađen.");
  if (inq.customerId) redirect(`/hvac-b2b/klijenti/${inq.customerId}`);

  const parts = (inq.leadName ?? "").trim().split(/\s+/);
  const customer = await db.hvacCustomer.create({
    data: {
      tenantId: ctx.tenantId,
      type: "INDIVIDUAL",
      firstName: parts[0] || null,
      lastName: parts.slice(1).join(" ") || null,
      phone: inq.leadPhone,
      email: inq.leadEmail,
      source: inq.source,
      notes: inq.issueDescription,
    },
  });
  await db.hvacInquiry.update({ where: { id }, data: { customerId: customer.id, status: "CONTACTED" } });
  await logActivity(ctx, "inquiry_customer_created", "inquiry", id, { customerId: customer.id });
  redirect(`/hvac-b2b/klijenti/${customer.id}`);
}

/** Sends the dispatcher to the new-appointment form prefilled from the inquiry. */
export async function scheduleFromInquiry(id: string) {
  const ctx = await requireTenantContext();
  const inq = await db.hvacInquiry.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!inq) throw new ActionError("Upit nije pronađen.");
  if (!inq.customerId) throw new ActionError("Prvo povežite ili kreirajte klijenta.");
  await db.hvacInquiry.update({ where: { id }, data: { status: "WAITING_APPOINTMENT" } });
  redirect(`/hvac-b2b/kalendar/novi?customerId=${inq.customerId}${inq.serviceId ? `&serviceId=${inq.serviceId}` : ""}`);
}
