import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCategories } from "@/lib/content";

export async function generateMetadata(
  props: PageProps<"/[locale]/categories">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return { title: t.all_categories };
}

export default async function CategoriesPage(
  props: PageProps<"/[locale]/categories">
) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const categories = await getCategories(locale, {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.all_categories}</h1>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => {
          const tr = cat.translations[0];
          return (
            <Link
              key={cat.id}
              href={`/${locale}/categories/${tr?.slug ?? cat.slug}`}
              className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5 font-semibold group-hover:text-primary">
                  {cat.icon && <span aria-hidden>{cat.icon}</span>}
                  {tr?.name ?? cat.slug}
                </span>
                <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-medium text-primary">
                  {cat._count.tools}
                </span>
              </div>
              {tr?.description && (
                <p className="mt-2 line-clamp-2 text-sm text-muted">{tr.description}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
