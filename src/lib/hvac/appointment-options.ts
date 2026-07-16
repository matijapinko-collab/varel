import "server-only";
import { db } from "@/lib/db";
import { customerDisplayName } from "./b2b-config";
import type { FormOptions } from "@/components/hvac/b2b/appointment-form";

/** Tenant-scoped option lists for the appointment form. */
export async function loadAppointmentOptions(tenantId: string): Promise<FormOptions> {
  const [customers, locations, units, services, technicians] = await Promise.all([
    db.hvacCustomer.findMany({
      where: { tenantId, archivedAt: null },
      orderBy: [{ companyName: "asc" }, { lastName: "asc" }],
      take: 500,
      select: { id: true, type: true, firstName: true, lastName: true, companyName: true },
    }),
    db.hvacLocation.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, customerId: true, name: true, city: true },
    }),
    db.hvacUnit.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, customerId: true, manufacturer: true, model: true, internalName: true },
    }),
    db.hvacService.findMany({
      where: { tenantId, isActive: true },
      orderBy: { position: "asc" },
      select: { id: true, name: true, durationMin: true },
    }),
    db.hvacTechnician.findMany({
      where: { tenantId, isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    customers: customers.map((c) => ({ id: c.id, name: customerDisplayName(c) })),
    locations: locations.map((l) => ({ id: l.id, customerId: l.customerId, name: [l.name, l.city].filter(Boolean).join(" · ") })),
    units: units.map((u) => ({
      id: u.id,
      customerId: u.customerId,
      label: [u.manufacturer, u.model].filter(Boolean).join(" ") || u.internalName || "Uređaj",
    })),
    services,
    technicians,
  };
}
