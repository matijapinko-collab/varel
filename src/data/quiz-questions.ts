/**
 * AI Tool Finder quiz questions (English MVP).
 * Answers add `tags`; the deterministic scoring engine matches those tags
 * against the static tool database. No AI/LLM API is involved.
 */

export type QuizOption = {
  key: string;
  label: string;
  helper?: string;
  tags: string[];
};

export type Answers = Record<string, string[]>;

export type QuizQuestion = {
  key: string;
  title: string;
  helper?: string;
  multi?: boolean;
  optional?: boolean;
  options: QuizOption[];
  /** Conditional questions render only when this returns true. */
  showIf?: (a: Answers) => boolean;
};

export const CORE_QUESTIONS: QuizQuestion[] = [
  {
    key: "primary_goal",
    title: "What do you mainly want to use AI for?",
    helper: "Pick the closest option. You can refine this later.",
    options: [
      { key: "writing", label: "Writing and content creation", tags: ["writing", "content", "copywriting"] },
      { key: "seo", label: "SEO and ranking on Google", tags: ["seo", "content_optimization", "keyword_research"] },
      { key: "research", label: "Research and fact-finding", tags: ["research", "citations", "web_search"] },
      { key: "coding", label: "Coding and software development", tags: ["coding", "developer", "code_assistant"] },
      { key: "app_builder", label: "Building an app or website without coding", tags: ["app_builder", "no_code", "startup"] },
      { key: "marketing", label: "Marketing and ads", tags: ["marketing", "ads", "campaigns"] },
      { key: "sales", label: "Sales and outreach", tags: ["sales", "gtm", "outreach"] },
      { key: "image_design", label: "Image generation and design", tags: ["image_generation", "design", "visuals"] },
      { key: "video", label: "Video creation and editing", tags: ["video", "editing", "creative_production"] },
      { key: "audio", label: "Voice, audio or podcasting", tags: ["audio", "voice", "podcast"] },
      { key: "automation", label: "Automation and workflows", tags: ["automation", "workflow", "integrations"] },
      { key: "productivity", label: "Productivity, notes and daily work", tags: ["productivity", "notes", "assistant"] },
      { key: "presentations", label: "Presentations and documents", tags: ["presentations", "documents", "business_docs"] },
      { key: "customer_support", label: "Customer support", tags: ["customer_support", "chatbot", "support_automation"] },
      { key: "not_sure", label: "I am not sure yet", tags: ["general_ai", "beginner", "exploration"] },
    ],
  },
  {
    key: "user_type",
    title: "Who are you choosing the tool for?",
    options: [
      { key: "solo", label: "Just me", tags: ["solo_user"] },
      { key: "small_business", label: "My small business", tags: ["small_business"] },
      { key: "marketing_team", label: "My marketing/content team", tags: ["marketing_team", "team_collaboration"] },
      { key: "dev_team", label: "My development team", tags: ["dev_team", "technical_team"] },
      { key: "agency", label: "My agency", tags: ["agency", "client_work"] },
      { key: "ecommerce", label: "My ecommerce store", tags: ["ecommerce", "ecommerce_stack"] },
      { key: "sales_team", label: "My sales team", tags: ["sales_team"] },
      { key: "student", label: "My school/studies", tags: ["student", "education"] },
      { key: "enterprise", label: "My company/enterprise", tags: ["enterprise", "security", "admin_controls"] },
    ],
  },
  {
    key: "skill_level",
    title: "What is your skill level with AI tools?",
    options: [
      { key: "beginner", label: "Beginner — I want something simple", tags: ["beginner", "easy_ui", "low_learning_curve"] },
      { key: "intermediate", label: "Intermediate — I can learn if it is worth it", tags: ["intermediate"] },
      { key: "advanced", label: "Advanced — I want powerful features", tags: ["advanced", "power_user"] },
      { key: "technical", label: "Technical — I can work with APIs, code or automation logic", tags: ["technical", "api", "developer"] },
    ],
  },
  {
    key: "budget",
    title: "What is your monthly budget?",
    options: [
      { key: "free_only", label: "Free only", tags: ["free_only"] },
      { key: "budget_low", label: "Up to €10/month", tags: ["budget_low"] },
      { key: "budget_standard", label: "Up to €25/month", tags: ["budget_standard"] },
      { key: "budget_pro", label: "Up to €50/month", tags: ["budget_pro"] },
      { key: "budget_business", label: "Up to €100/month", tags: ["budget_business"] },
      { key: "budget_flexible", label: "Budget is not the main issue if the tool is worth it", tags: ["budget_flexible"] },
      { key: "enterprise_budget", label: "Company/enterprise budget", tags: ["enterprise_budget"] },
    ],
  },
  {
    key: "priority",
    title: "What matters most to you?",
    options: [
      { key: "quality", label: "Best quality output", tags: ["quality_first"] },
      { key: "value", label: "Cheapest useful option", tags: ["value_for_money"] },
      { key: "speed", label: "Fastest/easiest to use", tags: ["speed", "ease_of_use"] },
      { key: "advanced", label: "Most advanced features", tags: ["advanced_features"] },
      { key: "collab", label: "Best for team collaboration", tags: ["collaboration"] },
      { key: "privacy", label: "Best privacy/security", tags: ["privacy", "security"] },
      { key: "integrations", label: "Best integrations with other tools", tags: ["integrations"] },
      { key: "europe", label: "Best for Croatian/European users", tags: ["europe", "croatian_language", "gdpr_sensitive"] },
    ],
  },
  {
    key: "web_research_need",
    title: "Do you need AI to browse or verify information from the web?",
    options: [
      { key: "yes", label: "Yes, I need current web information and citations", tags: ["web_search", "citations", "research"] },
      { key: "sometimes", label: "Sometimes, but not always", tags: ["web_optional"] },
      { key: "no", label: "No, I mostly use it for writing, brainstorming or editing", tags: ["offline_workflows"] },
      { key: "unsure", label: "I am not sure", tags: ["general_ai"] },
    ],
  },
  {
    key: "output_type",
    title: "What type of output do you need most often?",
    options: [
      { key: "long_form", label: "Articles, blogs and long-form content", tags: ["long_form_content", "blogging"] },
      { key: "short_form", label: "Short posts, ads, captions and social content", tags: ["short_form_content", "social_media", "ads"] },
      { key: "email", label: "Emails and business messages", tags: ["email_writing", "business_communication"] },
      { key: "code", label: "Code, scripts or technical solutions", tags: ["code_output"] },
      { key: "images", label: "Images, graphics or product visuals", tags: ["visual_output"] },
      { key: "video", label: "Videos, reels or ads", tags: ["video_output"] },
      { key: "audio", label: "Audio, voiceovers or podcasts", tags: ["audio_output"] },
      { key: "docs", label: "Presentations, PDFs or business documents", tags: ["presentation_output", "document_output"] },
      { key: "workflows", label: "Automated workflows", tags: ["workflow_output"] },
      { key: "research", label: "Research summaries and reports", tags: ["research_output"] },
    ],
  },
  {
    key: "usage_frequency",
    title: "How often will you use the tool?",
    options: [
      { key: "light", label: "A few times per month", tags: ["light_usage"] },
      { key: "regular", label: "A few times per week", tags: ["regular_usage"] },
      { key: "daily", label: "Daily", tags: ["daily_usage"] },
      { key: "heavy", label: "Heavy daily use", tags: ["heavy_usage", "power_user"] },
      { key: "team", label: "Team-wide daily use", tags: ["team_usage", "scalable_plan"] },
    ],
  },
  {
    key: "team_features",
    title: "Do you need team features?",
    options: [
      { key: "no", label: "No, solo use is enough", tags: ["solo_user"] },
      { key: "later", label: "Maybe later", tags: ["scalable_plan"] },
      { key: "workspace", label: "Yes, shared workspace", tags: ["team_workspace"] },
      { key: "admin", label: "Yes, roles, permissions and admin controls", tags: ["admin_controls", "enterprise"] },
      { key: "clients", label: "Yes, collaboration with clients", tags: ["agency", "client_collaboration"] },
    ],
  },
  {
    key: "data_sensitivity",
    title: "How sensitive is your data?",
    options: [
      { key: "low", label: "Not sensitive — public/basic content", tags: ["low_sensitivity"] },
      { key: "medium", label: "Somewhat sensitive — business docs, drafts, client work", tags: ["medium_sensitivity"] },
      { key: "high", label: "Very sensitive — customer data, legal, finance, internal company data", tags: ["high_sensitivity", "privacy", "security"] },
      { key: "enterprise", label: "I need enterprise-grade privacy/security", tags: ["enterprise_security", "admin_controls", "compliance"] },
      { key: "unsure", label: "I am not sure", tags: ["privacy_basic"] },
    ],
  },
  {
    key: "existing_stack",
    title: "Which tools do you already use?",
    helper: "Select all that apply.",
    multi: true,
    optional: true,
    options: [
      { key: "google", label: "Google Workspace", tags: ["google_workspace"] },
      { key: "microsoft", label: "Microsoft 365", tags: ["microsoft_365"] },
      { key: "notion", label: "Notion", tags: ["notion_stack"] },
      { key: "slack", label: "Slack", tags: ["slack"] },
      { key: "wordpress", label: "WordPress", tags: ["wordpress"] },
      { key: "ecommerce", label: "Shopify/WooCommerce", tags: ["ecommerce_stack"] },
      { key: "canva", label: "Canva", tags: ["canva_stack"] },
      { key: "figma", label: "Figma", tags: ["figma"] },
      { key: "github", label: "GitHub", tags: ["github"] },
      { key: "zapier", label: "Zapier", tags: ["zapier_stack"] },
      { key: "make", label: "Make", tags: ["make_stack"] },
      { key: "none", label: "I do not care about integrations", tags: ["no_integration_need"] },
    ],
  },
  {
    key: "tool_preference",
    title: "Do you want one all-in-one tool or a small stack?",
    options: [
      { key: "all_in_one", label: "One tool that does many things", tags: ["all_in_one"] },
      { key: "specialized", label: "The best tool for each task", tags: ["specialized_stack"] },
      { key: "simple_start", label: "Start with one tool, upgrade later", tags: ["simple_start", "scalable_plan"] },
      { key: "small_stack", label: "I am okay with 2–3 tools if they work well together", tags: ["small_stack"] },
    ],
  },
  {
    key: "language_support",
    title: "How important is language support?",
    options: [
      { key: "english", label: "English only is fine", tags: ["english_ok"] },
      { key: "croatian", label: "I need strong Croatian support", tags: ["croatian_language"] },
      { key: "multilingual", label: "I need multiple European languages", tags: ["multilingual", "europe"] },
      { key: "translation", label: "I need translation/localization workflows", tags: ["translation", "localization"] },
      { key: "not_important", label: "Not important", tags: ["language_not_important"] },
    ],
  },
  {
    key: "recommendation_style",
    title: "What kind of recommendation do you want?",
    options: [
      { key: "mainstream", label: "Give me the safest mainstream choice", tags: ["mainstream", "low_risk"] },
      { key: "value", label: "Give me the best value-for-money option", tags: ["value_for_money"] },
      { key: "powerful", label: "Give me the most powerful option", tags: ["power_user", "advanced_features"] },
      { key: "beginner", label: "Give me a beginner-friendly option", tags: ["beginner", "easy_ui"] },
      { key: "professional", label: "Give me a professional stack", tags: ["professional_stack"] },
      { key: "free", label: "Give me free tools first", tags: ["free_first"] },
    ],
  },
];

