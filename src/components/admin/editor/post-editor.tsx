"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { RichTextEditor } from "./rich-text-editor";
import { savePost, autosavePost, trashPost, type PostSaveInput } from "@/server/actions/posts";

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
  scheduledAt: string | null;
  publishedAt: string | null;
  updatedAt: string;
  author: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    ogTitle: string;
    ogDescription: string;
    robotsIndex: boolean;
    robotsFollow: boolean;
  };
};

type Media = { id: string; url: string; name: string };

export function PostEditor({
  data,
  media,
  siteUrl,
}: {
  data: PostEditorData;
  media: Media[];
  siteUrl: string;
}) {
  const [title, setTitle] = useState(data.title);
  const [slug, setSlug] = useState(data.slug);
  const [body, setBody] = useState(data.body);
  const [excerpt, setExcerpt] = useState(data.excerpt);
  const [focusKeyword, setFocusKeyword] = useState(data.focusKeyword);
  const [status, setStatus] = useState(data.status);
  const [featuredImageId, setFeaturedImageId] = useState(data.featuredImageId);
  const [featuredImageUrl, setFeaturedImageUrl] = useState(data.featuredImageUrl);
  const [scheduledAt, setScheduledAt] = useState(data.scheduledAt ?? "");
  const [seo, setSeo] = useState(data.seo);

  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "unsaved">("idle");
  const [savedLabel, setSavedLabel] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showMedia, setShowMedia] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isPublished = status === "PUBLISHED";

  const markDirty = () => {
    setDirty(true);
    setSaveState("unsaved");
  };

  const buildInput = useCallback(
    (action: PostSaveInput["action"]): PostSaveInput => ({
      title,
      slug,
      excerpt,
      body,
      focusKeyword,
      action,
      scheduledAt: scheduledAt || null,
      featuredImageId,
      seo,
    }),
    [title, slug, excerpt, body, focusKeyword, scheduledAt, featuredImageId, seo]
  );

  const doSave = (action: PostSaveInput["action"]) => {
    setSaveState("saving");
    startTransition(async () => {
      const res = await savePost(data.id, data.languageId, buildInput(action));
      setStatus(res.status);
      setDirty(false);
      setSaveState("saved");
      setSavedLabel(`Saved at ${new Date().toLocaleTimeString()}`);
      setToast(res.message);
      setTimeout(() => setToast(null), 2500);
    });
  };

  // Autosave every 30s when there are unsaved changes.
  const stateRef = useRef({ title, slug, excerpt, body, isPublished, dirty });
  stateRef.current = { title, slug, excerpt, body, isPublished, dirty };
  useEffect(() => {
    const interval = setInterval(async () => {
      const s = stateRef.current;
      if (!s.dirty) return;
      if (s.isPublished) {
        // Never overwrite live content — keep a local backup only.
        try {
          localStorage.setItem(
            `post-autosave-${data.id}`,
            JSON.stringify({ title: s.title, slug: s.slug, excerpt: s.excerpt, body: s.body, at: Date.now() })
          );
        } catch {
          /* ignore */
        }
        setSavedLabel(`Backed up locally at ${new Date().toLocaleTimeString()}`);
        return;
      }
      setSaveState("saving");
      const res = await autosavePost(data.id, data.languageId, {
        title: s.title,
        slug: s.slug,
        excerpt: s.excerpt,
        body: s.body,
      });
      if (res.saved) {
        setDirty(false);
        setSaveState("saved");
        setSavedLabel(`Autosaved at ${new Date(res.at).toLocaleTimeString()}`);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [data.id, data.languageId]);

  // Warn on unload with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const publicPath = `/${data.languageCode}/guides/${slug}`;
  const seoTitle = seo.metaTitle || title;
  const checks = runSeoChecks({ title, seoTitle, metaDescription: seo.metaDescription, focusKeyword, body, featuredImageId });
  const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);

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

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="min-w-0 space-y-4">
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); markDirty(); }}
            placeholder="Add title"
            className="w-full rounded-card border border-border bg-card px-4 py-3 text-2xl font-bold outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2 text-sm text-muted">
            <span>Permalink:</span>
            <span className="truncate">{siteUrl}/{data.languageCode}/guides/</span>
            <input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); markDirty(); }}
              className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs"
            />
          </div>

          <RichTextEditor value={body} onChange={(html) => { setBody(html); markDirty(); }} />

          <div>
            <label className="mb-1 block text-sm font-medium">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => { setExcerpt(e.target.value); markDirty(); }}
              rows={2}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* SEO box */}
          <SeoBox
            seo={seo}
            setSeo={(v) => { setSeo(v); markDirty(); }}
            focusKeyword={focusKeyword}
            setFocusKeyword={(v) => { setFocusKeyword(v); markDirty(); }}
            title={title}
            googleUrl={`${siteUrl}${publicPath}`}
            checks={checks}
            score={score}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Box title="Publish">
            <div className="space-y-2 text-sm">
              <Row label="Status">
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); markDirty(); }}
                  className="h-8 rounded border border-border bg-background px-2 text-sm"
                >
                  {["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].map((s) => (
                    <option key={s} value={s}>{s.toLowerCase()}</option>
                  ))}
                </select>
              </Row>
              <Row label="Visibility">
                <select
                  value={seo.robotsIndex ? "public" : "private"}
                  onChange={(e) => { setSeo({ ...seo, robotsIndex: e.target.value === "public" }); markDirty(); }}
                  className="h-8 rounded border border-border bg-background px-2 text-sm"
                >
                  <option value="public">Public</option>
                  <option value="private">Private (noindex)</option>
                </select>
              </Row>
              <Row label="Publish on">
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => { setScheduledAt(e.target.value); markDirty(); }}
                  className="h-8 rounded border border-border bg-background px-2 text-xs"
                />
              </Row>
              <div className="text-xs text-muted" suppressHydrationWarning>
                Author: {data.author}
                <br />
                Last edited: {new Date(data.updatedAt).toLocaleString()}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link href={publicPath} target="_blank" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary">
                Preview
              </Link>
              <button
                onClick={() => doSave("draft")}
                disabled={isPending}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-50"
              >
                Save Draft
              </button>
              {isPublished ? (
                <button
                  onClick={() => doSave("update")}
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  Update
                </button>
              ) : (
                <button
                  onClick={() => doSave("publish")}
                  disabled={isPending}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {scheduledAt ? "Schedule" : "Publish"}
                </button>
              )}
            </div>
            <form
              action={trashPost.bind(null, data.id)}
              className="mt-2"
              onSubmit={(e) => { if (!confirm("Move this post to Trash?")) e.preventDefault(); }}
            >
              <button type="submit" className="text-xs text-red-500 hover:underline">Move to Trash</button>
            </form>
          </Box>

          <Box title="Featured image">
            {featuredImageUrl ? (
              <div className="space-y-2">
                <div className="relative h-32 w-full overflow-hidden rounded-lg border border-border">
                  <Image src={featuredImageUrl} alt="" fill className="object-cover" unoptimized />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowMedia(true)} className="text-xs text-primary hover:underline">Replace</button>
                  <button
                    onClick={() => { setFeaturedImageId(null); setFeaturedImageUrl(null); markDirty(); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowMedia(true)}
                className="w-full rounded-lg border border-dashed border-border py-4 text-sm text-muted hover:border-primary hover:text-primary"
              >
                Set featured image
              </button>
            )}
          </Box>

          <Box title="SEO score">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${score >= 70 ? "bg-green-500/15 text-green-600" : score >= 40 ? "bg-amber-500/15 text-amber-600" : "bg-red-500/15 text-red-600"}`}>
                {score}
              </div>
              <span className="text-xs text-muted">{score >= 70 ? "Good" : score >= 40 ? "Needs work" : "Poor"}</span>
            </div>
          </Box>
        </div>
      </div>

      {showMedia && (
        <MediaPicker
          media={media}
          onClose={() => setShowMedia(false)}
          onPick={(m) => { setFeaturedImageId(m.id); setFeaturedImageUrl(m.url); markDirty(); setShowMedia(false); }}
        />
      )}
    </div>
  );
}

type Check = { label: string; pass: boolean };
function runSeoChecks(p: {
  title: string; seoTitle: string; metaDescription: string; focusKeyword: string; body: string; featuredImageId: string | null;
}): Check[] {
  const kw = p.focusKeyword.trim().toLowerCase();
  const intro = p.body.replace(/<[^>]+>/g, " ").slice(0, 300).toLowerCase();
  return [
    { label: "SEO title 30–60 characters", pass: p.seoTitle.length >= 30 && p.seoTitle.length <= 60 },
    { label: "Meta description 50–160 characters", pass: p.metaDescription.length >= 50 && p.metaDescription.length <= 160 },
    { label: "Focus keyword in title", pass: Boolean(kw) && p.seoTitle.toLowerCase().includes(kw) },
    { label: "Focus keyword in intro", pass: Boolean(kw) && intro.includes(kw) },
    { label: "Featured image set", pass: p.featuredImageId != null },
    { label: "Has an H2 heading", pass: /<h2[\s>]/i.test(p.body) },
    { label: "Contains an internal link", pass: /<a\s[^>]*href=["']\/(?!\/)/i.test(p.body) },
  ];
}

function SeoBox({
  seo, setSeo, focusKeyword, setFocusKeyword, title, googleUrl, checks, score,
}: {
  seo: PostEditorData["seo"];
  setSeo: (v: PostEditorData["seo"]) => void;
  focusKeyword: string;
  setFocusKeyword: (v: string) => void;
  title: string;
  googleUrl: string;
  checks: Check[];
  score: number;
}) {
  const upd = (patch: Partial<PostEditorData["seo"]>) => setSeo({ ...seo, ...patch });
  return (
    <div className="rounded-card border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold">Search Engine Optimization ({score}/100)</div>
      <div className="space-y-3 p-4">
        {/* Google preview */}
        <div className="rounded-lg border border-border bg-background p-3">
          <div className="truncate text-[13px] text-green-700">{googleUrl}</div>
          <div className="truncate text-lg text-blue-800">{seo.metaTitle || title || "Post title"}</div>
          <div className="line-clamp-2 text-sm text-gray-600">{seo.metaDescription || "Add a meta description to control how this post appears in search results."}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Focus keyword">
            <input value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} className="editor-input" />
          </Field>
          <Field label={`SEO title (${(seo.metaTitle || "").length})`}>
            <input value={seo.metaTitle} onChange={(e) => upd({ metaTitle: e.target.value })} className="editor-input" />
          </Field>
        </div>
        <Field label={`Meta description (${(seo.metaDescription || "").length})`}>
          <textarea value={seo.metaDescription} onChange={(e) => upd({ metaDescription: e.target.value })} rows={2} className="editor-input" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Canonical URL"><input value={seo.canonicalUrl} onChange={(e) => upd({ canonicalUrl: e.target.value })} className="editor-input" /></Field>
          <Field label="OG title"><input value={seo.ogTitle} onChange={(e) => upd({ ogTitle: e.target.value })} className="editor-input" /></Field>
        </div>
        <Field label="OG description"><textarea value={seo.ogDescription} onChange={(e) => upd({ ogDescription: e.target.value })} rows={2} className="editor-input" /></Field>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={seo.robotsIndex} onChange={(e) => upd({ robotsIndex: e.target.checked })} /> Index</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={seo.robotsFollow} onChange={(e) => upd({ robotsFollow: e.target.checked })} /> Follow</label>
        </div>

        <ul className="space-y-1 border-t border-border pt-3 text-xs">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${c.pass ? "bg-green-500" : "bg-amber-500"}`} />
              <span className={c.pass ? "text-muted" : "text-foreground"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
      <style>{`.editor-input{width:100%;border:1px solid var(--color-border,#e5e7eb);background:var(--color-background,#fff);border-radius:0.5rem;padding:0.4rem 0.6rem;font-size:0.875rem;outline:none}.editor-input:focus{border-color:var(--color-primary,#2563eb)}`}</style>
    </div>
  );
}

function MediaPicker({ media, onPick, onClose }: { media: Media[]; onPick: (m: Media) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-card border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Select featured image</h3>
          <Link href="/administracija/media" target="_blank" className="text-xs text-primary hover:underline">Upload in Media Library ↗</Link>
        </div>
        {media.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No media yet. Upload some in the Media Library.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {media.map((m) => (
              <button key={m.id} onClick={() => onPick(m)} className="group overflow-hidden rounded-lg border border-border hover:border-primary">
                <div className="relative h-24 w-full bg-background">
                  <Image src={m.url} alt={m.name} fill className="object-cover" unoptimized />
                </div>
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
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
