"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronUp, ChevronDown, Plus, X } from "lucide-react";
import { RichTextEditor } from "./rich-text-editor";
import { RevisionsPanel, type RevisionItem } from "./revisions-panel";
import { postPath } from "@/lib/post-url";
import { savePost, autosavePost, trashPost, type PostSaveInput } from "@/server/actions/posts";
import {
  contentChecks,
  seoChecks,
  llmChecks,
  moduleChecks,
  score,
  blockingIssues,
  type PostSnapshot,
  type Check,
} from "@/lib/post-validation";

type StrList = string[];
type Faq = { question: string; answer: string };
type Source = { title: string; url: string; note?: string };

export type PostEditorData = {
  id: string;
  languageId: string;
  languageCode: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  focusKeyword: string;
  status: string;
  featuredImageId: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  author: string;
  authorProfileId: string | null;
  primaryCategoryId: string | null;
  secondaryCategoryIds: StrList;
  seo: {
    metaTitle: string;
    metaDescription: string;
    secondaryKeywords: StrList;
    canonicalUrl: string;
    ogTitle: string;
    ogDescription: string;
    ogImageId: string | null;
    twitterTitle: string;
    twitterDescription: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
  };
  llm: {
    aiSummary: string;
    directAnswer: string;
    keyTakeaways: StrList;
    bestFor: StrList;
    notIdealFor: StrList;
    mentionedEntityIds: StrList;
    mentionedEntitiesText: string;
    faq: Faq[];
    sources: Source[];
    reviewerId: string | null;
    lastReviewedAt: string | null;
    lastTestedAt: string | null;
    pricingCheckedAt: string | null;
  };
  prosCons: { enabled: boolean; heading: string; intro: string; pros: StrList; cons: StrList };
  comparison: {
    enabled: boolean;
    toolAId: string | null;
    toolBId: string | null;
    heading: string;
    summary: string;
    ctaLabel: string;
    ctaUrl: string;
  };
  verdict: { enabled: boolean; headline: string; summary: string; bestFor: string; skipIf: string; rating: number | null };
};

export type EditorOptions = {
  categories: { id: string; name: string; slug: string }[];
  tools: { id: string; name: string }[];
  reviewers: { id: string; name: string }[];
  authors: { id: string; nameEn: string; nameHr: string; hasPhoto: boolean; hasBio: boolean }[];
  media: { id: string; url: string; name: string }[];
  siteUrl: string;
  revisions: RevisionItem[];
};

const OUTLINE = [
  "Intro / direct answer",
  "What it is",
  "Who it is best for",
  "Main features / key points",
  "Real-world use cases",
  "Pros and cons",
  "Comparison with alternatives",
  "Pricing or availability",
  "FAQ",
  "Final Varel verdict",
];

