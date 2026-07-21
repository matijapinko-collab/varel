import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { scanDemoContent, hideDemoContentForm } from "@/server/actions/demo-content";
import { PageHeader, AdminTable, StatusBadge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function DemoContentPage() {
  const items = await scanDemoContent();
  const published = items.filter((i) => i.status === "PUBLISHED");

  return (
    <div>
      <PageHeader title="Demo content cleanup" />
      <p className="-mt-2 mb-5 max-w-2xl text-sm text-muted">
        The seed ships placeholder records marked <code>[SAMPLE]</code> / <code>[PRIMJER]</code>.
        This page finds them and sets them to <strong>draft</strong> so they disappear from the
        public site. Nothing is deleted — you can republish any item from its own editor.
      </p>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-card border border-emerald-500/30 bg-emerald-500/5 p-5">
          <CheckCircle2 className="text-emerald-600" size={20} />
          <div>
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">No demo content found</p>
            <p className="text-sm text-muted">The public site is clean.</p>
          </div>
        </div>
      ) : (
        <>
          {published.length > 0 && (
            <div className="mb-5 flex items-start gap-3 rounded-card border border-amber-500/40 bg-amber-500/5 p-5">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  {published.length} demo {published.length === 1 ? "item is" : "items are"} publicly visible
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Visitors currently see placeholder content on varel.io.
                </p>
                <form action={hideDemoContentForm} className="mt-3">
                  <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                    Hide all demo content ({items.length})
                  </button>
                </form>
              </div>
            </div>
          )}

          <AdminTable headers={["Type", "Title", "Status", ""]} empty={false}>
            {items.map((i) => (
              <tr key={`${i.type}-${i.id}`}>
                <td className="px-3 py-2.5 text-sm font-medium">{i.type}</td>
                <td className="px-3 py-2.5 text-sm">{i.title}</td>
                <td className="px-3 py-2.5"><StatusBadge status={i.status} /></td>
                <td className="px-3 py-2.5 text-right">
                  <Link href={i.editPath} className="text-sm text-primary hover:underline">Open</Link>
                </td>
              </tr>
            ))}
          </AdminTable>

          {published.length === 0 && (
            <p className="mt-4 text-sm text-muted">
              All demo items are already drafts — nothing is publicly visible.
            </p>
          )}
        </>
      )}
    </div>
  );
}
