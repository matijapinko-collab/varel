import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAuthorBySlug } from "@/lib/authors";
import { AuthorProfilePage, authorProfileMetadata } from "@/components/content/author-profile-page";

export async function generateMetadata(props: PageProps<"/[locale]/autori/[slug]">): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  return authorProfileMetadata(locale as Locale, slug);
}

export default async function AutoriRoute(props: PageProps<"/[locale]/autori/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();

  // "/autori" is the Croatian segment; other locales use /authors/<slugEn>.
  if (locale !== "hr") {
    const author = await getAuthorBySlug(slug).catch(() => null);
    if (author) redirect(`/${locale}/authors/${author.slugEn}`);
  }

  return <AuthorProfilePage locale={locale as Locale} slug={slug} />;
}
