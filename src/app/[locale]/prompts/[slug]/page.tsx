import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getLanguage, getSeo } from "@/lib/content";
import { db } from "@/lib/db";
import { CopyButton } from "@/components/blocks/copy-button";
import { buildSeoMetadata } from "@/lib/seo";

async function getPrompt(locale: Locale, slug: string) {
  const language = await getLanguage(locale);
  if (!language) return null;
  return db.promptTranslation.findFirst({
    where: {
      languageId: language.id,
      slug,
      status: "PUBLISHED",
      prompt: { status: "PUBLISHED", deletedAt: null },
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
  });
}

export async function generateMetadata(
  props: PageProps<"/[locale]/prompts/[slug]">
): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) return {};
  const p = await getPrompt(locale, slug);
  if (!p) return {};
  const seo = await getSeo("PROMPT", p.promptId, locale);
  return buildSeoMetadata({
    seo,
    fallbackTitle: p.title,
    fallbackDescription: p.description ?? undefined,
    locale,
    path: `/prompts/${p.slug}`,
  });
}

export default async function PromptPage(props: PageProps<"/[locale]/prompts/[slug]">) {
  const { locale, slug } = await props.params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const p = await getPrompt(locale, slug);
  if (!p) notFound();

  const variables = Array.isArray(p.variablesJson)
    ? (p.variablesJson as { name: string; example?: string }[])
    : [];
  const models = Array.isArray(p.compatibleModelsJson)
    ? (p.compatibleModelsJson as string[])
    : [];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {p.prompt.category && (
          <span className="rounded-full bg-soft px-2.5 py-1 font-medium text-primary">
            {p.prompt.category.translations[0]?.name ?? p.prompt.category.slug}
          </span>
        )}
        <span className="rounded-full border border-border px-2.5 py-1 text-muted">
          {t.difficulty}: {p.prompt.difficulty.toLowerCase()}
        </span>
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{p.title}</h1>
      {p.description && <p className="mt-3 text-lg text-muted">{p.description}</p>}

      {p.promptText && (
        <div className="mt-8 rounded-card border border-border bg-background-secondary">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-sm font-semibold">Prompt</span>
            <CopyButton
              text={p.promptText}
              label={t.copy_prompt}
              copiedLabel={t.copied}
              entityId={p.promptId}
              locale={locale}
            />
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed">
            {p.promptText}
          </pre>
        </div>
      )}

      {variables.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Variables</h2>
          <div className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
            {variables.map((v) => (
              <div key={v.name} className="flex items-center justify-between px-5 py-3 text-sm">
                <code className="rounded bg-soft px-2 py-0.5 text-primary">
                  {"{{" + v.name + "}}"}
                </code>
                {v.example && <span className="text-muted">{v.example}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {p.exampleOutput && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">{t.example_output}</h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-card border border-border bg-card px-5 py-4 text-sm leading-relaxed text-muted">
            {p.exampleOutput}
          </pre>
        </section>
      )}

      {models.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">{t.compatible_models}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {models.map((m) => (
              <span key={m} className="rounded-full border border-border px-3 py-1 text-sm text-muted">
                {m}
              </span>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
