/**
 * Deterministic AI Tool Finder scoring + result selection.
 * 100% static: user answers → tags → weighted tool scores → premade result
 * template → curated stack + confidence. No AI/LLM API anywhere.
 */
import { AI_TOOLS, getTool, type AITool } from "@/data/ai-tools";
import { CORE_QUESTIONS, CONDITIONAL_QUESTIONS, type Answers } from "@/data/quiz-questions";
import { QUIZ_RESULTS_BY_ID, FALLBACK_RESULT, type QuizResultTemplate } from "@/data/quiz-results";

const ALL_QUESTIONS = [...CORE_QUESTIONS, ...CONDITIONAL_QUESTIONS];

/** All tags implied by the selected answers. */
export function collectTags(answers: Answers): Set<string> {
  const tags = new Set<string>();
  for (const q of ALL_QUESTIONS) {
    const chosen = answers[q.key];
    if (!chosen) continue;
    for (const optKey of chosen) {
      const opt = q.options.find((o) => o.key === optKey);
      opt?.tags.forEach((t) => tags.add(t));
    }
  }
  return tags;
}

function tagsFor(questionKey: string, answers: Answers): string[] {
  const q = ALL_QUESTIONS.find((x) => x.key === questionKey);
  const chosen = answers[questionKey] ?? [];
  const out: string[] = [];
  for (const k of chosen) q?.options.find((o) => o.key === k)?.tags.forEach((t) => out.push(t));
  return out;
}

const inter = (a: string[], b: string[]) => a.filter((x) => b.includes(x));

const SKILL_ORDER = { beginner: 0, intermediate: 1, advanced: 2, technical: 3 };

/** Score a single tool for the given answers (deterministic). */
export function scoreTool(tool: AITool, answers: Answers, allTags: Set<string>): number {
  if (!tool.active) return -Infinity;
  let s = 0;

  const primaryGoalTags = tagsFor("primary_goal", answers);
  const budget = answers.budget?.[0] ?? "";
  const skill = answers.skill_level?.[0] ?? "";
  const priorityTags = tagsFor("priority", answers);
  const teamTags = tagsFor("team_features", answers);
  const langTags = tagsFor("language_support", answers);
  const sensitivity = answers.data_sensitivity?.[0] ?? "";
  const web = answers.web_research_need?.[0] ?? "";
  const recStyle = answers.recommendation_style?.[0] ?? "";

  // Primary + secondary (conditional) goal matches.
  if (inter(primaryGoalTags, tool.tags).length > 0) s += 30;
  for (const cq of ["seo_goal", "coding_goal", "build_goal", "video_goal", "automation_goal"]) {
    if (inter(tagsFor(cq, answers), tool.tags).length > 0) s += 15;
  }

  // Generic tag overlap (integrations, output type, usage, etc.).
  const overlap = tool.tags.filter((t) => allTags.has(t)).length;
  s += Math.min(overlap, 6) * 8;

  // Budget
  if (budget && tool.budgetFit.includes(budget)) s += 20;

  // Skill fit
  if (skill && skill in SKILL_ORDER) {
    const userLvl = SKILL_ORDER[skill as keyof typeof SKILL_ORDER];
    const toolLvl = SKILL_ORDER[tool.skillFit];
    if (toolLvl <= userLvl + 1) s += 15;
  }

  // Priority
  if (inter(priorityTags, tool.tags).length > 0) s += 15;

  // Team fit
  if (teamTags.some((t) => t === "team_workspace" || t === "admin_controls") && (tool.teamFit === "team" || tool.teamFit === "enterprise" || tool.teamFit === "all")) s += 8;

  // Language fit
  if (inter(langTags, tool.languageFit).length > 0) s += 8;

  // Privacy fit
  if ((sensitivity === "high" || sensitivity === "enterprise") && (tool.privacyFit === "high" || tool.privacyFit === "enterprise")) s += 10;

  // Editorial + affiliate boost
  s += tool.varelScore ?? 0;
  if (tool.affiliateUrl) s += 3;

  // Recommendation style nudges
  if (recStyle === "free" && tool.hasFreePlan) s += 10;
  if (recStyle === "beginner" && tool.beginnerFriendly) s += 8;
  if ((recStyle === "powerful") && (tool.skillFit === "advanced" || tool.skillFit === "technical")) s += 6;

  // ---- Penalties ----
  if (budget === "free_only" && !tool.hasFreePlan) s -= 100;
  const lowBudget = budget === "budget_low" || budget === "budget_standard";
  if (lowBudget && !tool.budgetFit.includes(budget) && (tool.pricingTier === "paid" || tool.pricingTier === "enterprise")) s -= 25;
  if (skill === "beginner" && (tool.skillFit === "advanced" || tool.skillFit === "technical")) s -= 20;
  if ((sensitivity === "high" || sensitivity === "enterprise") && tool.privacyFit === "low") s -= 20;
  if (web === "yes") {
    const research = ["research", "web_search", "citations", "current_info"];
    if (inter(research, tool.tags).length === 0) s -= 30;
  }
  const wantsNoCode = allTags.has("no_code") || allTags.has("app_builder");
  if (wantsNoCode && tool.skillFit === "technical" && !tool.tags.includes("no_code") && !tool.tags.includes("app_builder")) s -= 25;

  return s;
}

export function rankTools(answers: Answers): { tool: AITool; score: number }[] {
  const allTags = collectTags(answers);
  return AI_TOOLS.map((tool) => ({ tool, score: scoreTool(tool, answers, allTags) }))
    .sort((a, b) => b.score - a.score);
}

