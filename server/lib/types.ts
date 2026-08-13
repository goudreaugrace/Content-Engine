// Shared types between server modules and (mirrored client-side via api.ts)

/**
 * Source-article status. Note: there is no "approved" state — approval
 * triggers immediate publish (creating the PublishedArticle and bumping
 * the source to "published" in the same transaction). The source article
 * persists at status="published" as audit history; the live content lives
 * on the PublishedArticle and any further edits happen there.
 */
export type ArticleStatus =
  | "needs-review"
  | "needs-info"
  | "rejected"
  | "published";

export type ContentType = "FAQ" | "Policy" | "Knowledge Article" | "Topic Page";

export type Market = "US" | "MX" | "BR" | "UK" | "IN" | "Global";

export type JobStatus =
  | "intake"
  | "awaiting_clarification"
  | "routing"
  | "drafting"
  | "compliance_review"
  | "revising"
  | "complete"
  | "failed";

export type AgentName =
  | "intake"
  | "clarifier"
  | "router"
  | "market"
  | "compliance"
  | "revision"
  | "consolidation"
  | "migration";

export type TraceEntry = {
  agent: AgentName;
  label: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: "success" | "error";
  output: unknown;
  error?: string;
};

export type JobInput = {
  title: string;
  contentType: ContentType;
  summary: string;
  audience: string;
  /**
   * Legacy single-market field. Kept readable so old jobs in jobs.json still
   * deserialize cleanly. New submissions populate `markets` instead and the
   * server's market reader prefers that array.
   */
  market?: "us" | "mx" | "br" | "uk" | "in" | "both";
  /**
   * Sectors the article is scoped under. Sector is the tier above Market —
   * every article picks at least one sector, and the markets multi-select
   * cascades from the chosen sectors. "global" is a valid sector id
   * meaning "corporate, spans all sectors." Optional in the type only for
   * old jobs.json rows; new submissions always set it.
   */
  sectors?: string[];
  /**
   * Markets the article should be written for. May include "global" as a
   * convenience for "all five markets". Router agent expands "global" before
   * the per-market drafting loop. Required for all new submissions.
   */
  markets: string[];
  sourceText: string;
  /** Final employee-facing article body reviewed by the requester before submission. */
  finalArticleBody?: string;
  submittedBy: { name: string; email: string };
  approver?: { name: string; email: string; role?: string };
  /**
   * ISO country codes the article applies to. Required (≥1) by Phase A
   * validation. Separate dimension from `market` — a US-market article
   * may apply to both US and CA, a Global article tags all relevant countries.
   */
  countries: string[];
  /** SEO metadata captured at submission time. Used by the rules engine and surfaced on the article. */
  seo: ArticleSEO;
  /**
   * Free-text justification required when market === "global". Most articles
   * shouldn't be Global; this gate prevents reflexive Global tagging.
   */
  globalJustification?: string;
  /**
   * Optional: id of an existing article this submission is meant to replace.
   * Set by the duplicate-detection panel (Phase B) when the user picks
   * "Mark as replacement" on a matched article.
   */
  replacesArticleId?: string;
};

export type ArticleSEO = {
  // ── Traditional search (SEO) ──
  /** The SEO title used by search engines / portal listings. Distinct from the article display title. Target 30–60 chars. */
  title: string;
  /** Meta description for search snippets. Target 140–155 chars. */
  metaDescription: string;
  /** Free-form keywords. Markets / audiences may suggest defaults; authors edit. */
  keywords: string[];

  // ── Generative engine discovery (GEO) ──
  // Fields below feed RAG systems and enterprise copilots (Now Assist,
  // M365 Copilot, internal LLMs). All optional — older articles created
  // before this schema extension default to empty values at read time.
  /**
   * 2-3 sentence factual extract that retrieval systems can lift and
   * cite verbatim. Target 200–400 chars. Think of it as the article's
   * "answer snippet" for AI surfaces.
   */
  summary?: string;
  /**
   * Common natural-language questions this article answers. Each entry
   * is a full question (e.g. "How long is maternity leave?"). Improves
   * retrieval chunking — RAG systems score chunks against query intent,
   * and explicit Q&A makes the article retrievable for those exact
   * phrasings.
   */
  keyQuestions?: string[];
  /**
   * Named entities the article authoritatively covers (programs,
   * policies, systems, products). Helps the LLM pick THIS article over
   * a similar one when citing — and downstream layers can emit JSON-LD
   * structured data from this list.
   */
  entities?: string[];
};

