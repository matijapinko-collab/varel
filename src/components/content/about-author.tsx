import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { getDefaultAuthor, localizeAuthor, authorLabels } from "@/lib/authors";
import { AuthorAvatar } from "./author-avatar";

/** Slugs (per locale) that should render the founder/author section. */
export const ABOUT_SLUGS = new Set([
  "about",
  "about-us",
  "about-varel",
  "o-nama",
  "o-varelu",
  "o-nama-about",
]);

/**
 * Author/founder section for the About page. Uses the default author's About
 * photo (falls back to the author photo). Server-rendered.
 */
export async function AboutAuthor({ locale }: { locale: Locale }) {
  const author = await getDefaultAuthor().catch(() => null);
  if (!author) return null;
  const a = localizeAuthor(author, locale);
  const t = authorLabels(locale);

  return (
    <section className="mx-auto mt-10 max-w-3xl px-4 sm:px-6">
      <div className="flex flex-col items-center gap-5 rounded-card border border-border bg-card p-6 text-center sm:flex-row sm:items-start sm:text-left">
        <AuthorAvatar photoUrl={a.aboutPhotoUrl} alt={a.aboutPhotoAlt} name={a.displayName} size={112} className="border-2 border-primary/20" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">{a.displayName}</h2>
          {a.role && <p className="text-muted">{a.role}</p>}
          {a.bioShort && <p className="mt-3 text-sm leading-relaxed text-foreground/90">{a.bioShort}</p>}
          <Link href={a.path} className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            {t.viewProfile} →
          </Link>
        </div>
      </div>
    </section>
  );
}
