import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { createTalentPool } from "@/server/actions/bisneys-candidate-ops";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DetailCard, TextInput, TextArea, SubmitButton } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";

export default async function TalentPoolsPage() {
  await requireBisneysUser();
  const pools = await db.bisneysTalentPool.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="max-w-4xl">
      <BisneysPageHeader title="Talent pools" description="Kurirane grupe kandidata za buduće potrebe." />

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          {pools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted">Još nema talent poolova.</div>
          ) : pools.map((p) => (
            <Link key={p.id} href={`/bisneyscrm/talent-pools/${p.id}`} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 hover:border-indigo-500/50">
              <span className="flex items-center gap-2 font-medium">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: p.color || "#6366f1" }} />
                {p.name}
              </span>
              <span className="text-xs text-muted">{p._count.members} kandidata</span>
            </Link>
          ))}
        </div>

        <DetailCard title="Novi talent pool">
          <form action={createTalentPool} className="space-y-3">
            <div><label className="mb-1 block text-xs text-muted">Naziv</label><TextInput name="name" required placeholder="npr. HVAC seniori — pričuva" /></div>
            <div><label className="mb-1 block text-xs text-muted">Opis</label><TextArea name="description" rows={2} /></div>
            <div><label className="mb-1 block text-xs text-muted">Boja</label><TextInput name="color" type="color" defaultValue="#6366f1" /></div>
            <SubmitButton>Kreiraj</SubmitButton>
          </form>
        </DetailCard>
      </div>
    </div>
  );
}