export type ArticleReference = {
  id: string;
  title: string;
  kind: "url" | "doc" | "policy" | "profile" | "note";
  url?: string;
  filePath?: string;
  excerpt?: string;
  source?: "submission" | "sector" | "market" | "audience" | "profile" | "reviewer" | "migration";
  addedAt: string;
  addedBy: string;
};

export type ArticleVisibility = {
  audiences: string[];
  markets: string[];
  countries: string[];
  security: "all-employees" | "restricted";
  notes?: string;
};

export type ArticleRevision = {
  version: number;
  at: string;
  by: string;
  summary: string;
  title: string;
  body?: string;
};

export type ArticleTranslation = {
  body: string;
  status: "current" | "stale" | "needs-review";
  sourceVersion: number;
  translatedAt: string;
  translatedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type ArticleTranslations = Record<string, string | ArticleTranslation>;

export type ArticleFeedbackComment = {
  id: string;
  by: string;
  body: string;
  at: string;
};

export type ArticleFeedback = {
  helpful: number;
  notHelpful: number;
  shares: number;
  comments: ArticleFeedbackComment[];
};

export type Job = {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  input: JobInput;
  trace: TraceEntry[];
  articleIds: string[];
  error?: string;
};

export type Article = {
  id: string;
  jobId?: string;
  title: string;
  contentType: ContentType;
  /**
   * Sector id — the tier above Market. All articles created after the
   * sector taxonomy migration have this set. Optional in the type only for
   * older seed rows created before the tier existed; app code backfills
   * from the market's sectorId at read time when missing.
   */
  sector?: string;
  market: Market;
  /** ISO country codes the article applies to. Always present after Phase A;
   * older seed entries get an empty array filled in at read time. */
  countries: string[];
  /** SEO metadata. Always present after Phase A; older seed entries default at read time. */
  seo: ArticleSEO;
  /** If submitted as Global, the author's justification (Phase A gate). */
  globalJustification?: string;
  /** If this submission replaces an existing article (Phase B), the id of the replaced one. */
  replacesArticleId?: string;
  /** Articles deliberately consolidated into this draft. */
  replacesArticleIds?: string[];
  /** Short standalone summary shown above the body, Wikipedia-lead style. */
  lead?: string;
  /** Stable, globally searchable canonical slug. */
  canonicalSlug?: string;
  /** Search aliases / redirects that should resolve to this canonical article. */
  aliases?: string[];
  /** Primary topic tags for categorization and related-content matching. */
  topics?: string[];
  /** Source material this article is grounded in. */
  references?: ArticleReference[];
  /** Related canonical published articles. */
  relatedArticleIds?: string[];
  /** Audience, market, country, and security controls. */
  visibility?: ArticleVisibility;
  owner?: string;
  effectiveAt?: string;
  nextReviewAt?: string;
  approvedBy?: string;
  body: string;
  submittedBy: { name: string; email: string };
  submittedAt: string;
  status: ArticleStatus;
  complianceIssues: ComplianceIssue[];
  reviewedAt?: string;
  reviewer?: string;
  rejectionReason?: string;
  infoNeeded?: string;
  /** Cached translations of the body, keyed by target language code (e.g. "en"). */
  translations?: ArticleTranslations;
  /**
   * Current version number, starting at 1. Incremented every time a rejected
   * article is resubmitted for review. Lets the UI label history entries
   * ("Version 1 was rejected on …") without inferring from array length.
   */
  version?: number;
  /**
   * Append-only log of prior rejections. Each entry snapshots the body that
   * was rejected so reviewers can compare what changed when re-reviewing.
   */
  rejections?: ArticleRejection[];
  /**
   * Phase C: set by the rules engine when an article passes every check at
   * creation time. The review UI shows a "Safe to approve" banner with a
   * one-click confirm. The article still goes through the normal review queue —
   * the reviewer stays in the loop.
   */
  autoApproveCandidate?: boolean;
  /**
   * Phase C: full rules-engine output stored alongside the article so the
   * review UI can render the pass/fail checklist without re-running the rules.
   */
  approvalResults?: ApprovalRuleResult[];
  /**
   * Set during the atomic approve-and-publish transition. References the
   * PublishedArticle that holds the live content. Source articles at
   * status="published" navigate to this id when the user wants to edit.
   */
  publishedArticleId?: string;
};

export type ApprovalRuleResult = {
  id: string;
  label: string;
  severity: "error" | "warning" | "ok";
  reason?: string;
};

export type ArticleRejection = {
  /** ISO timestamp the rejection was recorded. */
  at: string;
  /** Reviewer who rejected this version. */
  by: string;
  /** Reason given at the time of rejection. */
  reason: string;
  /** Version number that was rejected. */
  version: number;
  /** Snapshot of the article body at the moment of rejection. */
  body: string;
};

export type ComplianceIssue = {
  severity: "info" | "warning" | "error";
  category: string;
  message: string;
  /**
   * Phase C: optional H2 section anchor the issue applies to. Matched
   * case-insensitively against the article's `## Heading` text. If absent,
   * the issue is treated as article-wide.
   */
  section?: string;
  /** Phase C: optional verbatim excerpt the issue references. */
  excerpt?: string;
  /**
   * Phase P3.3: reviewer dismissed this issue (and the rules engine should
   * stop counting it as an error). Optional note explains why.
   */
  dismissed?: boolean;
  dismissedBy?: string;
  dismissedAt?: string;
  dismissalNote?: string;
};

/**
 * Sector — the tier above Market in the PepsiCo taxonomy. Sectors group
 * markets by business unit or geography (PFNA, PBNA, LatAm, Europe,
 * AMESA, APAC, Global). The sector profile carries corporate-level
 * guidance that all markets in the sector inherit; individual market
 * profiles add locale-specific rendering rules (language, currency,
 * date format) and can extend the sector's terminology/banned lists.
 *
 * At draft time the market agent receives BOTH profiles: sector strategy
 * comes first in the prompt (corporate framing), market strategy comes
 * second (locale execution). Terminology and banned-term lists are
 * unioned. Language/currency/dateFormat are always market-level.
 */
export type SectorProfile = {
  /** Kebab-case id, e.g. "pfna", "latam", "global". */
  id: string;
  /** Display name shown in admin + article meta (e.g. "PepsiCo Foods NA"). */
  name: string;
  /** One-line summary shown in the sector list. */
  summary?: string;
  /** Tone of voice guidance applied on top of market-level tone. */
  toneOfVoice: string;
  /** Corporate-level content strategy / priorities. */
  contentStrategy: string;
  /** Sector-wide do's and don'ts. Composed with market guidelines. */
  contentGuidelines: string;
  /** Sector-wide terminology mappings; unioned with market terminology. */
  terminology: Record<string, string>;
  /** Sector-wide banned terms; unioned with market bannedTerms. */
  bannedTerms: string[];
  /** Sector-wide regulatory considerations. */
  regulatoryNotes: string;
  /** SEO context that applies to all markets in this sector. */
  seoNotes?: string;
  commonSearchTerms?: string[];
  /** Authoritative reference sources the agent should ground its drafts
   *  in when writing for any market inside this sector. NotebookLM-style
   *  attachment list — URLs, uploaded PDFs, or hand-authored notes. */
  sources?: ProfileSource[];
};

/**
 * A single reference source attached to a profile (sector / market /
 * audience). The agent uses these as authoritative material when
 * drafting content. Modeled loosely after a NotebookLM "source" — one
 * item per attachment, with a title the reviewer can see cited and a
 * body the agent can reason over.
 */
export type ProfileSource = {
  /** Stable id, `src-<uuid>`. */
  id: string;
  /** How the source content is stored. */
  kind: "url" | "pdf" | "doc" | "note";
  /** Human-readable label the reviewer sees ("2026 Ethics Handbook"). */
  title: string;
  /** For kind:"url". */
  url?: string;
  /** For kind:"pdf" | "doc" — server-side blob path under data/source-uploads/. */
  filePath?: string;
  /** Original filename for uploaded files, preserved for display. */
  fileName?: string;
  /**
   * Author-provided or extracted summary the agent reads. For URL/PDF
   * sources this is the primary handle the agent uses at draft time —
   * the file itself isn't parsed in this POC.
   */
  snippet?: string;
  addedAt: string;
  addedBy: string;
};

export type MarketProfile = {
  id: string; // "us", "mx" today — string so we can add markets without refactor
  /**
   * Which sector this market belongs to. Every market has exactly one
   * sector. Optional in the type only to keep older seed rows deserializable
   * before backfill; the app treats missing sectorId as an integrity error.
   */
  sectorId?: string;
  name: string;
  /** Display name of the output language, e.g. "Spanish". Admin-facing. */
  language: string;
  /** Locale code — the parameter the market agent uses to choose output language. */
  languageCode: string;
  /**
   * All locale codes this market makes content available in. Must include
   * the primary `languageCode`. The article-detail view renders one toggle pill
   * per locale here; the translation agent fills in the non-primary languages
   * on demand and caches the result.
   */
  availableLanguages?: string[];
  /** Tone of voice description (authored in English). */
  toneOfVoice: string;
  /** What this market prioritizes, themes, audience considerations (English). */
  contentStrategy: string;
  /** Specific do's/don'ts beyond tone (English). */
  contentGuidelines: string;
  /** source-word -> target-language replacement. */
  terminology: Record<string, string>;
  /** Words the agent must NOT use (in target language). */
  bannedTerms: string[];
  /** Regulatory considerations (English). */
  regulatoryNotes: string;
  dateFormat: string;
  currency: string;
  reviewers: string[];
  /**
   * Phase D — SEO context for this market. Threaded into the market agent's
   * prompt and used by the new-article form to seed defaults.
   */
  seoNotes?: string;
  commonSearchTerms?: string[];
  /** Default ISO country codes for this market — pre-selects the country picker. */
  defaultCountries?: string[];
  /** Market-specific reference sources the agent grounds drafts in.
   *  Combined with the parent sector's sources at draft time. */
  sources?: ProfileSource[];
};

export type AudienceProfile = {
  id: string;
  label: string;
  /** One- or two-sentence persona summary (who they are, what they do). */
  summary: string;
  /** Tone of voice the agent should adopt when writing for this audience. */
  toneOfVoice: string;
  /** How and where this persona consumes content (device, environment, time). */
  readingContext: string;
  /** Specific do's and don'ts for this audience. */
  contentGuidelines: string;
  /**
   * Phase D — what this persona tends to search for. Plain-English description
   * of search intent (e.g. "Drivers search in short bursts on mobile, usually
   * with the route app name + the specific error code."). The market agent
   * uses this when picking SEO-friendly phrasing.
   */
  searchIntent?: string;
  /** Audience-specific reference sources the agent grounds drafts in
   *  when writing for this persona. Composed alongside sector + market
   *  sources at draft time. */
  sources?: ProfileSource[];
};

export type DEExRules = {
  toneRules: string[];
  inclusivityRules: string[];
  accessibilityRules: string[];
  formattingRules: string[];
  characterLimits: {
    title: number;
    summary: number;
    metaDescription: number;
  };
};

export type Country = {
  /** ISO 3166-1 alpha-2 code, uppercase. */
  code: string;
  /** Display name (English). */
  name: string;
  /**
   * Which editorial market this country defaults to. The new-article form
   * uses this to filter the country picker to the "obvious" countries for
   * the selected market by default ("show all" to override).
   */
  defaultMarketId: "us" | "mx" | "br" | "uk" | "in" | "global";
  /** Coarse region grouping for filter UIs. */
  region: "NAM" | "LATAM" | "EMEA" | "APAC";
};

// ─────────────────────────────────────────────────────────────
// Phase E — Published library entity + lifecycle
// ─────────────────────────────────────────────────────────────

/**
 * The previous LifecycleAction enum (review-and-consolidate / convert /
 * archive / delete-and-redirect) was over-engineered for the actual workflow.
 * In practice only "archive" was being used, so the concept collapsed into a
 * single archivedAt timestamp on PublishedArticle that promotes the article
 * to a new "archived" StalenessLevel. If we ever need richer lifecycle
 * states, add specific named flags rather than reviving the action enum.
 */

export type PublishedMetrics = {
  /** Page views in the last 30 days. */
  views30d: number;
  /** Lifetime page views. */
  viewsAllTime: number;
  /** ISO date of the most recent view, if any. */
  lastViewedAt?: string;
  /** Trend direction over the last two 30-day windows. */
  trend: "up" | "flat" | "down";
};

/**
 * "archived" is a terminal level: an admin explicitly took this article out
 * of rotation. The scorer short-circuits any time-based / metric-based
 * computation when archivedAt is set on the article.
 */
export type StalenessLevel = "fresh" | "aging" | "stale" | "archived";

export type Staleness = {
  /** 0 = perfectly fresh, 100 = maximally stale. */
  score: number;
  level: StalenessLevel;
  /** Plain-English reasons surfaced in the UI as bullets. */
  reasons: string[];
};

export type PublishedArticle = {
  id: string;
  /** Back-reference to the source Article that became this published entry. Kept for audit. */
  sourceArticleId: string;

  // ── Migrated submission history (copied at publish time) ──
  originalSubmittedBy: { name: string; email: string };
  originalSubmittedAt: string;
  reviewer?: string;
  reviewedAt?: string;
  /** Full rejection log from the source Article, preserved through publish. */
  rejections?: ArticleRejection[];
  /** Final compliance issues at publish time. */
  complianceIssues: ComplianceIssue[];

  // ── Live content ──
  title: string;
  contentType: ContentType;
  /** Sector id — inherited from the source Article at publish time. */
  sector?: string;
  market: Market;
  countries: string[];
  lead?: string;
  canonicalSlug?: string;
  aliases?: string[];
  topics?: string[];
  references?: ArticleReference[];
  relatedArticleIds?: string[];
  visibility?: ArticleVisibility;
  owner?: string;
  effectiveAt?: string;
  nextReviewAt?: string;
  approvedBy?: string;
  body: string;
  seo: ArticleSEO;
  globalJustification?: string;
  /** All translations carried forward from the source Article. */
  translations?: ArticleTranslations;

  // ── Publish event ──
  publishedAt: string;
  publishedBy: string;
  /** Current published version. Increments when the body is edited post-publish. */
  version: number;
  lastReviewedAt?: string;
  lastReviewer?: string;
  revisionHistory?: ArticleRevision[];

  // ── Lifecycle layer ──
  metrics: PublishedMetrics;
  feedback?: ArticleFeedback;
  /**
   * Set when an admin archives the article. Presence forces the staleness
   * level to "archived" regardless of metrics or review cadence. Clear to
   * unarchive.
   */
  archivedAt?: string;
  /** Display name of the admin who archived it (for the staleness panel). */
  archivedBy?: string;
  /** Plain-English reason captured when an action agent archives or replaces the article. */
  archivedReason?: string;
  /** Draft or published article that supersedes this article. */
  replacedByArticleId?: string;
  /** Source articles that were consolidated into this article. */
  replacesArticleIds?: string[];
};

/**
 * Reads the markets array out of a job input, with back-compat for old jobs
 * that only have the legacy single `market` field. "global" stays as-is in
 * the array — the router agent expands it before drafting.
 */
export function readMarkets(input: JobInput): string[] {
  if (input.markets && input.markets.length > 0) return input.markets;
  if (!input.market) return [];
  // Legacy "both" sentinel meant North America (us + mx).
  if (input.market === "both") return ["us", "mx"];
  return [input.market];
}

/** Returns the "headline" market for legacy display purposes (job rows, etc.). */
export function primaryMarket(input: JobInput): string {
  const all = readMarkets(input);
  if (all.length === 0) return "us";
  if (all.includes("global") || all.length > 1) return "both";
  return all[0];
}

export type StubbedEmail = {
  id: string;
  to: string[];
  subject: string;
  body: string;
  sentAt: string;
  kind: "clarification" | "stakeholder-notification" | "owner-alert";
  jobId?: string;
  /** The specific article this email refers to. Set at creation time so the
   * log can be filtered/joined without ambiguity for multi-article jobs. */
  articleId?: string;
  market?: Market;
  articleStatus?: ArticleStatus;
  articleTitle?: string;
};
