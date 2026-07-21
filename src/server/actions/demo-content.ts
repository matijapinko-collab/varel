"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "./helpers";
import { audit } from "@/lib/security";

/**
 * Finds and hides the seeded demo content ([SAMPLE] / [PRIMJER]).
 * Deliberately UNPUBLISHES rather than deletes — the action stays reversible,
 * and nothing the owner authored by hand can be destroyed by a stray click.
 */

export type DemoItem = {
  type: string;
  id: string;
  title: string;
  status: string;
  editPath: string;
};

/** Titles that mark seeded demo rows. */
const MARKERS = ["[SAMPLE]", "[PRIMJER]", "Sample Tool", "Sample Guide", "Demo tool"];

function isDemo(text: string | null | undefined): boolean {
  if (!text) return false;
  return MARKERS.some((m) => text.toLowerCase().includes(m.toLowerCase()));
}

/** Scans every content type. Read-only. */
export async function scanDemoContent(): Promise<DemoItem[]> {
  await requirePermission("content.edit");
  const found: DemoItem[] = [];

  const [tools, articles, editorials, news, comparisons, deals, prompts] = await Promise.all([
    db.tool.findMany({ where: { deletedAt: null }, include: { translations: true } }),
    db.article.findMany({ where: { deletedAt: null }, include: { translations: true } }),
    db.editorialPost.findMany({ include: { translations: true } }),
    db.newsItem.findMany({ include: { translations: true } }),
    db.comparison.findMany({ where: { deletedAt: null }, include: { translations: true } }),
    db.deal.findMany({ include: { translations: true } }),
    db.prompt.findMany({ include: { translations: true } }).catch(() => []),
  ]);

  const push = (type: string, id: string, title: string, status: string, path: string) =>
    found.push({ type, id, title, status, editPath: path });

  for (const x of tools) {
    if (isDemo(x.name) || x.translations.some((t) => isDemo(t.name) || isDemo(t.shortDescription)))
      push("Tool", x.id, x.name, x.status, `/administracija/tools/${x.id}`);
  }
  for (const x of articles) {
    const t = x.translations.find((t) => isDemo(t.title));
    if (t) push("Post", x.id, t.title, x.status, `/administracija/posts/${x.id}/edit`);
  }
  for (const x of editorials) {
    const t = x.translations.find((t) => isDemo(t.title));
    if (t) push("Editorial", x.id, t.title, x.status, `/administracija/editorial/${x.id}`);
  }
  for (const x of news) {
    const t = x.translations.find((t) => isDemo(t.title));
    if (t) push("News", x.id, t.title, x.status, `/administracija/news/${x.id}`);
  }
  for (const x of comparisons) {
    const t = x.translations.find((t) => isDemo(t.title));
    if (t) push("Comparison", x.id, t.title, x.status, `/administracija/comparisons/${x.id}`);
  }
  for (const x of deals) {
    const t = x.translations.find((t) => isDemo(t.title));
    if (t) push("Deal", x.id, t.title, x.status, `/administracija/deals/${x.id}`);
  }
  for (const x of prompts as { id: string; status: string; translations: { title: string }[] }[]) {
    const t = x.translations.find((t) => isDemo(t.title));
    if (t) push("Prompt", x.id, t.title, x.status, `/administracija/prompts/${x.id}`);
  }

  return found;
}

/** Form-action wrapper (a `<form action>` handler must resolve to void). */
export async function hideDemoContentForm(): Promise<void> {
  await hideDemoContent();
}

/** Sets every demo item (and its translations) to DRAFT. Reversible. */
export async function hideDemoContent(): Promise<{ ok: boolean; hidden: number; message: string }> {
  const { userId } = await requirePermission("content.publish");
  const items = await scanDemoContent();
  const byType = (t: string) => items.filter((i) => i.type === t).map((i) => i.id);

  const D = { status: "DRAFT" as const };
  const ids = {
    tools: byType("Tool"), posts: byType("Post"), editorial: byType("Editorial"),
    news: byType("News"), comparisons: byType("Comparison"), deals: byType("Deal"),
    prompts: byType("Prompt"),
  };

  await Promise.all([
    ids.tools.length ? db.tool.updateMany({ where: { id: { in: ids.tools } }, data: D }) : null,
    ids.tools.length ? db.toolTranslation.updateMany({ where: { toolId: { in: ids.tools } }, data: D }) : null,
    ids.posts.length ? db.article.updateMany({ where: { id: { in: ids.posts } }, data: D }) : null,
    ids.posts.length ? db.articleTranslation.updateMany({ where: { articleId: { in: ids.posts } }, data: D }) : null,
    ids.editorial.length ? db.editorialPost.updateMany({ where: { id: { in: ids.editorial } }, data: D }) : null,
    ids.news.length ? db.newsItem.updateMany({ where: { id: { in: ids.news } }, data: D }) : null,
    ids.comparisons.length ? db.comparison.updateMany({ where: { id: { in: ids.comparisons } }, data: D }) : null,
    ids.deals.length ? db.deal.updateMany({ where: { id: { in: ids.deals } }, data: D }) : null,
    ids.prompts.length ? db.prompt.updateMany({ where: { id: { in: ids.prompts } }, data: D }).catch(() => null) : null,
  ]);

  await audit({
    userId, action: "UPDATE", entityType: "SETTINGS", entityId: "demo-content",
    details: { hidden: items.length, types: Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.length])) },
  });

  revalidatePath("/", "layout");
  return { ok: true, hidden: items.length, message: `${items.length} demo items set to draft.` };
}