const GENERAL_GOALS = ["writing", "productivity", "presentations", "sales", "marketing", "not_sure", "customer_support", "research"];

// When several primary goals are selected, the most specific/actionable one
// drives the result template (tool scoring still uses ALL selected goals' tags).
const GOAL_SPECIFICITY = [
  "seo", "coding", "app_builder", "video", "audio", "automation", "image_design",
  "sales", "research", "presentations", "marketing", "customer_support",
  "productivity", "writing", "not_sure",
];

/** Picks the dominant primary goal from one or more selected goals. */
export function pickPrimaryGoal(goals: string[] | undefined): string {
  if (!goals || goals.length === 0) return "not_sure";
  if (goals.length === 1) return goals[0];
  for (const g of GOAL_SPECIFICITY) if (goals.includes(g)) return g;
  return goals[0];
}

/** Picks a premade result template id deterministically from the answers. */
export function selectTemplateId(answers: Answers): string {
  const goal = pickPrimaryGoal(answers.primary_goal);
  const userType = answers.user_type?.[0] ?? "";
  const lang = answers.language_support?.[0] ?? "";
  const priority = answers.priority?.[0] ?? "";
  const skill = answers.skill_level?.[0] ?? "";
  const recStyle = answers.recommendation_style?.[0] ?? "";
  const codingGoal = answers.coding_goal ?? [];
  const automationGoal = answers.automation_goal ?? [];

  // 1. Strong Croatian / European signal for general business goals.
  const europeSignal = lang === "croatian" || lang === "translation" || priority === "europe";
  if (europeSignal && GENERAL_GOALS.includes(goal)) return "croatian_european_business";

  // 2. Ecommerce store for general goals.
  if (userType === "ecommerce" && ["writing", "marketing", "seo", "productivity", "not_sure", "sales", "image_design", "presentations"].includes(goal)) {
    return "ecommerce_ai_stack";
  }

  // 3. Small business simple stack for generic goals.
  if (userType === "small_business" && ["writing", "productivity", "not_sure"].includes(goal)) {
    return "small_business_simple_stack";
  }

  // 4. Marketing team / agency doing writing or marketing.
  if ((userType === "marketing_team" || userType === "agency") && ["writing", "marketing"].includes(goal)) {
    return "marketing_team_ai_stack";
  }

  // 5. Primary goal mapping.
  switch (goal) {
    case "seo":
      return "seo_content_creator";
    case "research":
      return "research_fact_finding";
    case "coding":
      return codingGoal.includes("apps") ? "no_code_app_builder" : "developer_code_assistant";
    case "app_builder":
      return "no_code_app_builder";
    case "marketing":
      return "marketing_team_ai_stack";
    case "sales":
      return "sales_outreach_user";
    case "image_design":
      return recStyle === "powerful" || priority === "quality" || skill === "advanced" ? "ai_image_creator" : "design_social_creator";
    case "video":
      return "video_creator_ai_stack";
    case "audio":
      return "voice_podcast_creator";
    case "automation":
      return skill === "technical" || automationGoal.includes("self_hosted") || automationGoal.includes("complex")
        ? "advanced_automation_technical"
        : "automation_beginner";
    case "productivity":
      return "productivity_notes_user";
    case "presentations":
      return "presentation_docs_user";
    case "customer_support":
      return "small_business_simple_stack";
    case "writing":
      return "beginner_general_ai";
    case "not_sure":
    default:
      return "__fallback__";
  }
}

export type QuizResult = {
  template: QuizResultTemplate;
  isFallback: boolean;
  confidence: number;
  bestOverall: AITool[];
  budgetAlternatives: AITool[];
  advancedAlternatives: AITool[];
  complementary: AITool[];
  avoid: AITool[];
  topScoredToolId: string;
};

const resolve = (ids: string[]): AITool[] =>
  ids.map((id) => getTool(id)).filter((t): t is AITool => Boolean(t));

/** Full deterministic quiz evaluation. */
export function evaluateQuiz(answers: Answers): QuizResult {
  const ranked = rankTools(answers);
  const templateId = selectTemplateId(answers);
  const isFallback = templateId === "__fallback__";
  const template = isFallback ? FALLBACK_RESULT : QUIZ_RESULTS_BY_ID[templateId] ?? FALLBACK_RESULT;

  // Confidence
  const scoreById = new Map(ranked.map((r) => [r.tool.id, r.score]));
  const strongMatches = Math.min(6, template.bestOverallToolIds.filter((id) => (scoreById.get(id) ?? 0) >= 40).length);
  const primaryGoalBonus = isFallback ? 0 : 10;
  const budget = answers.budget?.[0] ?? "";
  const bestTool = getTool(template.bestOverallToolIds[0]);
  const budgetBonus = bestTool && budget && bestTool.budgetFit.includes(budget) ? 5 : 0;
  let conflictPenalty = 0;
  if (budget === "free_only" && bestTool && !bestTool.hasFreePlan) conflictPenalty += 10;
  if (answers.skill_level?.[0] === "beginner" && bestTool && bestTool.skillFit === "technical") conflictPenalty += 5;
  const confidence = Math.max(40, Math.min(98, 55 + strongMatches * 5 + primaryGoalBonus + budgetBonus - conflictPenalty));

  return {
    template,
    isFallback,
    confidence,
    bestOverall: resolve(template.bestOverallToolIds),
    budgetAlternatives: resolve(template.budgetAlternativeToolIds),
    advancedAlternatives: resolve(template.advancedAlternativeToolIds),
    complementary: resolve(template.complementaryToolIds),
    avoid: resolve(template.avoidToolIds),
    topScoredToolId: ranked[0]?.tool.id ?? "",
  };
}
