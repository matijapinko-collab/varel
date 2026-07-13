import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getAuthorBySlug } from "@/lib/authors";
import { AuthorProfilePage, authorProfileMetadata } from "@/components/content/author-profile-page";

export async function generateMetadata(props: PageProps<"/[locale]/authors/[slug]">): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  return authorProfileMetadata(locale as Locale, slug);
}

export default async function AuthorsRoute(props: PageProps<"/[locale]/authors/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();

  // Croatian canonical uses /hr/autori/<slugHr>.
  if (locale === "hr") {
    const author = await getAuthorBySlug(slug).catch(() => null);
    if (author) redirect(`/hr/autori/${author.slugHr}`);
  }

  return <AuthorProfilePage locale={locale as Locale} slug={slug} />;
}
