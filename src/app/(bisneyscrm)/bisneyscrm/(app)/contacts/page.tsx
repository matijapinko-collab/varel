import Link from "next/link";
import { requireBisneysUser } from "@/lib/bisneyscrm/auth/guard";
import { db } from "@/lib/db";
import { createContact } from "@/server/actions/bisneys-people";
import { BisneysPageHeader } from "@/components/bisneyscrm/shared/module-page";
import { DataTable, DetailCard, TextInput, SelectInput } from "@/components/bisneyscrm/shared/ui";

export const dynamic = "force-dynamic";

export default async function ContactsList() {
  await requireBisneysUser();
  const [contacts, companies] = await Promise.all([
    db.bisneysContact.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { company: true, person: true } }),
    db.bisneysCompany.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-4xl">
      <BisneysPageHeader title="Kontakti" description={`${contacts.length} kontakata`} />

      <div className="mb-6">
        <DetailCard title="Novi kontakt">
          {companies.length === 0 ? (
            <p className="text-sm text-muted">Prvo dodajte tvrtku da biste dodali kontakt.</p>
          ) : (
            <form action={createContact} className="grid gap-3 sm:grid-cols-2">
              <SelectInput name="companyId" required className="sm:col-span-2"><option value="">Tvrtka…</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectInput>
              <TextInput name="firstName" placeholder="Ime" required />
              <TextInput name="lastName" placeholder="Prezime" required />
              <TextInput name="title" placeholder="Funkcija (npr. direktor)" />
              <TextInput name="email" type="email" placeholder="Email" />
              <TextInput name="phone" placeholder="Telefon" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPrimary" className="h-4 w-4 accent-[var(--primary)]" /> Primarni kontakt</label>
              <div className="sm:col-span-2"><button type="submit" className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Dodaj kontakt</button></div>
            </form>
          )}
        </DetailCard>
      </div>

      <DataTable headers={["Osoba", "Tvrtka", "Funkcija", "Email", "Telefon"]} empty={contacts.length === 0 ? "Još nema kontakata." : undefined}>
        {contacts.map((c) => (
          <tr key={c.id} className="hover:bg-soft">
            <td className="px-4 py-3"><Link href={`/bisneyscrm/people/${c.personId}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-300">{c.person.fullName}</Link></td>
            <td className="px-4 py-3"><Link href={`/bisneyscrm/companies/${c.companyId}`} className="text-indigo-600 hover:underline dark:text-indigo-300">{c.company.name}</Link></td>
            <td className="px-4 py-3">{c.title ?? "—"}</td>
            <td className="px-4 py-3">{c.email ?? c.person.email ?? "—"}</td>
            <td className="px-4 py-3">{c.phone ?? c.person.phone ?? "—"}</td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
