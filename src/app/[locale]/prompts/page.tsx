import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage } from "@/lib/content";
import { db } from "@/lib/db";

export async function generateMetadata(
  props: PageProps<"/[locale]/prompts">
): Promise<Metadata> {
  const { locale } = await props.params;
  const t = getDictionary(locale as Locale);
  return { title: t.nav_prompts };
}

export default async function PromptsPage(props: PageProps<"/[locale]/prompts">) {
  const { locale } = await props.params;
  if (!isLocale(locale)) notFound();
  const searchParams = await props.searchParams;
  const categorySlug =
    typeof searchParams.category === "string" ? searchParams.category : undefined;
  const t = getDictionary(locale);
  const language = await getLanguage(locale);

  const [prompts, categories] = language
    ? await Promise.all([
        db.promptTranslation.findMany({
          where: {
            languageId: language.id,
            status: "PUBLISHED",
            prompt: {
              status: "PUBLISHED",
              deletedAt: null,
              ...(categorySlug ? { category: { slug: categorySlug } } : {}),
            },
          },
          include: {
            prompt: {
              include: {
                category: {
                  include: { translations: { where: { languageId: language.id } } },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 60,
        }),
        db.promptCategory.findMany({
          where: { status: "PUBLISHED" },
          include: { translations: { where: { languageId: language.id } } },
          orderBy: { position: "asc" },
        }),
      ])
    : [[], []];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">{t.nav_prompts}</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`/${locale}/prompts`}
          className={`rounded-full border px-3 py-1 text-sm ${!categorySlug ? "border-primary bg-soft font-medium text-primary" : "border-border text-muted hover:text-foreground"}`}
        >
          {t.view_all}
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/${locale}/prompts?category=${cat.slug}`}
            className={`rounded-full border px-3 py-1 text-sm ${categorySlug === cat.slug ? "border-primary bg-soft font-medium text-primary" : "border-border text-muted hover:text-foreground"}`}
          >
            {cat.translations[0]?.name ?? cat.slug}
          </Link>
        ))}
      </div>

      {prompts.length === 0 ? (
        <p className="mt-10 text-muted">{t.no_results}</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {prompts.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/prompts/${p.slug}`}
              className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center gap-2 text-xs">
                {p.prompt.category && (
                  <span className="rounded-full bg-soft px-2 py-0.5 font-medium text-primary">
                    {p.prompt.category.translations[0]?.name ?? p.prompt.category.slug}
                  </span>
                )}
                <span className="rounded-full border border-border px-2 py-0.5 text-muted">
                  {p.prompt.difficulty.toLowerCase()}
                </span>
              </div>
              <h2 className="mt-2.5 font-semibold group-hover:text-primary">{p.title}</h2>
              {p.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted">{p.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
