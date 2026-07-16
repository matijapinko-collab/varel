import "server-only";
import { db } from "@/lib/db";
import { ELECTRO_PROJECT_STATUS_LABELS } from "./projects";
import { ELECTRO_COST_CATEGORY_LABELS, plannedBudgetTotal } from "./budget";
import type { ElectroCostCategory } from "@/generated/prisma/client";

/**
 * Report generation (brief §34–§35). Builds a self-contained HTML document for
 * a project: summary, phase progress, materials, issues, documents. It is saved
 * as an ElectroReport row (its own version) and can be printed to PDF by the
 * browser. Kept dependency-free — no headless-Chrome requirement for the MVP.
 */

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
function eur(n: number): string {
  return new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" }).format(n);
}

export async function buildProjectReportHtml(companyId: string, projectId: string): Promise<{ title: string; html: string } | null> {
  const project = await db.electroProject.findFirst({
    where: { id: projectId, companyId },
    include: {
      company: true,
      investors: { include: { investor: true } },
      phases: { orderBy: { sortOrder: "asc" } },
      budget: true,
      costs: true,
      issues: true,
      documents: { where: { status: "APPROVED" }, include: { currentVersion: true } },
    },
  });
  if (!project) return null;

  const now = new Date();
  const confirmedConsumption = await db.electroMaterialConsumption.findMany({
    where: { companyId, projectId, status: { in: ["CONFIRMED", "PARTIALLY_CONFIRMED"] } },
    include: { item: true },
  });

  const costsByCat = new Map<ElectroCostCategory, number>();
  for (const c of project.costs) costsByCat.set(c.category, (costsByCat.get(c.category) ?? 0) + Number(c.amount));
  const materialCostFromConsumption = confirmedConsumption.reduce(
    (s, c) => s + Number(c.confirmedQuantity ?? c.quantity) * Number(c.item.purchasePrice ?? 0),
    0
  );
  const totalCost = project.costs.reduce((s, c) => s + Number(c.amount), 0) + materialCostFromConsumption;
  const planned = project.budget ? plannedBudgetTotal({
    materialBudget: Number(project.budget.materialBudget ?? 0),
    laborBudget: Number(project.budget.laborBudget ?? 0),
    subcontractorBudget: Number(project.budget.subcontractorBudget ?? 0),
    otherBudget: Number(project.budget.otherBudget ?? 0),
    reserve: Number(project.budget.reserve ?? 0),
  }) : Number(project.plannedBudget ?? 0);

  const openIssues = project.issues.filter((i) => !["CLOSED", "VERIFIED", "REJECTED"].includes(i.status));

  const html = `<!doctype html><html lang="hr"><head><meta charset="utf-8"><title>Izvještaj — ${esc(project.name)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:800px;margin:2rem auto;padding:0 1.5rem;line-height:1.5}
  h1{font-size:1.6rem;margin-bottom:.2rem} h2{font-size:1.1rem;border-bottom:2px solid #10b981;padding-bottom:.2rem;margin-top:2rem}
  .muted{color:#666;font-size:.9rem} table{width:100%;border-collapse:collapse;margin-top:.5rem}
  th,td{text-align:left;padding:.35rem .5rem;border-bottom:1px solid #eee;font-size:.9rem} th{color:#666;font-weight:600}
  .badge{display:inline-block;background:#10b98122;color:#047857;border-radius:99px;padding:.1rem .6rem;font-size:.8rem;font-weight:600}
  .kpi{display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:.5rem} .kpi div{background:#f6f6f6;border-radius:8px;padding:.6rem 1rem}
  .kpi b{display:block;font-size:1.2rem} @media print{body{margin:0}}
</style></head><body>
<h1>${esc(project.company.name)}</h1>
<p class="muted">Izvještaj projekta · izrađen ${now.toLocaleDateString("hr-HR")}</p>
<h2>${esc(project.code)} · ${esc(project.name)} <span class="badge">${ELECTRO_PROJECT_STATUS_LABELS[project.status]}</span></h2>
<p class="muted">${project.investors.map((i) => esc(i.investor.name)).join(", ") || "Bez investitora"}${project.location ? " · " + esc(project.location) : ""}</p>
<div class="kpi">
  <div><span class="muted">Dovršenost</span><b>${project.completionPercent}%</b></div>
  <div><span class="muted">Ugovorena vrijednost</span><b>${eur(Number(project.contractValue ?? 0))}</b></div>
  <div><span class="muted">Planirani budžet</span><b>${eur(planned)}</b></div>
  <div><span class="muted">Stvarni trošak</span><b>${eur(totalCost)}</b></div>
  <div><span class="muted">Odstupanje</span><b>${eur(totalCost - planned)}</b></div>
</div>

<h2>Napredak po fazama</h2>
<table><tr><th>Faza</th><th>Status</th><th>Napredak</th></tr>
${project.phases.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.status}</td><td>${p.progressPercent}%</td></tr>`).join("") || '<tr><td colspan="3" class="muted">Nema faza.</td></tr>'}
</table>

<h2>Potrošnja materijala (potvrđena)</h2>
<table><tr><th>Artikl</th><th>Količina</th><th>Vrijednost</th></tr>
${confirmedConsumption.map((c) => `<tr><td>${esc(c.item.name)}</td><td>${Number(c.confirmedQuantity ?? c.quantity)} ${esc(c.item.unit)}</td><td>${eur(Number(c.confirmedQuantity ?? c.quantity) * Number(c.item.purchasePrice ?? 0))}</td></tr>`).join("") || '<tr><td colspan="3" class="muted">Nema potvrđene potrošnje.</td></tr>'}
</table>

<h2>Troškovi po kategoriji</h2>
<table><tr><th>Kategorija</th><th>Iznos</th></tr>
${[...costsByCat.entries()].map(([k, v]) => `<tr><td>${ELECTRO_COST_CATEGORY_LABELS[k]}</td><td>${eur(v)}</td></tr>`).join("") || '<tr><td colspan="2" class="muted">Nema evidentiranih troškova.</td></tr>'}
</table>

<h2>Otvoreni problemi (${openIssues.length})</h2>
<table><tr><th>Naslov</th><th>Status</th></tr>
${openIssues.map((i) => `<tr><td>${esc(i.title)}</td><td>${i.status}</td></tr>`).join("") || '<tr><td colspan="2" class="muted">Nema otvorenih problema.</td></tr>'}
</table>

<h2>Važeći dokumenti (${project.documents.length})</h2>
<table><tr><th>Dokument</th><th>Verzija</th></tr>
${project.documents.map((d) => `<tr><td>${esc(d.title)}</td><td>v${esc(d.currentVersion?.versionLabel ?? "-")}</td></tr>`).join("") || '<tr><td colspan="2" class="muted">Nema odobrenih dokumenata.</td></tr>'}
</table>

<p class="muted" style="margin-top:2rem">Napomena: financijski podaci su operativna procjena za vođenje projekta, a ne službeni knjigovodstveni dokument.</p>
</body></html>`;

  return { title: `Izvještaj — ${project.name} (${now.toLocaleDateString("hr-HR")})`, html };
}
