import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { ServiceForm } from "@/components/bisneyscrm/services/service-form";

export const dynamic = "force-dynamic";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  const s = await db.bisneysService.findUnique({ where: { id } });
  if (!s) notFound();
  return (
    <div className="max-w-3xl">
      <BackLink href="/bisneyscrm/services">Usluge</BackLink>
      <BisneysPageHeader title="Uredi uslugu" />
      <ServiceForm service={{ id: s.id, name: s.name, description: s.description, isActive: s.isActive, basePrice: s.basePrice?.toString() ?? null, currency: s.currency, billingModel: s.billingModel, color: s.color, icon: s.icon }} />
    </div>
  );
}
