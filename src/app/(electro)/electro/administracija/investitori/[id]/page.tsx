import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireElectroContext } from "@/lib/electro/auth/guard";
import { ELECTRO_APP_BASE } from "@/lib/electro/constants";
import { canManageProjects } from "@/lib/electro/project-access";
import { ELECTRO_PROJECT_STATUS_LABELS } from "@/lib/electro/projects";
import { ElectroInvestorForm } from "@/components/electro/investors/investor-form";
import { ElectroInvestorContactForm } from "@/components/electro/investors/contact-form";
import { electroCardCls } from "@/components/electro/ui";

export const dynamic = "force-dynamic";

export default async function ElectroInvestorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireElectroContext();
  if (!canManageProjects(ctx)) redirect(`${ELECTRO_APP_BASE}/403`);
  const { id } = await params;

  const investor = await db.electroInvestor.findFirst({
    where: { id, companyId: ctx.company.id },
    include: {
      contacts: { orderBy: { createdAt: "asc" } },
      projects: { include: { project: true } },
    },
  });
  if (!investor || investor.isArchived) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`${ELECTRO_APP_BASE}/investitori`} className="text-sm text-muted hover:text-foreground">← Investitori</Link>

      <section className={electroCardCls}>
        <h1 className="mb-6 text-xl font-bold">{investor.name}</h1>
        <ElectroInvestorForm
          mode="edit"
          investorId={investor.id}
          initial={{
            type: investor.type,
            name: investor.name,
            oib: investor.oib ?? "",
            address: investor.address ?? "",
            city: investor.city ?? "",
            country: investor.country ?? "Hrvatska",
            email: investor.email ?? "",
            phone: investor.phone ?? "",
            notes: investor.notes ?? "",
          }}
        />
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Kontakt osobe</h2>
        <ul className="mb-4 space-y-1.5">
          {investor.contacts.map((c) => (
            <li key={c.id} className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/10">
              <span className="font-medium">{c.firstName} {c.lastName}</span>
              {c.role && <span className="text-muted"> · {c.role}</span>}
              {c.email && <span className="text-muted"> · {c.email}</span>}
              {c.phone && <span className="text-muted"> · {c.phone}</span>}
            </li>
          ))}
          {investor.contacts.length === 0 && <li className="text-sm text-muted">Još nema kontakata.</li>}
        </ul>
        <ElectroInvestorContactForm investorId={investor.id} />
      </section>

      <section className={electroCardCls}>
        <h2 className="mb-3 font-bold">Projekti</h2>
        <ul className="space-y-1.5">
          {investor.projects.map((pi) => (
            <li key={pi.projectId}>
              <Link href={`${ELECTRO_APP_BASE}/projekti/${pi.projectId}`} className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                {pi.project.code} · {pi.project.name}
              </Link>
              <span className="ml-2 text-xs text-muted">{ELECTRO_PROJECT_STATUS_LABELS[pi.project.status]}</span>
            </li>
          ))}
          {investor.projects.length === 0 && <li className="text-sm text-muted">Nije povezan ni s jednim projektom.</li>}
        </ul>
      </section>
    </div>
  );
}
