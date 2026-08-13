// Typed fetch wrapper. Mirrors server/lib/types.ts shapes.

/**
 * Source-article status. No "approved" — approval triggers an atomic
 * publish (creates the PublishedArticle and bumps the source to
 * "published" in one transaction). Edits to live content happen on the
 * PublishedArticle, not the source.
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

export type ComplianceIssue = {
  severity: "info" | "warning" | "error";
  category: string;
  message: string;
  /** Phase C — H2 heading this issue applies to (exact text after `##`). */
  section?: string;
  /** Phase C — verbatim excerpt the issue references. */
  excerpt?: string;
  /** Phase P3.3 — reviewer dismissed this flag as a false positive. */
  dismissed?: boolean;
  dismissedBy?: string;
  dismissedAt?: string;
  dismissalNote?: string;
};

export type ApprovalRuleResult = {
  id: string;
  label: string;
  severity: "error" | "warning" | "ok";
  reason?: string;
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

export type JobInput = {
  title: string;
  contentType: ContentType;
  summary: string;
  audience: string;
  /**
   * Legacy single-market field. Kept readable for old jobs in the system;
   * new submissions populate `markets` instead.
   */
  market?: "us" | "mx" | "br" | "uk" | "in" | "both";
  /**
   * Markets the article should be written for. May include "global" as a
   * sentinel meaning "all five specific markets". Required for new submissions.
   */
  markets: string[];
  /**
   * Sectors the article belongs to. Cascade parent of `markets` in the
   * new-request wizard. A single-element array in the common case; the
   * value "global" means corporate content that spans all sectors.
   */
  sectors?: string[];
  sourceText: string;
  submittedBy: { name: string; email: string };
  /** ISO country codes the article applies to. Required (≥1). */
  countries: string[];
  /** SEO metadata. Title 30–60 chars and metaDescription required by the server. */
  seo: ArticleSEO;
  /** Required when market === "both" (Global). ≥10 chars. */
  globalJustification?: string;
  /** Phase B: set when the duplicate-detection panel marks an existing article as the one being replaced. */
  replacesArticleId?: string;
};

export type ArticleSEO = {
  // ── Search (SEO) ──
  title: string;
  metaDescription: string;
  keywords: string[];

  // ── AI discovery (GEO) ──
  // Fields for RAG / enterprise-LLM retrieval. All optional — older
  // articles default to empty values at read time.
  /** 2-3 sentence factual extract for citation by AI surfaces. */
  summary?: string;
  /** Natural-language questions this article answers. */
  keyQuestions?: string[];
  /** Named entities the article authoritatively covers. */
  entities?: string[];
};

export type Country = {
  code: string;           // ISO 3166-1 alpha-2
  name: string;
  defaultMarketId: "us" | "mx" | "br" | "uk" | "in" | "global";
  region: "NAM" | "LATAM" | "EMEA" | "APAC";
};

// ─────────────────────────────────────────────────────────────
// Activity feed — recent state-change events derived server-side from
// article + published-article timestamps. Powers the notification badge
// on the Review Cycle nav item and the "Activity since you were last
// here" widget at the top of that page.
// ─────────────────────────────────────────────────────────────
export type ActivityAction =
  | "submitted"
  | "rejected"
  | "needs-info"
  | "published"
  | "archived"
  | "marked-reviewed";

export type ActivityEvent = {
  id: string;
  action: ActivityAction;
  articleId: string;
  articleTitle: string;
  actor: string;
  at: string;
  linkTo: string;
  detail?: string;
};

// ─────────────────────────────────────────────────────────────
// Phase F — Unified "needs attention" feed
// ─────────────────────────────────────────────────────────────
export type AttentionKind = "draft" | "published" | "job";
export type AttentionSeverity = "high" | "medium" | "low";

export type AttentionItem = {
  id: string;
  kind: AttentionKind;
  title: string;
  reason: string;
  severity: AttentionSeverity;
  market: Market;
  /** Sector id this item belongs to. Populated by the server via the
   *  record's own field or a market→sector fallback. */
  sector?: string;
  contentType: ContentType;
  countries: string[];
  asOf: string;
  linkTo: string;
  who: string;
  draftStatus?: ArticleStatus;
  stalenessLevel?: "fresh" | "aging" | "stale" | "archived";
};

// ─────────────────────────────────────────────────────────────
// Phase E — Published library
// ─────────────────────────────────────────────────────────────
// LifecycleAction (review-and-consolidate / convert / archive /
// delete-and-redirect) was over-engineered for the actual workflow. The
// concept collapsed into a single archivedAt timestamp on PublishedArticle
// which promotes the article to a new "archived" staleness level.

export type PublishedMetrics = {
  views30d: number;
  viewsAllTime: number;
  lastViewedAt?: string;
  trend: "up" | "flat" | "down";
  averageEngagementSeconds?: number;
  scrollDepthPercent?: number;
  cta?: { label: string; clicks: number };
  locations?: Array<{ code: string; name: string; views: number }>;
  searchQueries?: Array<{
    phrase: string;
    searches: number;
    articleOpens: number;
  }>;
};

export type StalenessLevel = "fresh" | "aging" | "stale" | "archived";

export type Staleness = {
  score: number;
  level: StalenessLevel;
  reasons: string[];
};

// ── Recommendation engine + similar-published surfaces (detail-page only) ──
export type RecommendationSeverity = "high" | "medium" | "low";

export type RecommendationKind =
  | "consolidate"
  | "standardize"
  | "replace"
  | "archive"
  | "mark-reviewed"
  | "noop";

export type RecommendationEvidence = {
  signal: string;
  label: string;
  detail: string;
  severity: RecommendationSeverity;
};

export type RecommendationApply =
  | { kind: "generate-draft"; draftKind: "consolidation" | "standardization"; candidateIds?: string[] }
  | { kind: "archive" }
  | { kind: "mark-reviewed" }
  | { kind: "noop" };

export type PublishedRecommendation = {
  kind: RecommendationKind;
  title: string;
  reason: string;
  severity: RecommendationSeverity;
  evidence: RecommendationEvidence[];
  actionLabel?: string;
  apply: RecommendationApply;
  similarRef?: { id: string; title: string };
};

export type PublishedSimilarMatch = {
  id: string;
  title: string;
  market: Market;
  contentType: ContentType;
  score: number;
  sharedCountries: string[];
  stalenessLevel: StalenessLevel;
  views30d: number;
};

export type PublishedArticle = {
  id: string;
  sourceArticleId: string;

  // Migrated submission history
  originalSubmittedBy: { name: string; email: string };
  originalSubmittedAt: string;
  reviewer?: string;
  reviewedAt?: string;
  rejections?: ArticleRejection[];
  complianceIssues: ComplianceIssue[];

  // Live content
  title: string;
  contentType: ContentType;
  /** Sector id — inherited from the source Article at publish time. */
  sector?: string;
  market: Market;
  countries: string[];
  body: string;
  seo: ArticleSEO;
  globalJustification?: string;
  translations?: Record<string, string>;

  // Publish event
  publishedAt: string;
  publishedBy: string;
  version: number;
  lastReviewedAt?: string;
  lastReviewer?: string;

  // Lifecycle layer
  metrics: PublishedMetrics;
  /** Set when an admin archives the article. Presence promotes the staleness
   *  level to "archived" regardless of metrics. */
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  replacedByArticleId?: string;
  replacesArticleIds?: string[];

  // Server-computed
  staleness: Staleness;
  /** Detail-only — present on getPublishedArticle, omitted on list. */
  similar?: PublishedSimilarMatch[];
  /** Detail-only — present on getPublishedArticle, omitted on list. */
  recommendation?: PublishedRecommendation;
};

export type SimilarMatch = {
  id: string;
  title: string;
  /** Cosine similarity (with country-overlap boost). 0–1, higher = more similar. */
  score: number;
  /** Country codes the query shares with the match. */
  sharedCountries: string[];
  market: Market;
  status: ArticleStatus;
  contentType: ContentType;
};

export type Article = {
  id: string;
  jobId?: string;
  title: string;
  contentType: ContentType;
  /** Sector id — the tier above Market (Global, PFNA, PBNA, LatAm, etc.).
   *  Optional in the type only for older seed rows; new articles always set it. */
  sector?: string;
  /** Approved publishing destination selected by the owner or Team Admin. */
  knowledgeBase?: "myPepsiCo KB" | "PFP KB" | "PepKM KB";
  market: Market;
  /** Phase A — ISO country codes. Older articles backfill to []. */
  countries: string[];
  /** Phase A — SEO metadata. Older articles backfill to blank values. */
  seo: ArticleSEO;
  globalJustification?: string;
  replacesArticleId?: string;
  /** Published articles intentionally consolidated into this draft. */
  replacesArticleIds?: string[];
  body: string;
  submittedBy: { name: string; email: string };
  submittedAt: string;
  status: ArticleStatus;
  complianceIssues: ComplianceIssue[];
  reviewedAt?: string;
  reviewer?: string;
  rejectionReason?: string;
  infoNeeded?: string;
  translations?: Record<string, string>;
  /** Current version. Bumps on resubmit. */
  version?: number;
  /** Append-only log of prior rejections, oldest first. */
  rejections?: ArticleRejection[];
  /** Phase C — set when every rule passed. Review UI shows a one-click approve banner. */
  autoApproveCandidate?: boolean;
  /** Phase C — full rules-engine output for the review UI checklist. */
  approvalResults?: ApprovalRuleResult[];
  /**
   * Set when the article was approved-and-published. Points at the
   * PublishedArticle that holds the live content. Source articles at
   * status="published" link out to this id for editing.
   */
  publishedArticleId?: string;
};

export type ArticleRejection = {
  at: string;
  by: string;
  reason: string;
  version: number;
  body: string;
};

export type StubbedEmail = {
  id: string;
  to: string[];
  subject: string;
  body: string;
  sentAt: string;
  kind: "clarification" | "stakeholder-notification" | "owner-alert";
  jobId?: string;
  articleId?: string;
  // Enriched by the server via the linked article (not persisted):
  market?: Market;
  articleStatus?: ArticleStatus;
  articleTitle?: string;
};

/**
 * A NotebookLM-style reference source attached to a profile. The agent
 * uses these as authoritative material when drafting content for the
 * profile that owns them.
 */
export type ProfileSource = {
  id: string;
  kind: "url" | "pdf" | "doc" | "note";
  title: string;
  url?: string;
  filePath?: string;
  fileName?: string;
  snippet?: string;
  addedAt: string;
  addedBy: string;
};

export type AudienceProfile = {
  id: string;
  label: string;
  summary: string;
  toneOfVoice: string;
  readingContext: string;
  contentGuidelines: string;
  /** Phase D — what this persona tends to search for. */
  searchIntent?: string;
  /** Audience-specific reference sources the agent grounds drafts in. */
  sources?: ProfileSource[];
};

/**
 * Sector — the tier above Market. Sectors group markets by business unit
 * (PFNA, PBNA) or geography (LatAm, Europe, AMESA, APAC), with Global for
 * corporate-wide content. Sector profile carries strategy/terminology
 * that flows down to all markets in that sector; each market extends
 * those with locale-specific rendering rules.
 */
export type SectorProfile = {
  id: string;
  name: string;
  summary?: string;
  toneOfVoice: string;
  contentStrategy: string;
  contentGuidelines: string;
  terminology: Record<string, string>;
  bannedTerms: string[];
  regulatoryNotes: string;
  seoNotes?: string;
  commonSearchTerms?: string[];
  /** Corporate-tier reference sources — apply to every market inside this sector. */
  sources?: ProfileSource[];
};

export type MarketProfile = {
  id: string;
  /** Sector this market belongs to (every market has exactly one). */
  sectorId?: string;
  name: string;
  language: string;
  languageCode: string;
  /** All locales this market makes content available in. Includes the primary languageCode. */
  availableLanguages?: string[];
  toneOfVoice: string;
  contentStrategy: string;
  contentGuidelines: string;
  terminology: Record<string, string>;
  bannedTerms: string[];
  regulatoryNotes: string;
  dateFormat: string;
  currency: string;
  reviewers: string[];
  /** Phase D — SEO context for this market. */
  seoNotes?: string;
  commonSearchTerms?: string[];
  defaultCountries?: string[];
  /** Market-specific reference sources; combined with the sector's at draft time. */
  sources?: ProfileSource[];
};

/**
 * POC stand-in for an auth identity. Returns the hardcoded demo user used
 * across the app. Swap this for real auth integration (next.js session,
 * SSO, etc.) — every consumer reads through this single helper so the
 * swap is one-file.
 */
export function currentUser(): { name: string; email: string } {
  return { name: "Demo User", email: "content-owner@pepsico.com" };
}

async function request<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; mockMode: boolean }>("/api/health"),

  // Articles
  listArticles: () => request<Article[]>("/api/articles"),
  getArticle: (id: string) => request<Article>(`/api/articles/${id}`),
  reviewArticle: (
    id: string,
    /**
     * Reviewer action. "approved" is a transient input — the server
     * translates it to an atomic publish, bumping the source article to
     * status="published" and creating a PublishedArticle. The returned
     * Article carries `publishedArticleId` for the client to navigate to.
     */
    body: {
      status: "needs-review" | "needs-info" | "rejected" | "approved";
      reviewer?: string;
      rejectionReason?: string;
      note?: string;
    },
  ) =>
    request<Article>(`/api/articles/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  updateArticle: (
    id: string,
    body: {
      body?: string;
      title?: string;
      seo?: ArticleSEO;
      countries?: string[];
      knowledgeBase?: Article["knowledgeBase"];
      sector?: string;
      globalJustification?: string;
    },
  ) =>
    request<Article>(`/api/articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  transferArticleOwner: (
    id: string,
    submittedBy: { name: string; email: string },
  ) =>
    request<Article>(`/api/articles/${id}/owner`, {
      method: "PATCH",
      body: JSON.stringify({ submittedBy }),
    }),
  reviseArticle: (id: string, body: { instruction: string }) =>
    request<{ revisedBody: string; explanation: string }>(`/api/articles/${id}/revise`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  reviseSection: (
    id: string,
    body: { section: string; instruction: string },
  ) =>
    request<{ revisedSection: string; explanation: string }>(
      `/api/articles/${id}/revise-section`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  resubmitArticle: (id: string) =>
    request<Article>(`/api/articles/${id}/resubmit`, { method: "POST" }),

  /** Phase P3.3 — reviewer dismisses a single compliance flag. */
  dismissCompliance: (
    id: string,
    issueIdx: number,
    body: { note?: string; reviewer?: string } = {},
  ) =>
    request<Article>(
      `/api/articles/${id}/compliance/${issueIdx}/dismiss`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

  // Phase E — published library reads. Publishing happens inside
  // reviewArticle() now (status="approved" triggers atomic publish), so
  // there's no separate publishArticle endpoint.
  listPublishedArticles: () =>
    request<PublishedArticle[]>("/api/published-articles"),
  getPublishedArticle: (id: string) =>
    request<PublishedArticle>(`/api/published-articles/${id}`),
  getPublishedArticlePerformance: (id: string) =>
    request<PublishedMetrics>(`/api/published-articles/${id}/performance`),
  updatePublishedArticle: (
    id: string,
    body: { body?: string; title?: string; seo?: ArticleSEO },
  ) =>
    request<PublishedArticle>(`/api/published-articles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  /**
   * Toggle archived state on a published article. Replaces the old
   * setPublishedLifecycle which supported four lifecycle actions; in
   * practice only "archive" was used, so the API collapsed to a single
   * boolean toggle.
   */
  setPublishedArchived: (
    id: string,
    body: { archived: boolean; archivedBy?: string },
  ) =>
    request<PublishedArticle>(`/api/published-articles/${id}/archive`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  markPublishedReviewed: (id: string, body: { reviewer?: string } = {}) =>
    request<PublishedArticle>(`/api/published-articles/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getConsolidationPreview: (id: string, body: { articleIds?: string[] } = {}) =>
    request<{
      primary: PublishedArticle;
      sources: PublishedArticle[];
      previewTitle: string;
      coverage: string[];
      conflicts: string[];
      evidence: RecommendationEvidence[];
    }>(`/api/published-articles/${id}/consolidation-preview`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  consolidatePublishedArticle: (id: string, body: { articleIds: string[] }) =>
    request<{ job: Job; article: Article }>(`/api/published-articles/${id}/consolidate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  standardizeMigration: (body: {
    sourceTitle: string;
    sourceContent: string;
    contentType: ContentType;
    marketId: string;
    sectorId: string;
    countries: string[];
    submittedBy?: { name: string; email: string };
  }) =>
    request<{ job: Job; article: Article }>(`/api/migrations/standardize`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  translateArticle: (id: string, body: { target?: string } = {}) =>
    request<{ language: string; body: string }>(`/api/articles/${id}/translate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Jobs
  createJob: (input: JobInput) =>
    request<Job>("/api/jobs", { method: "POST", body: JSON.stringify(input) }),
  listJobs: () => request<Job[]>("/api/jobs"),
  getJob: (id: string) => request<Job>(`/api/jobs/${id}`),

  // Sectors — the tier above Markets. Each Sector groups multiple Markets
  // and provides corporate-level guidance (strategy, terminology, banned
  // terms) that the market agent composes with the market-level profile
  // at draft time.
  listSectors: () => request<SectorProfile[]>("/api/sectors"),
  getSector: (id: string) => request<SectorProfile>(`/api/sectors/${id}`),
  getMarketsInSector: (id: string) =>
    request<MarketProfile[]>(`/api/sectors/${id}/markets`),
  saveSector: (id: string, body: SectorProfile) =>
    request<SectorProfile>(`/api/sectors/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // Sources / uploads. Base64-in-JSON upload keeps the client light; the
  // server writes the decoded blob under server/data/source-uploads/.
  uploadSourceFile: (input: {
    title: string;
    fileName: string;
    mimeType: string;
    dataUrl: string;
  }) =>
    request<{
      id: string;
      kind: "pdf" | "doc";
      title: string;
      fileName: string;
      filePath: string;
      mimeType: string;
    }>(`/api/uploads`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  // Markets
  listMarkets: () => request<MarketProfile[]>("/api/markets"),
  getMarket: (id: string) => request<MarketProfile>(`/api/markets/${id}`),
  saveMarket: (id: string, body: MarketProfile) =>
    request<MarketProfile>(`/api/markets/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  // Audiences
  listAudiences: () => request<AudienceProfile[]>("/api/audiences"),
  getAudience: (id: string) => request<AudienceProfile>(`/api/audiences/${id}`),
  saveAudience: (id: string, body: AudienceProfile) =>
    request<AudienceProfile>(`/api/audiences/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  // Countries
  listCountries: () => request<Country[]>("/api/countries"),

  // Phase F — unified attention feed
  listAttention: () => request<AttentionItem[]>("/api/attention"),
  listActivity: () => request<ActivityEvent[]>("/api/activity"),

  // Phase B — similarity lookup for the new-article form
  findSimilarArticles: (body: {
    title: string;
    summary: string;
    countries: string[];
  }) =>
    request<{ matches: SimilarMatch[] }>("/api/articles/similar", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Emails
  listEmails: () => request<StubbedEmail[]>("/api/emails"),
  sendOwnerAlert: (body: {
    articleId: string;
    articleTitle: string;
    ownerName: string;
    to: string[];
    action: "review" | "update" | "archive" | "consolidate";
    reason: string;
  }) =>
    request<StubbedEmail>("/api/emails/owner-alert", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
