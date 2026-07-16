import { notFound } from "next/navigation";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { BackLink } from "@/components/bisneyscrm/shared/ui";
import { PersonForm } from "@/components/bisneyscrm/people/person-form";

export const dynamic = "force-dynamic";

export default async function EditPerson({ params }: { params: Promise<{ id: string }> }) {
  await requireBisneysUser();
  const { id } = await params;
  const p = await db.bisneysPerson.findFirst({ where: { id, deletedAt: null } });
  if (!p) notFound();
  return (
    <div className="max-w-3xl">
      <BackLink href={`/bisneyscrm/people/${p.id}`}>{p.fullName}</BackLink>
      <BisneysPageHeader title="Uredi osobu" />
      <PersonForm person={{ id: p.id, firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, city: p.city, country: p.country, notes: p.notes, source: p.source }} />
    </div>
  );
}
