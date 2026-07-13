import Link from "next/link";
import type { Author } from "@/generated/prisma/client";
import type { Locale } from "@/lib/i18n/config";
import { localizeAuthor, authorLabels } from "@/lib/authors";
import { AuthorAvatar } from "./author-avatar";
import { SocialIcon } from "./social-icon";

function fmtDate(d: Date | null | undefined, locale: Locale): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Full author box, shown at the end of an article/review/guide before related
 * content + newsletter CTA. Server-rendered and indexable — all author data
 * (name, role, bio, expertise) is in the HTML, not just JSON-LD.
 */
export function AuthorBox({
  author,
  locale,
  lastUpdated,
  lastTested,
  pricingChecked,
}: {
  author: Author;
  locale: Locale;
  lastUpdated?: Date | null;
  lastTested?: Date | null;
  pricingChecked?: Date | null;
}) {
  const a = localizeAuthor(author, locale);
  const t = authorLabels(locale);

  const dates: { label: string; value: string }[] = [];
  const u = fmtDate(lastUpdated, locale);
  const lt = fmtDate(lastTested, locale);
  const pc = fmtDate(pricingChecked, locale);
  if (u) dates.push({ label: t.updated, value: u });
  if (lt) dates.push({ label: t.lastTested, value: lt });
  if (pc) dates.push({ label: t.pricingChecked, value: pc });

  return (
    <section className="mt-12 rounded-card border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex justify-center sm:block">
          <AuthorAvatar photoUrl={a.photoUrl} alt={a.photoAlt} name={a.displayName} size={96} className="border-2 border-primary/20" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.writtenBy}</p>
          <h2 className="mt-0.5 text-lg font-bold">
            <Link href={a.path} className="hover:text-primary">{a.displayName}</Link>
          </h2>
          {a.role && <p className="text-sm text-muted">{a.role}</p>}

          {a.bioShort && <p className="mt-3 text-sm leading-relaxed text-foreground/90">{a.bioShort}</p>}

          {a.expertise.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.expertise}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {a.expertise.map((tag) => (
                  <span key={tag} className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-medium text-primary">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={a.path} className="text-sm font-semibold text-primary hover:underline">
              {t.viewProfile} →
            </Link>
            {a.socials.length > 0 && (
              <div className="flex items-center gap-2">
                {a.socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={s.label}
                    title={s.label}
                    className="text-muted transition-colors hover:text-primary"
                  >
                    <SocialIcon kind={s.key} size={17} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {dates.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-muted">
              {dates.map((d) => (
                <div key={d.label} className="flex gap-1">
                  <dt className="font-medium">{d.label}:</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
