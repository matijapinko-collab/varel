import Link from "next/link";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { accessibleProjectsWhere } from "@/lib/electro/project-access";
import { ElectroDocumentUploadForm } from "@/components/electro/documents/upload-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroNewDocumentPage() {
  const ctx = await requireElectroContext();
  const projects = await db.electroProject.findMany({
    where: { ...accessibleProjectsWhere(ctx), isArchived: false },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`${ELECTRO_APP_BASE}/dokumenti`} className="text-sm text-muted hover:text-foreground">← Dokumenti</Link>
      <div className={electroCardCls}>
        <h1 className="mb-6 text-xl font-bold">Učitaj dokument</h1>
        {projects.length > 0 ? (
          <ElectroDocumentUploadForm projects={projects.map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }))} />
        ) : (
          <p className="text-sm text-muted">Nema dostupnih projekata. Prvo stvorite projekt.</p>
        )}
      </div>
    </div>
  );
}
