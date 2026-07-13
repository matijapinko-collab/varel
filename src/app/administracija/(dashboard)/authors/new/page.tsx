import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { AuthorForm } from "@/components/admin/author-form";
import { createAuthor } from "@/server/actions/authors";

export const dynamic = "force-dynamic";

export default function NewAuthorPage() {
  return (
    <div>
      <PageHeader title="Add author" />
      <Link href="/administracija/authors" className="text-sm text-muted hover:text-primary">← All authors</Link>
      <div className="mt-4">
        <AuthorForm action={createAuthor} />
      </div>
    </div>
  );
}
