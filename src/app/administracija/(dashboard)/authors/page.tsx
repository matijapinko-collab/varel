import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, AdminTable } from "@/components/admin/ui";
import { setDefaultAuthor, toggleAuthorActive } from "@/server/actions/authors";
import { siteUrl } from "@/lib/authors";

export const dynamic = "force-dynamic";

export default async function AuthorsPage() {
  const authors = await db.author
    .findMany({
      orderBy: [{ isDefault: "desc" }, { internalName: "asc" }],
      include: { _count: { select: { articles: true } } },
    })
    .catch(() => []);

  const site = siteUrl();

  return (
    <div>
      <PageHeader title="Authors">
        <Link
          href="/administracija/authors/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Add author
        </Link>
      </PageHeader>
      <p className="-mt-2 mb-4 text-sm text-muted">
        Public bylines shown on articles, reviews and guides. The same author is displayed as
        <strong> Matt Pinko</strong> on <code>/en</code> and <strong>Matija Pinko</strong> on <code>/hr</code>.
      </p>

      <AdminTable
        headers={["", "Display (EN / HR)", "Role", "Status", "Default", "Posts", "Setup", "Actions"]}
        empty={authors.length === 0}
      >
        {authors.map((a) => {
          const ready = Boolean(a.photoUrl) && Boolean(a.bioShortEn || a.bioShortHr);
          return (
            <tr key={a.id} className="align-top">
              <td className="px-3 py-2.5">
                <div className="h-9 w-9 overflow-hidden rounded-full border border-border bg-soft">
                  {a.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
              </td>
              <td className="px-3 py-2.5">
                <Link href={`/administracija/authors/${a.id}/edit`} className="font-medium hover:text-primary">
                  {a.displayNameEn}
                </Link>
                <div className="text-xs text-muted">{a.displayNameHr}</div>
              </td>
              <td className="px-3 py-2.5 text-sm text-muted">{a.roleEn ?? a.roleHr ?? "—"}</td>
              <td className="px-3 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.isActive ? "bg-green-500/10 text-green-600" : "bg-gray-400/10 text-gray-500"}`}>
                  {a.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-3 py-2.5 text-sm">{a.isDefault ? "★ Default" : "—"}</td>
              <td className="px-3 py-2.5 text-sm font-semibold">{a._count.articles}</td>
              <td className="px-3 py-2.5 text-xs">
                {ready ? (
                  <span className="text-green-600">Ready</span>
                ) : (
                  <span className="text-amber-600">{!a.photoUrl ? "Photo missing" : "Bio missing"}</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link href={`/administracija/authors/${a.id}/edit`} className="text-primary hover:underline">Edit</Link>
                  <a href={`${site}/en/authors/${a.slugEn}`} target="_blank" rel="noopener" className="text-muted hover:text-primary">EN profile</a>
                  <a href={`${site}/hr/autori/${a.slugHr}`} target="_blank" rel="noopener" className="text-muted hover:text-primary">HR profile</a>
                  {!a.isDefault && (
                    <form action={setDefaultAuthor.bind(null, a.id)}>
                      <button className="text-muted hover:text-primary">Set default</button>
                    </form>
                  )}
                  <form action={toggleAuthorActive.bind(null, a.id)}>
                    <button className="text-muted hover:text-primary">{a.isActive ? "Deactivate" : "Activate"}</button>
                  </form>
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </div>
  );
}
