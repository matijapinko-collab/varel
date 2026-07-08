"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles, Star } from "lucide-react";
import { buildQuestionFlow, type Answers, type QuizQuestion } from "@/data/quiz-questions";
import { evaluateQuiz, type QuizResult } from "@/lib/quiz-scoring";
import type { AITool } from "@/data/ai-tools";

type Phase = "intro" | "quiz" | "loading" | "result";

/** Fire-and-forget analytics via the existing /api/track collector. */
function track(type: string, event: string, metadata: Record<string, unknown>) {
  try {
    const payload = JSON.stringify({ type, entityType: "QUIZ", path: typeof window !== "undefined" ? window.location.pathname : "", metadata: { event, ...metadata } });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", payload);
    else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function AIToolFinder({ locale }: { locale: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);

  const flow = useMemo(() => buildQuestionFlow(answers), [answers]);
  const clampedIndex = Math.min(index, flow.length - 1);
  const question = flow[clampedIndex];

  function start() {
    track("PAGE_VIEW", "quiz_started", { locale, page: "ai-tool-finder" });
    setPhase("quiz");
    setIndex(0);
  }

  function choose(q: QuizQuestion, optKey: string) {
    setAnswers((prev) => {
      const current = prev[q.key] ?? [];
      let next: string[];
      if (q.multi) next = current.includes(optKey) ? current.filter((k) => k !== optKey) : [...current, optKey];
      else next = [optKey];
      return { ...prev, [q.key]: next };
    });
    track("TOOL_VIEW", "quiz_question_answered", { question_key: q.key, answer_key: optKey, step_number: clampedIndex + 1 });
  }

  function next() {
    if (clampedIndex >= flow.length - 1) {
      finish();
      return;
    }
    setIndex(clampedIndex + 1);
  }
  function back() {
    if (clampedIndex === 0) { setPhase("intro"); return; }
    setIndex(clampedIndex - 1);
  }

  function finish() {
    setPhase("loading");
    const res = evaluateQuiz(answers);
    setResult(res);
    track("TOOL_VIEW", "quiz_completed", {
      result_template_id: res.template.id,
      primary_goal: answers.primary_goal?.[0] ?? "",
      budget: answers.budget?.[0] ?? "",
      skill_level: answers.skill_level?.[0] ?? "",
      match_confidence: res.confidence,
    });
    setTimeout(() => setPhase("result"), 1600);
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setPhase("intro");
  }

  if (phase === "intro") {
    return (
      <div className="rounded-card border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-soft text-primary">
          <Sparkles size={22} />
        </div>
        <h2 className="mt-4 text-2xl font-bold">Ready to find your AI tools?</h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Answer up to 14 quick questions. Varel matches your answers with a curated AI tool database — no account needed.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={start} className="rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90">
            Start the quiz
          </button>
          <Link href={`/${locale}/tools`} className="rounded-full border border-border px-6 py-3 text-base font-medium hover:border-primary hover:text-primary">
            Browse all AI tools
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted">Takes less than 2 minutes · No AI generation · Free</p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="rounded-card border border-border bg-card p-12 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-soft border-t-primary" />
        <p className="mt-4 font-medium">Matching your answers with the best AI tools…</p>
        <p className="mt-1 text-sm text-muted">Scoring the tool database against your goal, budget and skill level.</p>
      </div>
    );
  }

  if (phase === "result" && result) {
    return <ResultView result={result} locale={locale} onRestart={restart} />;
  }

  // quiz phase
  const selected = answers[question.key] ?? [];
  const canProceed = question.optional || question.multi || selected.length > 0;
  const progress = Math.round(((clampedIndex + 1) / flow.length) * 100);

  return (
    <div className="rounded-card border border-border bg-card p-6 sm:p-8">
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
          <span>Step {clampedIndex + 1} of {flow.length}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h2 className="text-xl font-bold sm:text-2xl">{question.title}</h2>
      {question.helper && <p className="mt-1 text-sm text-muted">{question.helper}</p>}

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {question.options.map((opt) => {
          const on = selected.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => choose(question, opt.key)}
              className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left text-sm transition-colors ${
                on ? "border-primary bg-soft text-primary" : "border-border hover:border-primary/50 hover:bg-background-secondary"
              }`}
            >
              <span className="font-medium">{opt.label}</span>
              {on && <Check size={16} className="shrink-0" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={back} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-3">
          {question.optional && (
            <button onClick={next} className="text-sm text-muted hover:text-foreground">Skip</button>
          )}
          <button
            onClick={next}
            disabled={!canProceed}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            {clampedIndex >= flow.length - 1 ? "See my results" : "Next"} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Result view ---------------- */

function ResultView({ result, locale, onRestart }: { result: QuizResult; locale: string; onRestart: () => void }) {
  const { template, confidence } = result;
  const confColor = confidence >= 85 ? "text-green-600" : confidence >= 70 ? "text-primary" : "text-amber-600";

  return (
    <div className="space-y-8">
      {/* Top */}
      <div className="rounded-card border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Your AI Tool Match</span>
          <span className={`text-2xl font-bold ${confColor}`}>{confidence}% match</span>
        </div>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{template.title}</h2>
        <p className="mt-1 text-muted">{template.subtitle}</p>
        <p className="mt-4 text-sm">{template.matchSummary}</p>
        {confidence < 65 && (
          <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            Your answers were broad, so this is a safe starter recommendation. You can retake the quiz with a more specific goal for a sharper result.
          </p>
        )}
      </div>

      {/* Best overall */}
      <ToolSection title="Best overall match" tools={result.bestOverall} locale={locale} templateId={template.id} highlight />

      <div className="grid gap-6 lg:grid-cols-2">
        <ToolSection title="Best budget / free option" tools={result.budgetAlternatives} locale={locale} templateId={template.id} compact />
        <ToolSection title="Best advanced / pro option" tools={result.advancedAlternatives} locale={locale} templateId={template.id} compact />
      </div>

      {result.complementary.length > 0 && (
        <ToolSection title="Complementary tools" tools={result.complementary} locale={locale} templateId={template.id} compact />
      )}

      {/* Recommended stack */}
      <div className="rounded-card border border-border bg-card p-6">
        <h3 className="text-lg font-bold">{template.recommendedStackTitle}</h3>
        <p className="mt-2 text-sm text-muted">{template.recommendedStackDescription}</p>
        <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
          {template.whyThisFits.map((w) => (
            <li key={w} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-green-600" />{w}</li>
          ))}
        </ul>
      </div>

      {/* First workflow */}
      <div className="rounded-card border border-border bg-card p-6">
        <h3 className="text-lg font-bold">{template.firstWorkflowTitle}</h3>
        <ol className="mt-3 space-y-2 text-sm">
          {template.firstWorkflowSteps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-soft text-xs font-bold text-primary">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Avoid */}
      {result.avoid.length > 0 && (
        <div className="rounded-card border border-border bg-card p-6">
          <h3 className="text-lg font-bold">Tools you probably do not need yet</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {result.avoid.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-muted">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <span><span className="font-medium text-foreground">{t.name}</span> — {t.avoidCopy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning */}
      {template.warning && (
        <div className="rounded-card border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800">{template.warning}</div>
      )}

      {/* Email capture */}
      <EmailCapture locale={locale} templateId={template.id} primaryGoal={template.relatedContentTags[0] ?? ""} />

      <div className="flex flex-wrap gap-3">
        <button onClick={onRestart} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-primary hover:text-primary">Retake the quiz</button>
        <Link href={`/${locale}/tools`} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Browse all AI tools</Link>
      </div>

      <p className="text-center text-xs text-muted">
        Varel may earn a commission if you buy through some links. This does not change our recommendations.
      </p>
    </div>
  );
}

function ToolSection({ title, tools, locale, templateId, highlight, compact }: { title: string; tools: AITool[]; locale: string; templateId: string; highlight?: boolean; compact?: boolean }) {
  if (tools.length === 0) return null;
  return (
    <section>
      <h3 className="mb-3 text-lg font-bold">{title}</h3>
      <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {tools.map((t) => <ToolCard key={t.id} tool={t} locale={locale} templateId={templateId} highlight={highlight} />)}
      </div>
    </section>
  );
}

function ToolCard({ tool, locale, templateId, highlight }: { tool: AITool; locale: string; templateId: string; highlight?: boolean }) {
  const affiliate = Boolean(tool.affiliateUrl);
  const primaryHref = tool.affiliateUrl || tool.directUrl || `/${locale}/tools`;
  const primaryLabel = affiliate ? `Try ${tool.name}` : `View ${tool.name}`;

  const onClick = (buttonType: string) => {
    track("OUTBOUND_CLICK", "quiz_tool_clicked", { tool_id: tool.id, result_template_id: templateId, button_type: buttonType, affiliate });
    if (affiliate) track("AFFILIATE_CLICK", "quiz_tool_clicked", { tool_id: tool.id, result_template_id: templateId, affiliate: true });
  };

  return (
    <div className={`flex flex-col rounded-card border bg-card p-5 ${highlight ? "border-primary/40" : "border-border"}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft text-sm font-bold text-primary">
          {tool.name.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{tool.name}</div>
          <div className="truncate text-xs text-muted">{tool.category}</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">{tool.recommendationCopy}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-background-secondary px-2 py-0.5 capitalize text-muted">{tool.pricingTier}</span>
        <span className="rounded-full bg-background-secondary px-2 py-0.5 capitalize text-muted">{tool.skillFit}</span>
        {tool.varelScore != null && tool.varelScore >= 8 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary"><Star size={10} className="fill-current" /> Varel pick</span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={primaryHref}
          target={affiliate ? "_blank" : undefined}
          rel={affiliate ? "nofollow sponsored noopener" : undefined}
          onClick={() => onClick("primary")}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {primaryLabel}
        </a>
        {tool.internalReviewUrl && (
          <Link href={tool.internalReviewUrl} onClick={() => onClick("review")} className="rounded-full border border-border px-3 py-2 text-sm hover:border-primary">Read review</Link>
        )}
        {tool.internalComparisonUrls && tool.internalComparisonUrls.length > 0 && (
          <Link href={tool.internalComparisonUrls[0]} onClick={() => onClick("compare")} className="rounded-full border border-border px-3 py-2 text-sm hover:border-primary">Compare</Link>
        )}
      </div>
    </div>
  );
}

function EmailCapture({ locale, templateId, primaryGoal }: { locale: string; templateId: string; primaryGoal: string }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !consent) return;
    track("TOOL_VIEW", "quiz_email_submitted", { result_template_id: templateId, primary_goal: primaryGoal });
    try {
      await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, locale, source: "ai_tool_finder" }) });
    } catch {
      /* non-blocking */
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-card border border-green-500/30 bg-green-500/5 p-6 text-center text-sm font-medium text-green-700">
        Done. Your AI tool recommendation has been sent.
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-card p-6">
      <h3 className="text-lg font-bold">Want your AI stack sent to your inbox?</h3>
      <p className="mt-1 text-sm text-muted">We can also send occasional AI tool updates and deal alerts. No spam.</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
        <button type="submit" disabled={!consent} className="h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">Send my AI stack</button>
      </form>
      <label className="mt-2 flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        I agree to receive emails from Varel and accept the privacy policy.
      </label>
    </div>
  );
}
