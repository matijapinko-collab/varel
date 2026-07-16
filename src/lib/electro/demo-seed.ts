import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "./auth/session";
import { ensureElectroBootstrap } from "./bootstrap";

/**
 * Idempotent demo company for Varel Electric (brief §79). Creates a fully
 * populated tenant that demonstrates the whole workflow: branches, warehouses,
 * investors, projects with buildings/phases, employees across all roles,
 * materials with stock, confirmed consumption, a daily log and an issue.
 * Safe to re-run — keyed on a fixed demo company OIB.
 */

const DEMO_OIB = "00000000001";
const DEMO_PASSWORD = "Demo-Electro-2026!";

export async function ensureElectroDemo(): Promise<{ created: boolean; companyId: string }> {
  await ensureElectroBootstrap();

  const existing = await db.electroCompany.findFirst({ where: { oib: DEMO_OIB } });
  if (existing) return { created: false, companyId: existing.id };

  const [adminRole, engineerRole, managerRole, electricianRole, plan] = await Promise.all([
    db.electroRole.findUnique({ where: { key: "ADMIN" } }),
    db.electroRole.findUnique({ where: { key: "ENGINEER" } }),
    db.electroRole.findUnique({ where: { key: "SITE_MANAGER" } }),
    db.electroRole.findUnique({ where: { key: "ELECTRICIAN" } }),
    db.electroSubscriptionPlan.findUnique({ where: { key: "business" } }),
  ]);
  if (!adminRole || !engineerRole || !managerRole || !electricianRole || !plan) {
    throw new Error("electro demo: roles/plan not bootstrapped");
  }

  const pw = await hashPassword(DEMO_PASSWORD);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  const company = await db.electroCompany.create({
    data: {
      name: "Elektro Demo d.o.o.",
      oib: DEMO_OIB,
      city: "Zagreb",
      address: "Demo ulica 1",
      contactEmail: "demo@electro.local",
      subscription: { create: { planId: plan.id, status: "TRIAL", approvedAt: now, trialStartsAt: now, trialEndsAt } },
      branches: { create: [{ name: "Zagreb", city: "Zagreb" }, { name: "Split", city: "Split" }] },
      departments: { create: [{ name: "Terenska operativa" }, { name: "Inženjering" }] },
    },
    include: { branches: true },
  });

  const mkUser = (firstName: string, lastName: string, email: string, roleId: string) =>
    db.electroUser.create({
      data: {
        companyId: company.id, firstName, lastName, email, status: "ACTIVE", passwordHash: pw,
        roles: { create: { roleId, companyId: company.id } },
      },
    });

  const admin = await mkUser("Ana", "Adminić", "demo.admin@electro.local", adminRole.id);
  const engineer = await mkUser("Ivo", "Inženjerić", "demo.inzenjer@electro.local", engineerRole.id);
  const manager = await mkUser("Vlado", "Voditeljić", "demo.voditelj@electro.local", managerRole.id);
  const el1 = await mkUser("Marko", "Monterić", "demo.monter1@electro.local", electricianRole.id);
  await mkUser("Luka", "Lukić", "demo.monter2@electro.local", electricianRole.id);

  const [inv1, inv2] = await Promise.all([
    db.electroInvestor.create({ data: { companyId: company.id, name: "Park Development d.o.o.", type: "LEGAL_ENTITY", city: "Zagreb" } }),
    db.electroInvestor.create({ data: { companyId: company.id, name: "Grad Zagreb", type: "PUBLIC_BODY", city: "Zagreb" } }),
  ]);

  // Two warehouses + two items with stock.
  const [central, site] = await Promise.all([
    db.electroWarehouse.create({ data: { companyId: company.id, code: "C1", name: "Centralno skladište", type: "CENTRAL" } }),
    db.electroWarehouse.create({ data: { companyId: company.id, code: "G1", name: "Gradilišno skladište", type: "SITE" } }),
  ]);
  const [cable, socket] = await Promise.all([
    db.electroItem.create({ data: { companyId: company.id, sku: "KAB-3x1.5", name: "Kabel NYM 3x1.5", unit: "m", minStock: "100", purchasePrice: "0.85" } }),
    db.electroItem.create({ data: { companyId: company.id, sku: "UTI-16A", name: "Utičnica 16A", unit: "kom", minStock: "20", purchasePrice: "3.20" } }),
  ]);
  await db.electroStockMovement.createMany({
    data: [
      { companyId: company.id, itemId: cable.id, warehouseId: central.id, type: "OPENING_BALANCE", qtyDelta: "500", createdByUserId: admin.id },
      { companyId: company.id, itemId: socket.id, warehouseId: central.id, type: "OPENING_BALANCE", qtyDelta: "150", createdByUserId: admin.id },
      { companyId: company.id, itemId: cable.id, warehouseId: site.id, type: "RECEIPT", qtyDelta: "200", createdByUserId: manager.id },
    ],
  });

  // Main project with two buildings, phases, team, an investor pair.
  const project = await db.electroProject.create({
    data: {
      companyId: company.id, code: "P-0001", name: "Stambeni kompleks Park", status: "ACTIVE", priority: "HIGH",
      branchId: company.branches[0].id, location: "Zagreb, Trešnjevka", contractValue: "450000", plannedBudget: "380000",
      completionPercent: 35,
      investors: { create: [{ investorId: inv1.id }, { investorId: inv2.id }] },
      members: { create: [
        { userId: engineer.id, projectRole: "ENGINEER" },
        { userId: manager.id, projectRole: "SITE_MANAGER" },
        { userId: el1.id, projectRole: "ELECTRICIAN" },
      ] },
      phases: { create: [
        { name: "Grube elektroinstalacije", sortOrder: 0, status: "IN_PROGRESS", progressPercent: 60 },
        { name: "Kabelske trase", sortOrder: 1, status: "IN_PROGRESS", progressPercent: 40 },
        { name: "Razvodni ormari", sortOrder: 2, status: "NOT_STARTED" },
      ] },
      statusHistory: { create: [{ toStatus: "ACTIVE", reason: "Demo projekt", changedByUserId: admin.id }] },
      budget: { create: { materialBudget: "200000", laborBudget: "150000", reserve: "30000" } },
    },
    include: { locations: true },
  });
  const bldgA = await db.electroProjectLocation.create({ data: { projectId: project.id, type: "BUILDING", name: "Zgrada A", sortOrder: 0 } });
  await db.electroProjectLocation.create({ data: { projectId: project.id, parentId: bldgA.id, type: "FLOOR", name: "1. kat", sortOrder: 0 } });
  await db.electroProjectLocation.create({ data: { projectId: project.id, type: "BUILDING", name: "Zgrada B", sortOrder: 1 } });

  // Two more projects.
  await db.electroProject.createMany({
    data: [
      { companyId: company.id, code: "P-0002", name: "Poslovni toranj Centar", status: "PREPARATION", priority: "NORMAL", contractValue: "1200000" },
      { companyId: company.id, code: "P-0003", name: "Hotel Marina", status: "OFFER", priority: "NORMAL", contractValue: "800000" },
    ],
  });

  // A confirmed consumption (reduces stock) + a pending one.
  const movement = await db.electroStockMovement.create({
    data: { companyId: company.id, itemId: cable.id, warehouseId: site.id, type: "CONSUMPTION_CONFIRMED", qtyDelta: "-128.5", projectId: project.id, unitPrice: "0.85", reason: "Potvrđena potrošnja", createdByUserId: manager.id },
  });
  await db.electroMaterialConsumption.create({
    data: { companyId: company.id, projectId: project.id, itemId: cable.id, warehouseId: site.id, quantity: "128.5", confirmedQuantity: "128.5", status: "CONFIRMED", reportedByUserId: el1.id, confirmedByUserId: manager.id, confirmedAt: now, movementId: movement.id },
  });
  await db.electroMaterialConsumption.create({
    data: { companyId: company.id, projectId: project.id, itemId: socket.id, warehouseId: site.id, quantity: "24", status: "PENDING_CONFIRMATION", reportedByUserId: el1.id },
  });

  // A daily log and an open issue.
  await db.electroDailyLog.create({
    data: { companyId: company.id, projectId: project.id, logDate: now, status: "SUBMITTED", workerCount: 6, weather: "Sunčano", activities: "Polaganje kabela u Zgradi A, 1. kat.", authorUserId: manager.id, submittedAt: now },
  });
  await db.electroIssue.create({
    data: { companyId: company.id, projectId: project.id, type: "MATERIAL_SHORTAGE", priority: "HIGH", status: "OPEN", title: "Nedostaje 50m kabela za trasu C", description: "Potrebna dodatna nabava.", reportedByUserId: manager.id },
  });

  return { created: true, companyId: company.id };
}