export function PostEditor({ data, options }: { data: PostEditorData; options: EditorOptions }) {
  const [f, setF] = useState<PostEditorData>(data);
  const [featuredUrl, setFeaturedUrl] = useState(data.featuredImageUrl);
  const [status, setStatus] = useState(data.status);
  // Only override the button's intent when the dropdown was actually changed.
  const [statusTouched, setStatusTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [savedLabel, setSavedLabel] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showMedia, setShowMedia] = useState<null | "featured" | "og">(null);
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPublished = status === "PUBLISHED";
  // A past date publishes immediately — only a future one is a real schedule.
  const schedulesForLater =
    Boolean(f.scheduledAt) && new Date(f.scheduledAt as string).getTime() > Date.now();
  const up = useCallback(<K extends keyof PostEditorData>(key: K, value: PostEditorData[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaveState("unsaved");
  }, []);

  const snapshot: PostSnapshot = useMemo(
    () => ({
      title: f.title,
      slug: f.slug,
      excerpt: f.excerpt,
      body: f.body,
      featuredImageId: f.featuredImageId,
      featuredImageAlt: f.featuredImageAlt,
      primaryCategoryId: f.primaryCategoryId,
      seoTitle: f.seo.metaTitle,
      seoDescription: f.seo.metaDescription,
      focusKeyword: f.focusKeyword,
      canonicalUrl: f.seo.canonicalUrl,
      robotsIndex: f.seo.robotsIndex,
      aiSummary: f.llm.aiSummary,
      directAnswer: f.llm.directAnswer,
      keyTakeaways: f.llm.keyTakeaways,
      bestFor: f.llm.bestFor,
      notIdealFor: f.llm.notIdealFor,
      mentionedEntityIds: f.llm.mentionedEntityIds,
      mentionedEntitiesText: f.llm.mentionedEntitiesText,
      faq: f.llm.faq,
      lastReviewedAt: f.llm.lastReviewedAt,
      reviewerId: f.llm.reviewerId,
      prosConsEnabled: f.prosCons.enabled,
      pros: f.prosCons.pros,
      cons: f.prosCons.cons,
      comparisonEnabled: f.comparison.enabled,
      comparisonToolAId: f.comparison.toolAId,
      comparisonToolBId: f.comparison.toolBId,
    }),
    [f]
  );

  const cChecks = contentChecks(snapshot);
  const sChecks = seoChecks(snapshot);
  const lChecks = llmChecks(snapshot);
  const mChecks = moduleChecks(snapshot);
  const seoScore = score(sChecks);
  const llmScore = score(lChecks);
  const blockers = blockingIssues(snapshot);
  const canPublish = blockers.length === 0;

  function buildInput(action: PostSaveInput["action"]): PostSaveInput {
    return {
      action,
      ...(statusTouched ? { status: status as PostSaveInput["status"] } : {}),
      title: f.title,
      slug: f.slug,
      excerpt: f.excerpt,
      body: f.body,
      focusKeyword: f.focusKeyword,
      scheduledAt: f.scheduledAt || null,
      featuredImageId: f.featuredImageId,
      featuredImageAlt: f.featuredImageAlt,
      primaryCategoryId: f.primaryCategoryId,
      secondaryCategoryIds: f.secondaryCategoryIds,
      authorProfileId: f.authorProfileId,
      seo: f.seo,
      llm: f.llm,
      prosCons: f.prosCons,
      comparison: f.comparison,
      verdict: f.verdict,
    };
  }

  function doSave(action: PostSaveInput["action"]) {
    setBlocked(null);
    setSaveState("saving");
    startTransition(async () => {
      const res = await savePost(data.id, data.languageId, buildInput(action));
      if (!res.ok && res.blocked) {
        setBlocked(res.issues ?? []);
        setSaveState("unsaved");
        setToast(res.message);
        setTimeout(() => setToast(null), 3500);
        return;
      }
      if (res.status) setStatus(res.status);
      setStatusTouched(false);
      setDirty(false);
      setSaveState("saved");
      setSavedLabel(`Saved at ${new Date().toLocaleTimeString()}`);
      setToast(res.message);
      setTimeout(() => setToast(null), 2500);
    });
  }

  // Autosave (drafts only server-side; published keep a local backup).
  const ref = useRef({ f, isPublished, dirty });
  ref.current = { f, isPublished, dirty };
  useEffect(() => {
    const t = setInterval(async () => {
      const s = ref.current;
      if (!s.dirty) return;
      if (s.isPublished) {
        try {
          localStorage.setItem(`post-autosave-${data.id}`, JSON.stringify({ ...s.f, at: Date.now() }));
        } catch {}
        setSavedLabel(`Backed up locally at ${new Date().toLocaleTimeString()}`);
        return;
      }
      setSaveState("saving");
      const res = await autosavePost(data.id, data.languageId, {
        title: s.f.title,
        slug: s.f.slug,
        excerpt: s.f.excerpt,
        body: s.f.body,
      });
      if (res.saved) {
        setDirty(false);
        setSaveState("saved");
        setSavedLabel(`Autosaved at ${new Date(res.at).toLocaleTimeString()}`);
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [data.id, data.languageId]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Posts live under their category, so the permalink follows the selection.
  const selectedCategorySlug =
    options.categories.find((c) => c.id === f.primaryCategoryId)?.slug ?? null;
  const publicPath = postPath(data.languageCode, f.slug, selectedCategorySlug);
  const permalinkPrefix = `/${data.languageCode}/${selectedCategorySlug ?? "guides"}/`;
  // Drafts 404 on the public route, so preview them through a tokenized link.
  const previewHref = isPublished
    ? publicPath
    : `/api/admin/preview/${data.id}?lang=${data.languageCode}`;

  function insertOutline() {
    const html = OUTLINE.map((h) => `<h2>${h}</h2><p></p>`).join("");
    up("body", (f.body || "") + html);
  }

  return (
    <div>
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <Link href="/administracija/posts" className="text-sm text-muted hover:text-primary">← All posts</Link>
        <span className="text-xs text-muted">
          {saveState === "saving" || isPending ? "Saving…" : saveState === "unsaved" ? "Unsaved changes" : savedLabel}
        </span>
      </div>

      {blocked && blocked.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800">
          <p className="font-semibold">Complete required fields before publishing:</p>
          <ul className="mt-1 list-inside list-disc">
            {blocked.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <input
            value={f.title}
            onChange={(e) => up("title", e.target.value)}
            placeholder="Add headline"
            className="w-full rounded-card border border-border bg-card px-4 py-3 text-2xl font-bold outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Permalink:</span>
            <span className="truncate">{options.siteUrl}{permalinkPrefix}</span>
            <input value={f.slug} onChange={(e) => up("slug", e.target.value)} className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs" />
          </div>

          <div className="flex justify-end">
            <button onClick={insertOutline} className="text-xs text-primary hover:underline">+ Insert suggested outline</button>
          </div>
          <RichTextEditor value={f.body} onChange={(html) => up("body", html)} />

          <div>
            <label className="mb-1 block text-sm font-medium">Excerpt</label>
            <textarea value={f.excerpt} onChange={(e) => up("excerpt", e.target.value)} rows={2} className="editor-input" />
          </div>

          {/* Pros / Cons */}
          <Panel title="Pros / Cons" enabled={f.prosCons.enabled} onToggle={(v) => up("prosCons", { ...f.prosCons, enabled: v })}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Heading"><input className="editor-input" value={f.prosCons.heading} placeholder="Pros and Cons" onChange={(e) => up("prosCons", { ...f.prosCons, heading: e.target.value })} /></Field>
              <Field label="Intro"><input className="editor-input" value={f.prosCons.intro} onChange={(e) => up("prosCons", { ...f.prosCons, intro: e.target.value })} /></Field>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <RepeatableList label="Pros" items={f.prosCons.pros} onChange={(v) => up("prosCons", { ...f.prosCons, pros: v })} placeholder="A strength…" />
              <RepeatableList label="Cons" items={f.prosCons.cons} onChange={(v) => up("prosCons", { ...f.prosCons, cons: v })} placeholder="A weakness…" />
            </div>
          </Panel>

          {/* Comparison */}
          <Panel title="Comparison box" enabled={f.comparison.enabled} onToggle={(v) => up("comparison", { ...f.comparison, enabled: v })}>
            <Field label="Heading"><input className="editor-input" value={f.comparison.heading} placeholder="Compare these tools" onChange={(e) => up("comparison", { ...f.comparison, heading: e.target.value })} /></Field>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Tool A">
                <ToolSelect tools={options.tools} value={f.comparison.toolAId} onChange={(v) => up("comparison", { ...f.comparison, toolAId: v })} />
              </Field>
              <Field label="Tool B">
                <ToolSelect tools={options.tools} value={f.comparison.toolBId} onChange={(v) => up("comparison", { ...f.comparison, toolBId: v })} />
              </Field>
            </div>
            {f.comparison.enabled && f.comparison.toolAId && f.comparison.toolAId === f.comparison.toolBId && (
              <p className="mt-1 text-xs text-red-500">Tool A and Tool B must be different.</p>
            )}
            <div className="mt-3">
              <Field label="Summary"><textarea className="editor-input" rows={2} value={f.comparison.summary} onChange={(e) => up("comparison", { ...f.comparison, summary: e.target.value })} /></Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="CTA label"><input className="editor-input" value={f.comparison.ctaLabel} placeholder="Compare full details" onChange={(e) => up("comparison", { ...f.comparison, ctaLabel: e.target.value })} /></Field>
              <Field label="CTA URL"><input className="editor-input" value={f.comparison.ctaUrl} onChange={(e) => up("comparison", { ...f.comparison, ctaUrl: e.target.value })} /></Field>
            </div>
          </Panel>

          {/* SEO */}
          <SectionCard title={`Google SEO (${seoScore}/100)`}>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="truncate text-[13px] text-green-700">{options.siteUrl}{publicPath}</div>
              <div className="truncate text-lg text-blue-800">{f.seo.metaTitle || f.title || "Post title"}</div>
              <div className="line-clamp-2 text-sm text-gray-600">{f.seo.metaDescription || "Add a meta description."}</div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Focus keyword"><input className="editor-input" value={f.focusKeyword} onChange={(e) => up("focusKeyword", e.target.value)} /></Field>
              <Field label={`SEO title (${f.seo.metaTitle.length})`}><input className="editor-input" value={f.seo.metaTitle} onChange={(e) => up("seo", { ...f.seo, metaTitle: e.target.value })} /></Field>
            </div>
            <Field label={`Meta description (${f.seo.metaDescription.length})`}><textarea className="editor-input" rows={2} value={f.seo.metaDescription} onChange={(e) => up("seo", { ...f.seo, metaDescription: e.target.value })} /></Field>
            <div className="mt-3"><RepeatableList label="Secondary keywords" items={f.seo.secondaryKeywords} onChange={(v) => up("seo", { ...f.seo, secondaryKeywords: v })} placeholder="Related keyword…" /></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Canonical URL"><input className="editor-input" value={f.seo.canonicalUrl} onChange={(e) => up("seo", { ...f.seo, canonicalUrl: e.target.value })} /></Field>
              <Field label="OG title"><input className="editor-input" value={f.seo.ogTitle} onChange={(e) => up("seo", { ...f.seo, ogTitle: e.target.value })} /></Field>
            </div>
            <Field label="OG description"><textarea className="editor-input" rows={2} value={f.seo.ogDescription} onChange={(e) => up("seo", { ...f.seo, ogDescription: e.target.value })} /></Field>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Twitter title"><input className="editor-input" value={f.seo.twitterTitle} onChange={(e) => up("seo", { ...f.seo, twitterTitle: e.target.value })} /></Field>
              <Field label="Twitter description"><input className="editor-input" value={f.seo.twitterDescription} onChange={(e) => up("seo", { ...f.seo, twitterDescription: e.target.value })} /></Field>
            </div>
            <div className="mt-3 flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.seo.robotsIndex} onChange={(e) => up("seo", { ...f.seo, robotsIndex: e.target.checked })} /> Index</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.seo.robotsFollow} onChange={(e) => up("seo", { ...f.seo, robotsFollow: e.target.checked })} /> Follow</label>
            </div>
            <CheckList checks={[...cChecks, ...sChecks]} />
          </SectionCard>

          {/* LLM / AI Search */}
          <SectionCard title={`AI Search Optimization (${llmScore}/100)`}>
            <Field label="Short answer summary"><textarea className="editor-input" rows={2} value={f.llm.aiSummary} onChange={(e) => up("llm", { ...f.llm, aiSummary: e.target.value })} /></Field>
            <div className="mt-3"><Field label="Direct answer paragraph"><textarea className="editor-input" rows={3} value={f.llm.directAnswer} onChange={(e) => up("llm", { ...f.llm, directAnswer: e.target.value })} /></Field></div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <RepeatableList label="Key takeaways (min 3)" items={f.llm.keyTakeaways} onChange={(v) => up("llm", { ...f.llm, keyTakeaways: v })} placeholder="A key takeaway…" />
              <div className="space-y-4">
                <RepeatableList label="Best for" items={f.llm.bestFor} onChange={(v) => up("llm", { ...f.llm, bestFor: v })} placeholder="e.g. freelancers" />
                <RepeatableList label="Not ideal for" items={f.llm.notIdealFor} onChange={(v) => up("llm", { ...f.llm, notIdealFor: v })} placeholder="e.g. offline use" />
              </div>
            </div>
            <div className="mt-3">
              <Field label="Tools / entities mentioned">
                <MultiToolSelect tools={options.tools} value={f.llm.mentionedEntityIds} onChange={(v) => up("llm", { ...f.llm, mentionedEntityIds: v })} />
              </Field>
              <div className="mt-2"><Field label="Other entities (comma separated)"><input className="editor-input" value={f.llm.mentionedEntitiesText} onChange={(e) => up("llm", { ...f.llm, mentionedEntitiesText: e.target.value })} /></Field></div>
            </div>
            <div className="mt-3"><FaqEditor faq={f.llm.faq} onChange={(v) => up("llm", { ...f.llm, faq: v })} /></div>
            <div className="mt-3"><SourcesEditor sources={f.llm.sources} onChange={(v) => up("llm", { ...f.llm, sources: v })} /></div>
            <CheckList checks={lChecks} />
          </SectionCard>

          {/* Varel Verdict */}
          <Panel title="Varel Verdict" enabled={f.verdict.enabled} onToggle={(v) => up("verdict", { ...f.verdict, enabled: v })}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Verdict headline"><input className="editor-input" value={f.verdict.headline} onChange={(e) => up("verdict", { ...f.verdict, headline: e.target.value })} /></Field>
              <Field label="Rating (0–5, optional)"><input type="number" min={0} max={5} step={0.1} className="editor-input" value={f.verdict.rating ?? ""} onChange={(e) => up("verdict", { ...f.verdict, rating: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            </div>
            <div className="mt-3"><Field label="Verdict summary"><textarea className="editor-input" rows={3} value={f.verdict.summary} onChange={(e) => up("verdict", { ...f.verdict, summary: e.target.value })} /></Field></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Who should use it"><input className="editor-input" value={f.verdict.bestFor} onChange={(e) => up("verdict", { ...f.verdict, bestFor: e.target.value })} /></Field>
              <Field label="Who should skip it"><input className="editor-input" value={f.verdict.skipIf} onChange={(e) => up("verdict", { ...f.verdict, skipIf: e.target.value })} /></Field>
            </div>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Box title="Publish">
            <div className="space-y-2 text-sm">
              <Row label="Status">
                <select value={status} onChange={(e) => { setStatus(e.target.value); setStatusTouched(true); setDirty(true); }} className="h-8 rounded border border-border bg-background px-2 text-sm">
                  {["DRAFT", "REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"].map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
                </select>
              </Row>
              <Row label="Visibility">
                <select value={f.seo.robotsIndex ? "public" : "private"} onChange={(e) => up("seo", { ...f.seo, robotsIndex: e.target.value === "public" })} className="h-8 rounded border border-border bg-background px-2 text-sm">
                  <option value="public">Public</option>
                  <option value="private">Private (noindex)</option>
                </select>
              </Row>
              <Row label="Publish on">
                <input type="datetime-local" value={f.scheduledAt ?? ""} onChange={(e) => up("scheduledAt", e.target.value)} className="h-8 rounded border border-border bg-background px-2 text-xs" />
              </Row>
              <div className="text-xs text-muted" suppressHydrationWarning>
                Author: {data.author}<br />Last edited: {new Date(data.updatedAt).toLocaleString()}
              </div>
            </div>

            {!canPublish && (
              <p className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700">
                {blockers.length} required field{blockers.length === 1 ? "" : "s"} left before publishing.
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={previewHref} target="_blank" rel="noopener" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary">Preview</a>
              <button onClick={() => doSave("draft")} disabled={isPending} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-50">Save Draft</button>
              {isPublished ? (
                <button onClick={() => doSave("update")} disabled={isPending || !canPublish} title={canPublish ? "" : "Complete required fields"} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">Update</button>
              ) : (
                <button onClick={() => doSave("publish")} disabled={isPending || !canPublish} title={canPublish ? "" : "Complete required fields"} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">{schedulesForLater ? "Schedule" : "Publish"}</button>
              )}
            </div>
            <form action={trashPost.bind(null, data.id)} className="mt-2" onSubmit={(e) => { if (!confirm("Move this post to Trash?")) e.preventDefault(); }}>
              <button type="submit" className="text-xs text-red-500 hover:underline">Move to Trash</button>
            </form>
          </Box>

          <RevisionsPanel revisions={options.revisions} />

          {/* Category */}
          <Box title="Category *">
            <Field label="Primary category (required)">
              <select value={f.primaryCategoryId ?? ""} onChange={(e) => up("primaryCategoryId", e.target.value || null)} className={`editor-input ${f.primaryCategoryId ? "" : "border-amber-400"}`}>
                <option value="">— select —</option>
                {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            {options.categories.length > 1 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted">Secondary categories</summary>
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {options.categories.filter((c) => c.id !== f.primaryCategoryId).map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={f.secondaryCategoryIds.includes(c.id)}
                        onChange={(e) => up("secondaryCategoryIds", e.target.checked ? [...f.secondaryCategoryIds, c.id] : f.secondaryCategoryIds.filter((x) => x !== c.id))}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </details>
            )}
          </Box>

          {/* Featured image */}
          <Box title="Featured image">
            {featuredUrl ? (
              <div className="space-y-2">
                <div className="relative h-32 w-full overflow-hidden rounded-lg border border-border">
                  <Image src={featuredUrl} alt="" fill className="object-cover" unoptimized />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowMedia("featured")} className="text-xs text-primary hover:underline">Replace</button>
                  <button onClick={() => { up("featuredImageId", null); setFeaturedUrl(null); }} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowMedia("featured")} className="w-full rounded-lg border border-dashed border-border py-4 text-sm text-muted hover:border-primary hover:text-primary">Set featured image</button>
            )}
            <div className="mt-2"><Field label="Alt text (required)"><input className={`editor-input ${f.featuredImageAlt ? "" : "border-amber-400"}`} value={f.featuredImageAlt} onChange={(e) => up("featuredImageAlt", e.target.value)} /></Field></div>
          </Box>

          {/* Public author (localized byline) */}
          <Box title="Author">
            {(() => {
              const selected = options.authors.find((x) => x.id === f.authorProfileId) ?? null;
              return (
                <>
                  <Field label="Public author (shown on the article)">
                    <select value={f.authorProfileId ?? ""} onChange={(e) => up("authorProfileId", e.target.value || null)} className="editor-input">
                      <option value="">Default author</option>
                      {options.authors.map((x) => <option key={x.id} value={x.id}>{x.nameEn} / {x.nameHr}</option>)}
                    </select>
                  </Field>
                  {!f.authorProfileId && (
                    <p className="mt-1 text-xs text-muted">No author selected. The default author will be used.</p>
                  )}
                  {selected && (
                    <div className="mt-2 rounded-lg border border-border bg-background-secondary p-2 text-xs">
                      <div><span className="text-muted">EN:</span> {selected.nameEn} · <span className="text-muted">HR:</span> {selected.nameHr}</div>
                      {!selected.hasPhoto && <div className="mt-1 text-amber-600">⚠ Author photo is missing.</div>}
                      {!selected.hasBio && <div className="text-amber-600">⚠ Author short bio is missing.</div>}
                    </div>
                  )}
                  <a href={f.authorProfileId ? `/administracija/authors/${f.authorProfileId}/edit` : "/administracija/authors"} target="_blank" rel="noopener" className="mt-2 inline-block text-xs text-primary hover:underline">Manage authors →</a>
                </>
              );
            })()}
          </Box>

          {/* Reviewer + dates */}
          <Box title="Review & freshness">
            <Field label="Reviewer (required)">
              <select value={f.llm.reviewerId ?? ""} onChange={(e) => up("llm", { ...f.llm, reviewerId: e.target.value || null })} className={`editor-input ${f.llm.reviewerId ? "" : "border-amber-400"}`}>
                <option value="">— select —</option>
                {options.reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <div className="mt-2"><Field label="Last updated (required)"><input type="date" className={`editor-input ${f.llm.lastReviewedAt ? "" : "border-amber-400"}`} value={f.llm.lastReviewedAt ?? ""} onChange={(e) => up("llm", { ...f.llm, lastReviewedAt: e.target.value || null })} /></Field></div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label="Last tested (reviews)"><input type="date" className="editor-input" value={f.llm.lastTestedAt ?? ""} onChange={(e) => up("llm", { ...f.llm, lastTestedAt: e.target.value || null })} /></Field>
              <Field label="Pricing checked (reviews)"><input type="date" className="editor-input" value={f.llm.pricingCheckedAt ?? ""} onChange={(e) => up("llm", { ...f.llm, pricingCheckedAt: e.target.value || null })} /></Field>
            </div>
          </Box>

          <Box title="Completion">
            <div className="flex gap-3">
              <ScorePill label="SEO" value={seoScore} />
              <ScorePill label="AI Search" value={llmScore} />
            </div>
          </Box>
        </div>
      </div>

      {showMedia && (
        <MediaPicker
          media={options.media}
          onClose={() => setShowMedia(null)}
          onPick={(m) => {
            if (showMedia === "featured") { up("featuredImageId", m.id); setFeaturedUrl(m.url); }
            else up("seo", { ...f.seo, ogImageId: m.id });
            setShowMedia(null);
          }}
        />
      )}

      <style>{`.editor-input{width:100%;border:1px solid var(--color-border,#e5e7eb);background:var(--color-background,#fff);border-radius:0.5rem;padding:0.4rem 0.6rem;font-size:0.875rem;outline:none}.editor-input:focus{border-color:var(--color-primary,#2563eb)}`}</style>
    </div>
  );
}

/* ---------- sub-components ---------- */

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">{title}</div>
      <div className="space-y-1 p-4">{children}</div>
    </div>
  );
}

function Panel({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-semibold">{title}</span>
        <label className="flex items-center gap-2 text-xs text-muted">
          Show
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        </label>
      </div>
      {enabled && <div className="p-4">{children}</div>}
    </div>
  );
}

function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
      {checks.map((c) => (
        <li key={c.key} className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${c.status === "pass" ? "bg-green-500" : c.critical ? "bg-red-500" : "bg-amber-500"}`} />
          <span className={c.status === "pass" ? "text-muted" : "text-foreground"}>{c.label}{c.critical && c.status !== "pass" ? " (required)" : ""}</span>
        </li>
      ))}
    </ul>
  );
}

function RepeatableList({ label, items, onChange, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const set = (i: number, v: string) => onChange(items.map((x, idx) => (idx === i ? v : x)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted">{label}</div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1">
            <input className="editor-input" value={it} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
            <button type="button" onClick={() => move(i, -1)} className="text-muted hover:text-foreground"><ChevronUp size={14} /></button>
            <button type="button" onClick={() => move(i, 1)} className="text-muted hover:text-foreground"><ChevronDown size={14} /></button>
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-500"><X size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, ""])} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={12} /> Add</button>
    </div>
  );
}

function FaqEditor({ faq, onChange }: { faq: Faq[]; onChange: (v: Faq[]) => void }) {
  const set = (i: number, patch: Partial<Faq>) => onChange(faq.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted">FAQ (min 2)</div>
      <div className="space-y-2">
        {faq.map((it, i) => (
          <div key={i} className="rounded-lg border border-border p-2">
            <input className="editor-input mb-1" placeholder="Question" value={it.question} onChange={(e) => set(i, { question: e.target.value })} />
            <textarea className="editor-input" rows={2} placeholder="Answer" value={it.answer} onChange={(e) => set(i, { answer: e.target.value })} />
            <button type="button" onClick={() => onChange(faq.filter((_, idx) => idx !== i))} className="mt-1 text-xs text-red-500 hover:underline">Remove</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...faq, { question: "", answer: "" }])} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={12} /> Add FAQ</button>
    </div>
  );
}

function SourcesEditor({ sources, onChange }: { sources: Source[]; onChange: (v: Source[]) => void }) {
  const set = (i: number, patch: Partial<Source>) => onChange(sources.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted">Sources / references (optional)</div>
      <div className="space-y-2">
        {sources.map((it, i) => (
          <div key={i} className="flex gap-1">
            <input className="editor-input" placeholder="Title" value={it.title} onChange={(e) => set(i, { title: e.target.value })} />
            <input className="editor-input" placeholder="URL" value={it.url} onChange={(e) => set(i, { url: e.target.value })} />
            <button type="button" onClick={() => onChange(sources.filter((_, idx) => idx !== i))} className="text-red-500"><X size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...sources, { title: "", url: "" }])} className="mt-1 flex items-center gap-1 text-xs text-primary hover:underline"><Plus size={12} /> Add source</button>
    </div>
  );
}

function ToolSelect({ tools, value, onChange }: { tools: { id: string; name: string }[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <select className="editor-input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">— select tool —</option>
      {tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}

function MultiToolSelect({ tools, value, onChange }: { tools: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="max-h-32 overflow-y-auto rounded-lg border border-border p-2">
      {tools.length === 0 && <p className="text-xs text-muted">No tools in the directory yet.</p>}
      {tools.map((t) => (
        <label key={t.id} className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={value.includes(t.id)} onChange={(e) => onChange(e.target.checked ? [...value, t.id] : value.filter((x) => x !== t.id))} />
          {t.name}
        </label>
      ))}
    </div>
  );
}

function MediaPicker({ media, onPick, onClose }: { media: { id: string; url: string; name: string }[]; onPick: (m: { id: string; url: string; name: string }) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-card border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Select image</h3>
          <Link href="/administracija/media" target="_blank" className="text-xs text-primary hover:underline">Upload in Media Library ↗</Link>
        </div>
        {media.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No media yet. Upload some in the Media Library.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {media.map((m) => (
              <button key={m.id} onClick={() => onPick(m)} className="group overflow-hidden rounded-lg border border-border hover:border-primary">
                <div className="relative h-24 w-full bg-background"><Image src={m.url} alt={m.name} fill className="object-cover" unoptimized /></div>
                <div className="truncate px-1 py-1 text-[10px] text-muted">{m.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">{title}</div>
      <div className="p-4">{children}</div>
    </section>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><span className="text-muted">{label}</span>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-muted">{label}</span>{children}</label>;
}
function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${value >= 70 ? "bg-green-500/15 text-green-600" : value >= 40 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-600"}`}>{value}</div>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
