import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "./auth/session";
import { ensureElectroBootstrap } from "./bootstrap";

/**
 * Idempotent demo company "Elektronim Instalacije" (brief §25–§34). Realistic
 * Croatian electrical-contractor data. mpinko is seeded as a company ADMIN here
 * (in addition to being the global superadmin), with a temporary password that
 * must be changed on first company login. Keyed on the demo OIB — safe to
 * re-run. Demo passwords/emails are clearly non-production.
 */

const DEMO_OIB = "12345678901";
/** Temp password for demo users incl. mpinko's company account (must change). */
const DEMO_TEMP_PW = "Zaporka1#";

export async function ensureElectroDemo(): Promise<{ created: boolean; companyId: string; counts?: Record<string, number> }> {
  await ensureElectroBootstrap();

  const existing = await db.electroCompany.findFirst({ where: { oib: DEMO_OIB } });
  if (existing) return { created: false, companyId: existing.id };

  const [adminRole, engRole, mgrRole, elRole, plan] = await Promise.all([
    db.electroRole.findUnique({ where: { key: "ADMIN" } }),
    db.electroRole.findUnique({ where: { key: "ENGINEER" } }),
    db.electroRole.findUnique({ where: { key: "SITE_MANAGER" } }),
    db.electroRole.findUnique({ where: { key: "ELECTRICIAN" } }),
    db.electroSubscriptionPlan.findUnique({ where: { key: "business" } }),
  ]);
  if (!adminRole || !engRole || !mgrRole || !elRole || !plan) throw new Error("electro demo: roles/plan missing");

  const pw = await hashPassword(DEMO_TEMP_PW);
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  const company = await db.electroCompany.create({
    data: {
      name: "Elektronim Instalacije",
      oib: DEMO_OIB,
      address: "Radnička cesta 52",
      city: "Zagreb",
      country: "Hrvatska",
      contactName: "Matija Pinko",
      contactEmail: "info@elektronim.demo",
      contactPhone: "+385 1 2345 678",
      subscription: { create: { planId: plan.id, status: "ACTIVE", approvedAt: now, trialStartsAt: now, trialEndsAt: new Date(now.getTime() + 10 * day) } },
      branches: { create: [{ name: "Zagreb", city: "Zagreb" }, { name: "Split", city: "Split" }] },
      departments: { create: [{ name: "Terenska operativa" }, { name: "Inženjering" }, { name: "Uprava" }] },
    },
    include: { branches: true },
  });

  const mkUser = (firstName: string, lastName: string, email: string, roleId: string, mustChange = true) =>
    db.electroUser.create({
      data: {
        companyId: company.id, firstName, lastName, email, status: "ACTIVE", passwordHash: pw,
        mustChangePassword: mustChange, roles: { create: { roleId, companyId: company.id } },
      },
    });

  // mpinko as company ADMIN (real email; forced change on first company login).
  const mpinko = await mkUser("Matija", "Pinko", "matija.pinko@gmail.com", adminRole.id, true);
  const admins = [mpinko, await mkUser("Ivana", "Kovačević", "ivana.kovacevic@elektronim.demo", adminRole.id), await mkUser("Tomislav", "Barić", "tomislav.baric@elektronim.demo", adminRole.id)];
  const engineers = await Promise.all([
    mkUser("Petar", "Horvat", "petar.horvat@elektronim.demo", engRole.id),
    mkUser("Ana", "Novak", "ana.novak@elektronim.demo", engRole.id),
    mkUser("Marko", "Jurić", "marko.juric@elektronim.demo", engRole.id),
  ]);
  const managers = await Promise.all([
    mkUser("Josip", "Vuković", "josip.vukovic@elektronim.demo", mgrRole.id),
    mkUser("Luka", "Marić", "luka.maric@elektronim.demo", mgrRole.id),
    mkUser("Ivan", "Babić", "ivan.babic@elektronim.demo", mgrRole.id),
    mkUser("Damir", "Knežević", "damir.knezevic@elektronim.demo", mgrRole.id),
  ]);
  const electricians = await Promise.all(
    ["Stjepan Šarić", "Mario Pavlović", "Nikola Grgić", "Filip Blažević", "Antonio Radić", "Kristijan Vidović",
     "Dario Lovrić", "Robert Kolar", "Denis Tomić", "Vedran Bošnjak", "Zoran Matić", "Igor Perić"]
      .map((full, i) => {
        const [firstName, lastName] = full.split(" ");
        return mkUser(firstName, lastName, `monter${i + 1}@elektronim.demo`, elRole.id);
      })
  );

  const [inv1, inv2, inv3] = await Promise.all([
    db.electroInvestor.create({ data: { companyId: company.id, name: "Park Development d.o.o.", type: "LEGAL_ENTITY", oib: "98765432101", city: "Zagreb", email: "ured@parkdev.demo" } }),
    db.electroInvestor.create({ data: { companyId: company.id, name: "Grad Zagreb", type: "PUBLIC_BODY", city: "Zagreb" } }),
    db.electroInvestor.create({ data: { companyId: company.id, name: "Adriatic Hotels Fund", type: "FUND", city: "Split" } }),
  ]);

  // 6 projects with varied statuses (brief §27).
  const projDefs: Array<{ code: string; name: string; status: "ACTIVE" | "ON_HOLD" | "WAITING_FOR_INVESTOR" | "PREPARATION"; inv: string; val: string; pct: number; deadlineDays: number }> = [
    { code: "P-0001", name: "Stambeni kompleks Park Residence", status: "ACTIVE", inv: inv1.id, val: "1250000", pct: 45, deadlineDays: 90 },
    { code: "P-0002", name: "Poslovni centar Green Tower", status: "ACTIVE", inv: inv1.id, val: "2400000", pct: 30, deadlineDays: 160 },
    { code: "P-0003", name: "Hotel Adriatic Premium", status: "ACTIVE", inv: inv3.id, val: "1800000", pct: 60, deadlineDays: 40 },
    { code: "P-0004", name: "Industrijska hala MetalPro", status: "ON_HOLD", inv: inv1.id, val: "900000", pct: 25, deadlineDays: -10 },
    { code: "P-0005", name: "Rekonstrukcija škole Centar", status: "WAITING_FOR_INVESTOR", inv: inv2.id, val: "620000", pct: 15, deadlineDays: 70 },
    { code: "P-0006", name: "Logistički centar West Hub", status: "PREPARATION", inv: inv1.id, val: "1500000", pct: 5, deadlineDays: 200 },
  ];
  const projects = [];
  for (const [i, d] of projDefs.entries()) {
    const eng = engineers[i % engineers.length];
    const mgr = managers[i % managers.length];
    const p = await db.electroProject.create({
      data: {
        companyId: company.id, code: d.code, name: d.name, status: d.status, priority: i < 2 ? "HIGH" : "NORMAL",
        branchId: company.branches[i % 2].id, location: i % 2 === 0 ? "Zagreb" : "Split",
        contractValue: d.val, plannedBudget: (Number(d.val) * 0.82).toFixed(0), completionPercent: d.pct,
        contractDeadline: new Date(now.getTime() + d.deadlineDays * day),
        investors: { create: [{ investorId: d.inv }] },
        members: { create: [
          { userId: eng.id, projectRole: "ENGINEER" },
          { userId: mgr.id, projectRole: "SITE_MANAGER" },
          { userId: electricians[i % electricians.length].id, projectRole: "ELECTRICIAN" },
          { userId: electricians[(i + 1) % electricians.length].id, projectRole: "ELECTRICIAN" },
        ] },
        phases: { create: [
          { name: "Grube elektroinstalacije", sortOrder: 0, status: "IN_PROGRESS", progressPercent: 70 },
          { name: "Kabelske trase", sortOrder: 1, status: "IN_PROGRESS", progressPercent: 50 },
          { name: "Razvodni ormari", sortOrder: 2, status: "NOT_STARTED" },
          { name: "Rasvjeta i utičnice", sortOrder: 3, status: "NOT_STARTED" },
        ] },
        statusHistory: { create: [{ toStatus: d.status, reason: "Demo projekt", changedByUserId: mpinko.id }] },
        budget: { create: { materialBudget: (Number(d.val) * 0.45).toFixed(0), laborBudget: (Number(d.val) * 0.3).toFixed(0), reserve: (Number(d.val) * 0.05).toFixed(0) } },
      },
    });
    // Site structure for the first project.
    if (i === 0) {
      const bA = await db.electroProjectLocation.create({ data: { projectId: p.id, type: "BUILDING", name: "Zgrada A", sortOrder: 0 } });
      await db.electroProjectLocation.createMany({ data: [
        { projectId: p.id, parentId: bA.id, type: "FLOOR", name: "Garaža", sortOrder: 0 },
        { projectId: p.id, parentId: bA.id, type: "FLOOR", name: "Prizemlje", sortOrder: 1 },
        { projectId: p.id, parentId: bA.id, type: "FLOOR", name: "1. kat", sortOrder: 2 },
      ] });
      await db.electroProjectLocation.create({ data: { projectId: p.id, type: "BUILDING", name: "Zgrada B", sortOrder: 1 } });
      await db.electroProjectLocation.create({ data: { projectId: p.id, type: "ZONE", name: "Vanjska infrastruktura", sortOrder: 2 } });
    }
    projects.push(p);
  }

  // Tasks (varied statuses).
  const taskDefs: Array<[string, "OPEN" | "IN_PROGRESS" | "WAITING_FOR_MATERIAL" | "WAITING_FOR_REVIEW" | "BLOCKED" | "COMPLETED", number]> = [
    ["Montaža kabelskih polica u garaži", "IN_PROGRESS", 0], ["Polaganje NYM-J kabela na 1. katu", "IN_PROGRESS", -2],
    ["Spajanje razvodnog ormara RO-A1", "WAITING_FOR_REVIEW", -1], ["Montaža LED panela u hodnicima", "OPEN", 5],
    ["Ispitivanje uzemljenja", "WAITING_FOR_MATERIAL", -3], ["Korekcija trase prema reviziji", "BLOCKED", -1],
    ["Ugradnja protupožarnih senzora", "OPEN", 7], ["Pregled izvedenih utičnica", "COMPLETED", -5],
    ["Montaža sabirnica u ormaru RO-B", "IN_PROGRESS", 2], ["Polaganje slabe struje", "OPEN", 10],
    ["Ožičenje rasvjete recepcije", "WAITING_FOR_REVIEW", 0], ["Mjerenje otpora izolacije", "OPEN", 4],
  ];
  for (const [t, [title, status, dueDays]] of taskDefs.entries()) {
    const p = projects[t % projects.length];
    await db.electroTask.create({
      data: { companyId: company.id, projectId: p.id, title, status, priority: t % 4 === 0 ? "HIGH" : "NORMAL",
        assigneeUserId: electricians[t % electricians.length].id, createdByUserId: managers[t % managers.length].id,
        dueDate: new Date(now.getTime() + dueDays * day), completedAt: status === "COMPLETED" ? now : null },
    });
  }

  // Warehouses + items + stock.
  const [central, siteWh, mobile] = await Promise.all([
    db.electroWarehouse.create({ data: { companyId: company.id, code: "C-ZG", name: "Centralno skladište Zagreb", type: "CENTRAL", address: "Radnička cesta 52" } }),
    db.electroWarehouse.create({ data: { companyId: company.id, code: "G-PR", name: "Gradilišno skladište Park Residence", type: "SITE" } }),
    db.electroWarehouse.create({ data: { companyId: company.id, code: "M-01", name: "Mobilno skladište Vozilo 01", type: "MOBILE" } }),
  ]);
  const itemDefs: Array<[string, string, string, string, string, string]> = [
    // sku, name, unit, category, purchasePrice, minStock
    ["NYM-3x1.5", "Kabel NYM-J 3x1.5", "m", "Kabeli", "0.75", "200"],
    ["NYM-3x2.5", "Kabel NYM-J 3x2.5", "m", "Kabeli", "1.10", "200"],
    ["NYM-5x6", "Kabel NYM-J 5x6", "m", "Kabeli", "3.40", "100"],
    ["H07V-16", "H07V-K 16 mm²", "m", "Kabeli", "2.10", "150"],
    ["POL-200", "Kabelska polica 200 mm", "m", "Police", "6.80", "80"],
    ["POL-100", "Kabelska polica 100 mm", "m", "Police", "4.20", "80"],
    ["UTI-16", "Modularna utičnica 16A", "kom", "Utičnice", "3.20", "50"],
    ["PRE-1P", "Prekidač jednopolni", "kom", "Prekidači", "2.80", "50"],
    ["OSG-C16", "Automatski osigurač C16", "kom", "Osigurači", "4.50", "40"],
    ["FID-40", "FID sklopka 40A/0.03", "kom", "Osigurači", "28.00", "15"],
    ["LED-6060", "LED panel 60x60 40W", "kom", "Rasvjeta", "18.50", "30"],
    ["LED-IND", "LED industrijska svjetiljka 150W", "kom", "Rasvjeta", "45.00", "10"],
    ["RO-72M", "Razvodni ormar 72M", "kom", "Ormari", "120.00", "3"],
    ["RO-36M", "Razvodni ormar 36M", "kom", "Ormari", "72.00", "5"],
    ["SEN-PIR", "PIR senzor pokreta", "kom", "Senzori", "12.00", "20"],
    ["UZ-25", "Uzemljivač traka 25mm", "m", "Uzemljenje", "1.80", "100"],
    ["CIJ-25", "Instalacijska cijev 25mm", "m", "Cijevi", "0.60", "150"],
    ["SPO-WAGO", "Spojna stezaljka WAGO 3x", "kom", "Spojni materijal", "0.35", "300"],
    ["OZN-KAB", "Oznake za kabele (set)", "set", "Označavanje", "8.00", "10"],
    ["ORM-KLE", "Klema redna 4mm² (100kom)", "paket", "Spojni materijal", "9.50", "20"],
  ];
  const items = [];
  for (const [sku, name, unit, category, price, minStock] of itemDefs) {
    const it = await db.electroItem.create({ data: { companyId: company.id, sku, name, unit, category, purchasePrice: price, minStock, targetStock: (Number(minStock) * 3).toString() } });
    // Opening balance — some below minimum to trigger low-stock alerts.
    const openQty = sku === "FID-40" || sku === "RO-72M" ? Number(minStock) - 1 : Number(minStock) * 4;
    await db.electroStockMovement.create({ data: { companyId: company.id, itemId: it.id, warehouseId: central.id, type: "OPENING_BALANCE", qtyDelta: openQty.toString(), unitPrice: price, createdByUserId: admins[0].id } });
    await db.electroStockMovement.create({ data: { companyId: company.id, itemId: it.id, warehouseId: siteWh.id, type: "RECEIPT", qtyDelta: (Number(minStock)).toString(), unitPrice: price, createdByUserId: managers[0].id } });
    items.push(it);
  }

  // Consumption: some confirmed (posts a ledger movement), some pending.
  for (let c = 0; c < 20; c++) {
    const it = items[c % items.length];
    const p = projects[c % 3];
    const qty = (5 + c * 2).toString();
    const mv = await db.electroStockMovement.create({ data: { companyId: company.id, itemId: it.id, warehouseId: siteWh.id, type: "CONSUMPTION_CONFIRMED", qtyDelta: (-(5 + c)).toString(), unitPrice: it.purchasePrice, projectId: p.id, reason: "Potvrđena potrošnja", createdByUserId: managers[0].id } });
    await db.electroMaterialConsumption.create({ data: { companyId: company.id, projectId: p.id, itemId: it.id, warehouseId: siteWh.id, quantity: (5 + c).toString(), confirmedQuantity: (5 + c).toString(), status: "CONFIRMED", reportedByUserId: electricians[c % electricians.length].id, confirmedByUserId: managers[0].id, confirmedAt: now, movementId: mv.id } });
  }
  for (let c = 0; c < 10; c++) {
    const it = items[(c + 3) % items.length];
    const p = projects[c % 3];
    await db.electroMaterialConsumption.create({ data: { companyId: company.id, projectId: p.id, itemId: it.id, warehouseId: siteWh.id, quantity: (3 + c).toString(), status: "PENDING_CONFIRMATION", reportedByUserId: electricians[c % electricians.length].id, comment: "Potrošnja s terena" } });
  }

  // Issues (varied types/priorities).
  const issueDefs: Array<[string, "TECHNICAL" | "SAFETY" | "MATERIAL_SHORTAGE" | "DRAWING_ERROR" | "DELAY", "LOW" | "NORMAL" | "HIGH" | "CRITICAL", "OPEN" | "IN_PROGRESS" | "RESOLVED"]> = [
    ["Nedostaje kabel NYM-J 5x6", "MATERIAL_SHORTAGE", "HIGH", "OPEN"],
    ["Trasa se ne poklapa s revizijom", "DRAWING_ERROR", "NORMAL", "IN_PROGRESS"],
    ["Kašnjenje isporuke ormara RO-72M", "DELAY", "HIGH", "OPEN"],
    ["Neoznačeni kabeli u tehničkoj prostoriji", "TECHNICAL", "NORMAL", "IN_PROGRESS"],
    ["Neispravna LED rasvjeta u hodniku", "TECHNICAL", "NORMAL", "RESOLVED"],
    ["Blokiran pristup instalacijskoj zoni", "SAFETY", "CRITICAL", "OPEN"],
    ["Nezaštićeni vodovi na gradilištu", "SAFETY", "CRITICAL", "IN_PROGRESS"],
    ["Potrebna potvrda investitora za izmjenu", "TECHNICAL", "NORMAL", "OPEN"],
  ];
  for (const [t, [title, type, priority, status]] of issueDefs.entries()) {
    const p = projects[t % projects.length];
    await db.electroIssue.create({ data: { companyId: company.id, projectId: p.id, type, priority, status, title, description: "Demo problem s gradilišta.", reportedByUserId: managers[t % managers.length].id, actualSolution: status === "RESOLVED" ? "Zamijenjeno i provjereno." : null, resolvedAt: status === "RESOLVED" ? now : null } });
  }

  // Documents with one versioned example.
  const docDefs: Array<[string, "TECHNICAL_DRAWING" | "SCHEME" | "CONTRACT" | "MEASUREMENT" | "SITE_REPORT", "APPROVED" | "UNDER_REVIEW" | "CHANGES_REQUIRED"]> = [
    ["Glavni elektro projekt", "TECHNICAL_DRAWING", "APPROVED"],
    ["Jednopolna shema RO-A1", "SCHEME", "APPROVED"],
    ["Tlocrt rasvjete prizemlje", "TECHNICAL_DRAWING", "UNDER_REVIEW"],
    ["Tlocrt utičnica 1. kat", "TECHNICAL_DRAWING", "UNDER_REVIEW"],
    ["Troškovnik elektroinstalacija", "CONTRACT", "APPROVED"],
    ["Mjerni protokol uzemljenja", "MEASUREMENT", "CHANGES_REQUIRED"],
    ["Tjedni izvještaj gradilišta", "SITE_REPORT", "APPROVED"],
  ];
  for (const [t, [title, category, status]] of docDefs.entries()) {
    const p = projects[t % 3];
    const doc = await db.electroDocument.create({ data: { companyId: company.id, projectId: p.id, category, title, status, visibility: "PROJECT_TEAM", requiresApproval: category !== "CONTRACT" && category !== "SITE_REPORT", createdByUserId: engineers[0].id } });
    const v1 = await db.electroDocumentVersion.create({ data: { documentId: doc.id, versionLabel: "1.0", fileName: `${title}.pdf`, storageKey: `demo/${doc.id}-1`, url: "#", mimeType: "application/pdf", sizeBytes: 102400, changeNote: "Prva verzija", status: status === "APPROVED" ? "APPROVED" : "UNDER_REVIEW", uploadedByUserId: engineers[0].id, approvedByUserId: status === "APPROVED" ? engineers[0].id : null, approvedAt: status === "APPROVED" ? now : null } });
    await db.electroDocument.update({ where: { id: doc.id }, data: { currentVersionId: v1.id } });
    // Versioning example on the first document (1.0 → 1.1 → 2.0).
    if (t === 0) {
      await db.electroDocumentVersion.create({ data: { documentId: doc.id, versionLabel: "1.1", fileName: `${title}-rev.pdf`, storageKey: `demo/${doc.id}-2`, url: "#", mimeType: "application/pdf", sizeBytes: 110000, changeNote: "Ispravak trase", status: "SUPERSEDED", uploadedByUserId: engineers[0].id } });
      const v2 = await db.electroDocumentVersion.create({ data: { documentId: doc.id, versionLabel: "2.0", fileName: `${title}-v2.pdf`, storageKey: `demo/${doc.id}-3`, url: "#", mimeType: "application/pdf", sizeBytes: 120000, changeNote: "Nova revizija nakon koordinacije", status: "APPROVED", uploadedByUserId: engineers[0].id, approvedByUserId: engineers[0].id, approvedAt: now } });
      await db.electroDocument.update({ where: { id: doc.id }, data: { currentVersionId: v2.id } });
    }
  }

  // Daily logs.
  for (let d = 0; d < 12; d++) {
    const p = projects[d % 3];
    await db.electroDailyLog.create({ data: { companyId: company.id, projectId: p.id, logDate: new Date(now.getTime() - d * day), status: d < 2 ? "SUBMITTED" : d < 8 ? "APPROVED" : "LOCKED", workerCount: 4 + (d % 5), weather: ["Sunčano", "Oblačno", "Kiša"][d % 3], activities: "Polaganje kabela i montaža ormara.", authorUserId: managers[d % managers.length].id, submittedAt: now, approvedAt: d >= 2 ? now : null, lockedAt: d >= 8 ? now : null } });
  }

  const counts = {
    users: admins.length + engineers.length + managers.length + electricians.length,
    projects: projects.length, warehouses: 3, items: items.length,
    tasks: taskDefs.length, issues: issueDefs.length, documents: docDefs.length, dailyLogs: 12,
    consumptionsConfirmed: 20, consumptionsPending: 10,
  };
  console.info(`[electro] Elektronim Instalacije demo seeded: ${JSON.stringify(counts)}`);
  return { created: true, companyId: company.id, counts };
}
