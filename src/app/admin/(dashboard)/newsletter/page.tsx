import { db } from "@/lib/db";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";

export default async function AdminNewsletterPage() {
  const subscribers = await db.newsletterSubscriber.findMany({
    include: { language: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const total = await db.newsletterSubscriber.count();

  return (
    <div>
      <PageHeader title={`Newsletter (${total} subscribers)`}>
        <a
          href="/api/admin/newsletter-export"
          className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Export CSV
        </a>
      </PageHeader>
      <p className="mb-4 -mt-2 text-sm text-muted">
        Connect Beehiiv, MailerLite or Resend later — for now, export subscribers as CSV.
      </p>
      <AdminTable headers={["Email", "Language", "Source", "Status", "Signed up"]} empty={subscribers.length === 0}>
        {subscribers.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-2.5 text-sm font-medium">{s.email}</td>
            <td className="px-4 py-2.5 text-xs uppercase text-muted">{s.language?.code ?? "—"}</td>
            <td className="px-4 py-2.5 text-xs text-muted">{s.source ?? "—"}</td>
            <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
            <td className="px-4 py-2.5 text-xs text-muted">{s.createdAt.toLocaleDateString()}</td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
