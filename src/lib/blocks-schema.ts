/**
 * Page-builder block registry: which block types exist and which editable
 * fields each one has. The admin builder renders friendly form fields from
 * this schema; the public BlockRenderer consumes the stored JSON.
 */

export type BlockFieldKind =
  | "text"
  | "textarea"
  | "html"
  | "lines" // one string per line → string[]
  | "faq" // "Question | Answer" per line → {question, answer}[]
  | "pairs" // "value | label" per line → {value, label}[]
  | "number"
  | "boolean";

export type BlockField = {
  key: string;
  label: string;
  kind: BlockFieldKind;
  target: "content" | "settings";
  hint?: string;
};

export type BlockSchema = {
  type: string;
  label: string;
  description: string;
  fields: BlockField[];
};

export const BLOCK_SCHEMAS: BlockSchema[] = [
  {
    type: "hero",
    label: "Hero",
    description: "Large title, subtitle and search bar.",
    fields: [
      { key: "title", label: "Title", kind: "text", target: "content", hint: "Empty = translated default" },
      { key: "subtitle", label: "Subtitle", kind: "textarea", target: "content" },
      { key: "searchPlaceholder", label: "Search placeholder", kind: "text", target: "content" },
      { key: "suggestedSearches", label: "Suggested searches", kind: "lines", target: "content" },
      { key: "showSearch", label: "Show search bar", kind: "boolean", target: "settings" },
    ],
  },
  {
    type: "search_bar",
    label: "Search bar",
    description: "Standalone search input.",
    fields: [
      { key: "placeholder", label: "Placeholder", kind: "text", target: "content" },
      { key: "suggestedSearches", label: "Suggested searches", kind: "lines", target: "content" },
    ],
  },
  {
    type: "heading",
    label: "Heading",
    description: "Section heading (H1–H3).",
    fields: [
      { key: "text", label: "Text", kind: "text", target: "content" },
      { key: "level", label: "Level (h1/h2/h3)", kind: "text", target: "settings" },
    ],
  },
  {
    type: "paragraph",
    label: "Paragraph",
    description: "Plain text paragraph.",
    fields: [{ key: "text", label: "Text", kind: "textarea", target: "content" }],
  },
  {
    type: "rich_text",
    label: "Rich text",
    description: "Formatted HTML content.",
    fields: [{ key: "html", label: "HTML content", kind: "html", target: "content" }],
  },
  {
    type: "image",
    label: "Image",
    description: "Single image with caption.",
    fields: [
      { key: "url", label: "Image URL", kind: "text", target: "content", hint: "Copy from Media Library" },
      { key: "alt", label: "Alt text", kind: "text", target: "content" },
      { key: "caption", label: "Caption", kind: "text", target: "content" },
      { key: "width", label: "Width (px)", kind: "number", target: "settings" },
      { key: "height", label: "Height (px)", kind: "number", target: "settings" },
    ],
  },
  {
    type: "video",
    label: "Video",
    description: "Embedded video (YouTube/Vimeo embed URL).",
    fields: [
      { key: "url", label: "Embed URL", kind: "text", target: "content" },
      { key: "title", label: "Title", kind: "text", target: "content" },
    ],
  },
  {
    type: "button",
    label: "Button",
    description: "Call-to-action button.",
    fields: [
      { key: "label", label: "Label", kind: "text", target: "content" },
      { key: "url", label: "URL", kind: "text", target: "content" },
      { key: "variant", label: "Style (primary/outline)", kind: "text", target: "settings" },
    ],
  },
  {
    type: "cta",
    label: "CTA section",
    description: "Highlighted call-to-action panel.",
    fields: [
      { key: "title", label: "Title", kind: "text", target: "content" },
      { key: "subtitle", label: "Subtitle", kind: "textarea", target: "content" },
      { key: "buttonLabel", label: "Button label", kind: "text", target: "content" },
      { key: "buttonUrl", label: "Button URL", kind: "text", target: "content" },
    ],
  },
  {
    type: "tool_grid",
    label: "Tool grid",
    description: "Grid of tools from the directory.",
    fields: [
      { key: "title", label: "Section title", kind: "text", target: "content" },
      { key: "viewAllUrl", label: "View-all URL", kind: "text", target: "content" },
      { key: "limit", label: "Number of tools", kind: "number", target: "settings" },
      { key: "featured", label: "Only featured (Editor's picks)", kind: "boolean", target: "settings" },
      { key: "trending", label: "Only trending", kind: "boolean", target: "settings" },
      { key: "categorySlug", label: "Filter by category slug", kind: "text", target: "settings" },
    ],
  },
  {
    type: "category_grid",
    label: "Category grid",
    description: "Grid of tool categories.",
    fields: [
      { key: "title", label: "Section title", kind: "text", target: "content" },
      { key: "limit", label: "Number of categories", kind: "number", target: "settings" },
      { key: "featured", label: "Only featured", kind: "boolean", target: "settings" },
    ],
  },
  {
    type: "latest_articles",
    label: "Latest guides",
    description: "Most recent published guides.",
    fields: [
      { key: "title", label: "Section title", kind: "text", target: "content" },
      { key: "limit", label: "Count", kind: "number", target: "settings" },
    ],
  },
  {
    type: "latest_comparisons",
    label: "Latest comparisons",
    description: "Most recent published comparisons.",
    fields: [
      { key: "title", label: "Section title", kind: "text", target: "content" },
      { key: "limit", label: "Count", kind: "number", target: "settings" },
    ],
  },
  {
    type: "featured_editorial",
    label: "Featured editorial",
    description: "Latest column from The Varel Brief.",
    fields: [{ key: "title", label: "Section title", kind: "text", target: "content" }],
  },
  {
    type: "latest_news",
    label: "Latest news",
    description: "Most recent published news items.",
    fields: [
      { key: "title", label: "Section title", kind: "text", target: "content" },
      { key: "limit", label: "Count", kind: "number", target: "settings" },
    ],
  },
  {
    type: "latest_deals",
    label: "Deals",
    description: "Most recent published deals.",
    fields: [
      { key: "title", label: "Section title", kind: "text", target: "content" },
      { key: "limit", label: "Count", kind: "number", target: "settings" },
    ],
  },
  {
    type: "newsletter",
    label: "Newsletter signup",
    description: "Email capture panel.",
    fields: [
      { key: "title", label: "Title", kind: "text", target: "content" },
      { key: "subtitle", label: "Subtitle", kind: "textarea", target: "content" },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Accordion of questions and answers (with FAQ schema).",
    fields: [
      { key: "title", label: "Title", kind: "text", target: "content" },
      { key: "items", label: "Items", kind: "faq", target: "content", hint: "One per line: Question | Answer" },
    ],
  },
  {
    type: "pros_cons",
    label: "Pros & cons",
    description: "Two-column pros and cons.",
    fields: [
      { key: "pros", label: "Pros", kind: "lines", target: "content" },
      { key: "cons", label: "Cons", kind: "lines", target: "content" },
    ],
  },
  {
    type: "stats",
    label: "Stats",
    description: "Row of headline numbers.",
    fields: [
      { key: "items", label: "Stats", kind: "pairs", target: "content", hint: "One per line: 1200+ | Tools listed" },
    ],
  },
  {
    type: "quote",
    label: "Quote",
    description: "Pull quote with attribution.",
    fields: [
      { key: "text", label: "Quote", kind: "textarea", target: "content" },
      { key: "author", label: "Author", kind: "text", target: "content" },
    ],
  },
  {
    type: "callout",
    label: "Callout",
    description: "Highlighted note box.",
    fields: [{ key: "text", label: "Text", kind: "textarea", target: "content" }],
  },
  {
    type: "affiliate_banner",
    label: "Affiliate disclosure",
    description: "Affiliate disclosure notice.",
    fields: [{ key: "text", label: "Text (empty = default)", kind: "textarea", target: "content" }],
  },
  {
    type: "divider",
    label: "Divider",
    description: "Horizontal line.",
    fields: [],
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Vertical spacing.",
    fields: [{ key: "height", label: "Height (px)", kind: "number", target: "settings" }],
  },
  {
    type: "custom_html",
    label: "Custom HTML",
    description: "Raw HTML for advanced use.",
    fields: [{ key: "html", label: "HTML", kind: "html", target: "content" }],
  },
];

export function getBlockSchema(type: string): BlockSchema | undefined {
  return BLOCK_SCHEMAS.find((s) => s.type === type);
}
