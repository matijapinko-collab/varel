import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { AuthorForm } from "@/components/admin/author-form";
import { updateAuthor } from "@/server/actions/authors";
import { siteUrl } from "@/lib/authors";

export const dynamic = "force-dynamic";

export default async function EditAuthorPage(props: PageProps<"/administracija/authors/[id]/edit">) {
  const { id } = await props.params;
  const search = await props.searchParams;
  const author = await db.author.findUnique({ where: { id } });
  if (!author) notFound();

  const site = siteUrl();
  const saved = search?.saved === "1";

  return (
    <div>
      <PageHeader title={`Edit — ${author.internalName}`}>
        <a href={`${site}/en/authors/${author.slugEn}`} target="_blank" rel="noopener" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary">View EN</a>
        <a href={`${site}/hr/autori/${author.slugHr}`} target="_blank" rel="noopener" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary">View HR</a>
      </PageHeader>
      <Link href="/administracija/authors" className="text-sm text-muted hover:text-primary">← All authors</Link>

      {saved && (
        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm text-green-700">Author saved.</div>
      )}

      <div className="mt-4">
        <AuthorForm author={author} action={updateAuthor.bind(null, author.id)} />
      </div>
    </div>
  );
}
