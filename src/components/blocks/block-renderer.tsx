import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getPublishedTools, getCategories, getLanguage } from "@/lib/content";
import { getBestDeals } from "@/lib/deals-data";
import { ToolCard, type ToolCardData } from "@/components/cards/tool-card";
import { DealCard, type DealCardData } from "@/components/cards/deal-card";
import { SearchBar } from "./search-bar";
import { NewsletterForm } from "./newsletter-form";
import { FaqAccordion } from "./faq-accordion";
import { HeroMotion } from "@/components/motion/hero-motion";
import { AnimatedSection } from "@/components/motion/animated-section";

/**
 * Renders page-builder blocks stored in the database (page_blocks table).
 * Every block reads its texts/settings from contentJson/settingsJson —
 * nothing rendered here is hardcoded.
 */

export type BlockData = {
  id: string;
  type: string;
  contentJson: unknown;
  settingsJson: unknown;
  globalSection?: { blocks: BlockData[] } | null;
};

type Content = Record<string, unknown>;

function str(c: Content, key: string, fallback = ""): string {
  const v = c[key];
  // Empty strings fall back too — the admin can clear a field to restore
  // the translated default from the dictionary.
  return typeof v === "string" && v.trim() !== "" ? v : fallback;
}
function num(c: Content, key: string, fallback: number): number {
  const v = Number(c[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
function list(c: Content, key: string): string[] {
  const v = c[key];
  return Array.isArray(v) ? v.map(String) : [];
}

export async function BlockRenderer({
  blocks,
  locale,
}: {
  blocks: BlockData[];
  locale: Locale;
}) {
  return (
    <>
      {blocks.map((block) => {
        // Hero animates on load; global sections manage their own children.
        // Every other section reveals once as it scrolls into view.
        if (block.type === "hero" || block.type === "global_section") {
          return <Block key={block.id} block={block} locale={locale} />;
        }
        return (
          <AnimatedSection key={block.id}>
            <Block block={block} locale={locale} />
          </AnimatedSection>
        );
      })}
    </>
  );
}

async function Block({ block, locale }: { block: BlockData; locale: Locale }) {
  const t = getDictionary(locale);
  const c = (block.contentJson ?? {}) as Content;
  const s = (block.settingsJson ?? {}) as Content;

  switch (block.type) {
    case "global_section": {
      if (!block.globalSection) return null;
      return <BlockRenderer blocks={block.globalSection.blocks} locale={locale} />;
    }

    case "hero":
      return (
        <HeroMotion
          title={str(c, "title", t.hero_title)}
          subtitle={str(c, "subtitle", t.hero_subtitle)}
          searchPlaceholder={str(c, "searchPlaceholder", t.search_placeholder)}
          suggestions={list(c, "suggestedSearches")}
          locale={locale}
          showSearch={str(s, "showSearch", "true") !== "false"}
        />
      );

    case "search_bar":
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <SearchBar
            locale={locale}
            placeholder={str(c, "placeholder", t.search_placeholder)}
            suggestions={list(c, "suggestedSearches")}
          />
        </div>
      );

    case "heading": {
      const level = str(s, "level", "h2");
      const text = str(c, "text");
      const cls = "mx-auto max-w-7xl px-4 sm:px-6 text-2xl font-bold tracking-tight";
      if (level === "h1") return <h1 className={cls}>{text}</h1>;
      if (level === "h3") return <h3 className={`${cls} text-xl`}>{text}</h3>;
      return <h2 className={cls}>{text}</h2>;
    }

    case "paragraph":
      return (
        <p className="mx-auto max-w-7xl px-4 py-2 text-muted sm:px-6">
          {str(c, "text")}
        </p>
      );

    case "rich_text":
      return (
        <div
          className="prose-varel mx-auto max-w-3xl px-4 py-4 sm:px-6"
          dangerouslySetInnerHTML={{ __html: str(c, "html") }}
        />
      );

    case "image": {
      const url = str(c, "url");
      if (!url) return null;
      return (
        <figure className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <Image
            src={url}
            alt={str(c, "alt")}
            width={num(s, "width", 1200)}
            height={num(s, "height", 630)}
            className="w-full rounded-card border border-border"
          />
          {str(c, "caption") && (
            <figcaption className="mt-2 text-center text-sm text-muted">
              {str(c, "caption")}
            </figcaption>
          )}
        </figure>
      );
    }

    case "video": {
      const url = str(c, "url");
      if (!url) return null;
      return (
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="aspect-video overflow-hidden rounded-card border border-border">
            <iframe
              src={url}
              className="h-full w-full"
              allowFullScreen
              title={str(c, "title", "Video")}
              loading="lazy"
            />
          </div>
        </div>
      );
    }

    case "button": {
      const href = str(c, "url", "#");
      const variant = str(s, "variant", "primary");
      return (
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <Link
            href={href}
            className={
              variant === "outline"
                ? "inline-flex h-11 items-center rounded-full border border-primary px-6 text-sm font-semibold text-primary hover:bg-soft"
                : "inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
            }
          >
            {str(c, "label", t.read_more)}
          </Link>
        </div>
      );
    }

    case "cta":
      return (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="rounded-card border border-border bg-gradient-to-r from-soft to-background-secondary p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold">{str(c, "title")}</h2>
            {str(c, "subtitle") && (
              <p className="mx-auto mt-2 max-w-xl text-muted">{str(c, "subtitle")}</p>
            )}
            {str(c, "buttonUrl") && (
              <Link
                href={str(c, "buttonUrl")}
                className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {str(c, "buttonLabel", t.read_more)}
              </Link>
            )}
          </div>
        </section>
      );

    case "tool_grid": {
      const tools = await getPublishedTools(locale, {
        take: num(s, "limit", 8),
        featured: s.featured === true || s.featured === "true" ? true : undefined,
        trending: s.trending === true || s.trending === "true" ? true : undefined,
        categorySlug: str(s, "categorySlug") || undefined,
      });
      if (!tools.length) return null;
      return (
        <SectionWrap
          title={str(c, "title")}
          viewAllUrl={str(c, "viewAllUrl") || `/${locale}/tools`}
          viewAllLabel={t.view_all}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool as unknown as ToolCardData} locale={locale} />
            ))}
          </div>
        </SectionWrap>
      );
    }

    case "category_grid": {
      const categories = await getCategories(locale, {
        featured: s.featured === true || s.featured === "true" ? true : undefined,
        take: num(s, "limit", 8),
      });
      if (!categories.length) return null;
      return (
        <SectionWrap
          title={str(c, "title", t.featured_categories)}
          viewAllUrl={`/${locale}/categories`}
          viewAllLabel={t.view_all}
        >
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((cat) => {
              const tr = cat.translations[0];
              return (
                <Link
                  key={cat.id}
                  href={`/${locale}/categories/${tr?.slug ?? cat.slug}`}
                  className="group flex items-center justify-between rounded-card border border-border bg-card px-4 py-3.5 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="flex items-center gap-2.5 text-sm font-medium group-hover:text-primary">
                    {cat.icon && <span aria-hidden>{cat.icon}</span>}
                    {tr?.name ?? cat.slug}
                  </span>
                  <span className="text-xs text-muted">{cat._count.tools}</span>
                </Link>
              );
            })}
          </div>
        </SectionWrap>
      );
    }

    case "latest_articles": {
      const language = await getLanguage(locale);
      if (!language) return null;
      const articles = await db.articleTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          article: { status: "PUBLISHED", deletedAt: null },
        },
        include: { article: true },
        orderBy: { updatedAt: "desc" },
        take: num(s, "limit", 3),
      });
      if (!articles.length) return null;
      return (
        <SectionWrap
          title={str(c, "title", t.latest_guides)}
          viewAllUrl={`/${locale}/guides`}
          viewAllLabel={t.view_all}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/${locale}/guides/${a.slug}`}
                className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-primary">
                  {a.article.type === "CORNERSTONE" ? "Guide" : "Article"}
                </div>
                <h3 className="mt-2 font-semibold leading-snug group-hover:text-primary">
                  {a.title}
                </h3>
                {a.excerpt && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{a.excerpt}</p>
                )}
              </Link>
            ))}
          </div>
        </SectionWrap>
      );
    }

    case "latest_comparisons": {
      const language = await getLanguage(locale);
      if (!language) return null;
      const comparisons = await db.comparisonTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          comparison: { status: "PUBLISHED", deletedAt: null },
        },
        orderBy: { updatedAt: "desc" },
        take: num(s, "limit", 4),
      });
      if (!comparisons.length) return null;
      return (
        <SectionWrap
          title={str(c, "title", t.latest_comparisons)}
          viewAllUrl={`/${locale}/compare`}
          viewAllLabel={t.view_all}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {comparisons.map((cmp) => (
              <Link
                key={cmp.id}
                href={`/${locale}/compare/${cmp.slug}`}
                className="group flex items-center justify-between rounded-card border border-border bg-card px-5 py-4 transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <span className="font-medium group-hover:text-primary">{cmp.title}</span>
                <span className="text-muted transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            ))}
          </div>
        </SectionWrap>
      );
    }

    case "featured_editorial": {
      const language = await getLanguage(locale);
      if (!language) return null;
      const post = await db.editorialTranslation.findFirst({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          editorialPost: { status: "PUBLISHED", deletedAt: null },
        },
        include: { editorialPost: { include: { author: true } } },
        orderBy: { updatedAt: "desc" },
      });
      if (!post) return null;
      return (
        <SectionWrap title={str(c, "title", t.latest_editorial)}>
          <Link
            href={`/${locale}/editorial/${post.slug}`}
            className="group block rounded-card border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md sm:p-8"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              The Varel Brief {post.category ? `· ${post.category}` : ""}
            </div>
            <h3 className="mt-2 text-xl font-bold group-hover:text-primary">
              {post.title}
            </h3>
            {post.excerpt && <p className="mt-2 text-muted">{post.excerpt}</p>}
            <div className="mt-4 text-sm text-muted">
              {t.written_by}{" "}
              <span className="font-medium text-foreground">
                {post.editorialPost.author.name}
              </span>{" "}
              — {t.human_written}
            </div>
          </Link>
        </SectionWrap>
      );
    }

    case "latest_news": {
      const language = await getLanguage(locale);
      if (!language) return null;
      const news = await db.newsTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          newsItem: { status: "PUBLISHED", deletedAt: null },
        },
        include: { newsItem: true },
        orderBy: { updatedAt: "desc" },
        take: num(s, "limit", 4),
      });
      if (!news.length) return null;
      return (
        <SectionWrap
          title={str(c, "title", t.latest_news)}
          viewAllUrl={`/${locale}/news`}
          viewAllLabel={t.view_all}
        >
          <div className="divide-y divide-border rounded-card border border-border bg-card">
            {news.map((n) => (
              <Link
                key={n.id}
                href={`/${locale}/news/${n.slug}`}
                className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-soft"
              >
                <div>
                  <div className="font-medium group-hover:text-primary">{n.title}</div>
                  {n.newsItem.sourceName && (
                    <div className="mt-0.5 text-xs text-muted">
                      {t.source}: {n.newsItem.sourceName}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {(n.newsItem.publishedAt ?? n.newsItem.createdAt).toLocaleDateString(locale)}
                </span>
              </Link>
            ))}
          </div>
        </SectionWrap>
      );
    }

    case "latest_deals": {
      const language = await getLanguage(locale);
      if (!language) return null;
      const deals = await db.dealTranslation.findMany({
        where: {
          languageId: language.id,
          status: "PUBLISHED",
          deal: { status: "PUBLISHED", deletedAt: null },
        },
        include: { deal: true },
        orderBy: { updatedAt: "desc" },
        take: num(s, "limit", 3),
      });
      if (!deals.length) return null;
      return (
        <SectionWrap
          title={str(c, "title", t.deals_title)}
          viewAllUrl={`/${locale}/deals`}
          viewAllLabel={t.view_all}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {deals.map((d) => (
              <Link
                key={d.id}
                href={`/${locale}/deals/${d.slug}`}
                className="group rounded-card border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {d.deal.brandName}
                  </span>
                  {d.deal.discountPercent != null && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                      -{d.deal.discountPercent}%
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-semibold group-hover:text-primary">{d.title}</h3>
                {d.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{d.description}</p>
                )}
              </Link>
            ))}
          </div>
        </SectionWrap>
      );
    }

    case "best_deals": {
      const deals = await getBestDeals(locale, {
        featured: s.featured === true || s.featured === "true" ? true : undefined,
        take: num(s, "limit", 6),
      });
      if (!deals.length) return null;
      return (
        <SectionWrap
          title={str(c, "title", t.best_deals_title)}
          viewAllUrl={`/${locale}/best-deals`}
          viewAllLabel={t.view_all_deals}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal as unknown as DealCardData} locale={locale} />
            ))}
          </div>
        </SectionWrap>
      );
    }

    case "newsletter":
      return (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="rounded-card border border-border bg-background-secondary p-8 text-center sm:p-12">
            <h2 className="text-2xl font-bold">{str(c, "title", t.newsletter_title)}</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted">
              {str(c, "subtitle", t.newsletter_subtitle)}
            </p>
            <div className="mt-6">
              <NewsletterForm locale={locale} source="page-block" />
            </div>
          </div>
        </section>
      );

    case "faq": {
      const items = Array.isArray(c.items)
        ? (c.items as { question?: string; answer?: string }[])
        : [];
      if (!items.length) return null;
      return (
        <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h2 className="text-2xl font-bold">{str(c, "title", t.faq)}</h2>
          <div className="mt-4">
            <FaqAccordion
              items={items.map((i) => ({
                question: i.question ?? "",
                answer: i.answer ?? "",
              }))}
            />
          </div>
        </section>
      );
    }

    case "pros_cons": {
      const pros = list(c, "pros");
      const cons = list(c, "cons");
      return (
        <div className="mx-auto grid max-w-3xl gap-4 px-4 py-4 sm:grid-cols-2 sm:px-6">
          <div className="rounded-card border border-border bg-card p-5">
            <div className="font-semibold text-green-600 dark:text-green-400">
              {t.pros}
            </div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {pros.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-border bg-card p-5">
            <div className="font-semibold text-red-500">{t.cons}</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              {cons.map((cItem) => (
                <li key={cItem} className="flex gap-2">
                  <span className="text-red-500">✗</span> {cItem}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    case "stats": {
      const items = Array.isArray(c.items)
        ? (c.items as { value?: string; label?: string }[])
        : [];
      if (!items.length) return null;
      return (
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:px-6 md:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded-card border border-border bg-card p-5 text-center"
            >
              <div className="text-2xl font-bold text-primary">{item.value}</div>
              <div className="mt-1 text-sm text-muted">{item.label}</div>
            </div>
          ))}
        </div>
      );
    }

    case "quote":
      return (
        <blockquote className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <p className="border-l-4 border-primary pl-4 text-lg italic text-foreground">
            “{str(c, "text")}”
          </p>
          {str(c, "author") && (
            <footer className="mt-2 pl-4 text-sm text-muted">— {str(c, "author")}</footer>
          )}
        </blockquote>
      );

    case "callout":
      return (
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="rounded-card border border-primary/30 bg-soft p-4 text-sm">
            {str(c, "text")}
          </div>
        </div>
      );

    case "affiliate_banner":
      return (
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="rounded-card border border-border bg-background-secondary px-4 py-3 text-xs text-muted">
            {str(c, "text", t.affiliate_disclosure_short)}
          </div>
        </div>
      );

    case "divider":
      return <hr className="mx-auto my-6 max-w-7xl border-border" />;

    case "spacer":
      return <div style={{ height: num(s, "height", 32) }} aria-hidden />;

    case "custom_html":
      return (
        <div
          className="mx-auto max-w-7xl px-4 sm:px-6"
          dangerouslySetInnerHTML={{ __html: str(c, "html") }}
        />
      );

    default:
      // Unknown block types are skipped silently in production.
      if (process.env.NODE_ENV !== "production") {
        return (
          <div className="mx-auto max-w-7xl px-4 py-2 text-xs text-red-500 sm:px-6">
            Unknown block type: {block.type}
          </div>
        );
      }
      return null;
  }
}

function SectionWrap({
  title,
  viewAllUrl,
  viewAllLabel,
  children,
}: {
  title?: string;
  viewAllUrl?: string;
  viewAllLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {(title || viewAllUrl) && (
        <div className="mb-4 flex items-end justify-between">
          {title && <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
          {viewAllUrl && (
            <Link
              href={viewAllUrl}
              className="text-sm font-medium text-primary hover:underline"
            >
              {viewAllLabel} →
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