export const CONDITIONAL_QUESTIONS: QuizQuestion[] = [
  {
    key: "seo_goal",
    title: "What is your SEO goal?",
    showIf: (a) => a.primary_goal?.includes("seo") ?? false,
    options: [
      { key: "writing", label: "Write SEO articles faster", tags: ["seo_writing"] },
      { key: "optimize", label: "Optimize existing articles", tags: ["content_optimization"] },
      { key: "keywords", label: "Find keywords and content gaps", tags: ["keyword_research"] },
      { key: "visibility", label: "Track AI search visibility", tags: ["ai_search_visibility"] },
      { key: "full", label: "Build a full SEO workflow", tags: ["seo_full_stack"] },
    ],
  },
  {
    key: "coding_goal",
    title: "What kind of coding help do you need?",
    showIf: (a) => a.primary_goal?.includes("coding") ?? false,
    options: [
      { key: "autocomplete", label: "Code autocomplete inside my editor", tags: ["code_autocomplete"] },
      { key: "codebase", label: "Chat with my codebase", tags: ["codebase_chat"] },
      { key: "apps", label: "Build full apps from prompts", tags: ["app_builder", "vibe_coding"] },
      { key: "debug", label: "Debug and explain code", tags: ["debugging"] },
      { key: "github", label: "Help with GitHub/project workflows", tags: ["github", "developer_workflow"] },
    ],
  },
  {
    key: "build_goal",
    title: "What do you want to build?",
    showIf: (a) => a.primary_goal?.includes("app_builder") ?? false,
    options: [
      { key: "landing", label: "Landing page", tags: ["landing_page_builder"] },
      { key: "web_app", label: "SaaS or web app", tags: ["web_app_builder"] },
      { key: "internal", label: "Internal tool", tags: ["internal_tool"] },
      { key: "ecommerce", label: "Ecommerce tool", tags: ["ecommerce_builder"] },
      { key: "prototype", label: "Prototype/MVP", tags: ["prototype", "startup"] },
    ],
  },
  {
    key: "video_goal",
    title: "What type of video do you need?",
    showIf: (a) => a.primary_goal?.includes("video") ?? false,
    options: [
      { key: "cinematic", label: "AI-generated cinematic/video clips", tags: ["ai_video_generation"] },
      { key: "avatar", label: "Talking avatar videos", tags: ["avatar_video"] },
      { key: "editing", label: "Editing existing footage", tags: ["video_editing"] },
      { key: "social", label: "Social media reels/ads", tags: ["short_video_ads"] },
      { key: "explainer", label: "Product demos/explainers", tags: ["explainer_video"] },
    ],
  },
  {
    key: "automation_goal",
    title: "What kind of automation do you want?",
    showIf: (a) => a.primary_goal?.includes("automation") ?? false,
    options: [
      { key: "simple", label: "Simple app-to-app workflows", tags: ["simple_automation"] },
      { key: "complex", label: "Complex multi-step automations", tags: ["advanced_automation"] },
      { key: "self_hosted", label: "Self-hosted automations", tags: ["self_hosted"] },
      { key: "agents", label: "AI agents/workflows", tags: ["ai_workflows"] },
      { key: "ecommerce", label: "Ecommerce/admin automation", tags: ["ecommerce_automation"] },
    ],
  },
];

/** Builds the ordered active question list for a given set of answers. */
export function buildQuestionFlow(answers: Answers): QuizQuestion[] {
  const conditionals = CONDITIONAL_QUESTIONS.filter((q) => q.showIf?.(answers));
  // Conditional questions appear right after the primary goal question.
  return [CORE_QUESTIONS[0], ...conditionals, ...CORE_QUESTIONS.slice(1)];
}
