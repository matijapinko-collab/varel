import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { loadAccessibleProject } from "@/lib/electro/project-access";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireElectroContext();
  const { id } = await params;

  const report = await db.electroReport.findFirst({ where: { id, companyId: ctx.company.id }, include: { project: true } });
  if (!report) notFound();
  if (!(await loadAccessibleProject(ctx, report.projectId))) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href={`${ELECTRO_APP_BASE}/izvjestaji`} className="text-sm text-muted hover:text-foreground">← Izvještaji</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{report.title}</h1>
        <a
          href={`${ELECTRO_APP_BASE}/izvjestaji/${report.id}/raw`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Otvori za ispis / PDF
        </a>
      </div>
      <div className={`${electroCardCls} !p-0 overflow-hidden`}>
        <iframe title={report.title} srcDoc={report.html} className="h-[70vh] w-full border-0" />
      </div>
    </div>
  );
}
