/**
 * Phase F — Unified "needs attention" feed.
 *
 * The dashboard's job changed: instead of listing every submitted article,
 * it surfaces ANYTHING that needs a human to take action — pre-published
 * drafts in review, in-flight jobs, AND published articles that have gone
 * stale or had a lifecycle decision flagged.
 *
 * This module is the single source of truth for that aggregation. It pulls
 * from three storage areas (articles, jobs, publishedArticles), normalizes
 * everything into one AttentionItem shape, attaches a human-readable reason
 * + severity, and returns the list sorted by urgency.
 *
 * Severity → sort priority:
 *   high   = must act
 *   medium = should act soon
 *   low    = informational (waiting on someone else, or just observing)
 *
 * The dashboard renders all three; the review queue (Phase F) only walks
 * through severity === "high" items so reviewers move through the urgent
 * pile first.
 */

import { loadAll, loadAllMarketProfiles } from "./storage";
import { computeStaleness } from "./staleness";
import {
  readMarkets,
  type Article,
  type ArticleStatus,
  type ContentType,
  type Job,
  type Market,
  type PublishedArticle,
  type StalenessLevel,
} from "./types";

export type AttentionKind = "draft" | "published" | "job";
export type AttentionSeverity = "high" | "medium" | "low";

export type AttentionItem = {
  /** The underlying record id (ka-…, pub-…, or job-…). */
  id: string;
  /** The thing this represents — drives the link target + the badge in the UI. */
  kind: AttentionKind;
  /** What the table renders in the title column. */
  title: string;
  /** Human-readable explanation of WHY this is in the attention queue. */
  reason: string;
  severity: AttentionSeverity;
  market: Market;
  /** Sector this item belongs to. Derived from the record when it has
   *  its own `sector` field, or via a market→sector fallback map for
   *  older records that predate the sector taxonomy. */
  sector?: string;
  contentType: ContentType;
  countries: string[];
  /** ISO date used for tie-break sort. For drafts: submittedAt. For jobs: createdAt.
   *  For published: lastReviewedAt ?? publishedAt. */
  asOf: string;
  /** Path the row navigates to when clicked. */
  linkTo: string;
  /** Author or publisher name shown in the row. */
  who: string;
  /** For drafts: the underlying status, used for filtering. */
  draftStatus?: ArticleStatus;
  /** For published: the computed staleness level. */
  stalenessLevel?: StalenessLevel;
};

/**
 * Maps a draft article to its attention reason + severity. Returns null if the
 * article does not currently need attention (e.g. a stale archive that's been
 * fully resolved — not applicable today, but reserved for future statuses).
 */
function describeDraft(
  article: Article,
): { reason: string; severity: AttentionSeverity } | null {
  switch (article.status) {
    case "needs-review":
      // Auto-approve-candidate is the lowest-friction case but still needs
      // a reviewer click — keep it high but lighter copy.
      if (article.autoApproveCandidate) {
        return {
          reason: "Ready to approve — all checks passed",
          severity: "high",
        };
      }
      return { reason: "Needs review", severity: "high" };
    case "needs-info":
      return {
        reason: "Waiting on author for more info",
        severity: "medium",
      };
    case "rejected":
      // Author owns this one; quieter signal for the reviewer.
      return {
        reason: "Rejected — author may resubmit",
        severity: "low",
      };
    case "published":
      // Published articles live on the PublishedArticle copy — the source
      // is audit history and never needs attention.
      return null;
    default:
      return null;
  }
}

/**
 * In-flight jobs (intake / routing / drafting / etc.) become low-severity
 * "Writing…" rows so the user can watch the orchestration progress without
 * the dashboard going silent between submission and the article appearing.
 */
const WRITING_JOB_STATUSES = new Set([
  "intake",
  "routing",
  "drafting",
  "compliance_review",
  "revising",
]);

function describeJob(
  job: Job,
): { reason: string; severity: AttentionSeverity } | null {
  if (job.status === "failed") {
    return {
      reason: `Failed — ${job.error ?? "agent error"}`,
      severity: "high",
    };
  }
  if (WRITING_JOB_STATUSES.has(job.status)) {
    return { reason: "Agents drafting now", severity: "low" };
  }
  // awaiting_clarification / complete don't surface here — the article
  // created by the orchestrator carries the user-facing status.
  return null;
}

/**
 * Returns the attention reason for a published article based on its staleness
 * and lifecycle action. Fresh + no-action published articles return null
 * (they live only in the Published library, not the attention queue).
 */
function describePublished(
  article: PublishedArticle,
): { reason: string; severity: AttentionSeverity } | null {
  const staleness = computeStaleness(article);
  // Archived articles never appear in the attention queue — they're out of
  // rotation and don't need a reviewer to act.
  if (staleness.level === "archived") return null;
  if (staleness.level === "stale") {
    // Surface the most-actionable reason (usually the cadence one).
    const cadenceReason = staleness.reasons.find((r) =>
      r.startsWith("Not reviewed"),
    );
    return {
      reason: cadenceReason ?? "Stale — needs review",
      severity: "high",
    };
  }
  if (staleness.level === "aging") {
    return {
      reason: "Aging — review soon",
      severity: "medium",
    };
  }
  return null;
}

/** Numeric weight for sorting — lower number = appears higher in the list. */
const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Within a severity bucket, we further order by a per-reason hint so the most
 * urgent specific reasons rise. Tweak this list to influence dashboard ordering
 * without changing severity logic. Items not in the list fall to the end of
 * their bucket and tie-break on `asOf` (oldest first).
 */
const REASON_RANK: Record<string, number> = {
  "Failed": 0,
  "Needs review": 10,
  "Ready to approve — all checks passed": 11,
  "Approved — ready to publish": 12,
  // Anything starting with "Marked for" → 20 (handled below)
  "Stale": 30,
  // Anything starting with "Not reviewed" → 30
  "Aging — review soon": 40,
  "Waiting on author for more info": 50,
  "Agents drafting now": 60,
  "Rejected — author may resubmit": 70,
};

function reasonRank(reason: string): number {
  if (REASON_RANK[reason] !== undefined) return REASON_RANK[reason];
  if (reason.startsWith("Failed")) return REASON_RANK["Failed"];
  if (reason.startsWith("Marked for")) return 20;
  if (reason.startsWith("Not reviewed")) return REASON_RANK["Stale"] ?? 30;
  if (reason.startsWith("Stale")) return REASON_RANK["Stale"] ?? 30;
  return 100;
}

/**
 * Build the full attention feed. Pulls from all three stores in parallel,
 * normalizes, sorts, returns. The route handler just wraps this.
 */
export async function buildAttentionFeed(): Promise<AttentionItem[]> {
  const [drafts, jobs, published, marketProfiles] = await Promise.all([
    loadAll<Article>("articles"),
    loadAll<Job>("jobs"),
    loadAll<PublishedArticle>("publishedArticles"),
    loadAllMarketProfiles(),
  ]);

  // Fallback map for records that predate the sector taxonomy — resolves
  // the sector from the item's market via the market profile's sectorId.
  const marketToSector = new Map<string, string>();
  for (const m of marketProfiles) {
    if (m.sectorId) marketToSector.set(m.id.toLowerCase(), m.sectorId);
  }
  const sectorFor = (marketCode: string, own?: string): string | undefined =>
    own ?? marketToSector.get(marketCode.toLowerCase());

  const items: AttentionItem[] = [];

  // ---- Drafts ----
  for (const a of drafts) {
    const desc = describeDraft(a);
    if (!desc) continue;
    items.push({
      id: a.id,
      kind: "draft",
      title: a.title,
      reason: desc.reason,
      severity: desc.severity,
      market: a.market,
      sector: sectorFor(a.market, a.sector),
      contentType: a.contentType,
      countries: a.countries ?? [],
      asOf: a.submittedAt,
      linkTo: `/articles/${a.id}`,
      who: a.submittedBy.name,
      draftStatus: a.status,
    });
  }

  // ---- Jobs (in-flight only) ----
  // De-dupe: a job that already produced an article is represented by the
  // draft above; skip those so we don't double-count.
  const articleJobIds = new Set(
    drafts.map((a) => a.jobId).filter((id): id is string => !!id),
  );
  for (const j of jobs) {
    const desc = describeJob(j);
    if (!desc) continue;
    // Failed jobs always show. In-flight jobs that haven't materialized an
    // article yet also show — once the article exists, the draft row replaces it.
    if (j.status !== "failed" && articleJobIds.has(j.id)) continue;
    items.push({
      id: j.id,
      kind: "job",
      title: j.input.title || "Untitled request",
      reason: desc.reason,
      severity: desc.severity,
      market: jobInputMarket(j.input),
      sector: j.input.sectors?.[0] ?? sectorFor(jobInputMarket(j.input)),
      contentType: j.input.contentType,
      countries: j.input.countries ?? [],
      asOf: j.createdAt,
      linkTo: `/jobs/${j.id}`,
      who: j.input.submittedBy.name,
    });
  }

  // ---- Published ----
  for (const p of published) {
    const desc = describePublished(p);
    if (!desc) continue;
    const staleness = computeStaleness(p);
    items.push({
      id: p.id,
      kind: "published",
      title: p.title,
      reason: desc.reason,
      severity: desc.severity,
      market: p.market,
      sector: sectorFor(p.market, p.sector),
      contentType: p.contentType,
      countries: p.countries,
      asOf: p.lastReviewedAt ?? p.publishedAt,
      linkTo: `/library/${p.id}`,
      who: p.publishedBy,
      stalenessLevel: staleness.level,
    });
  }

  // ---- Sort: severity, then reason rank, then oldest-first within ----
  items.sort((a, b) => {
    const sevDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const reasonDiff = reasonRank(a.reason) - reasonRank(b.reason);
    if (reasonDiff !== 0) return reasonDiff;
    return +new Date(a.asOf) - +new Date(b.asOf); // oldest first
  });

  return items;
}

/**
 * Picks a single display market for a job-input row. Multi-market or global
 * submissions collapse to "Global" since the attention row is a single line.
 */
function jobInputMarket(input: Job["input"]): Market {
  const map: Record<string, Market> = {
    us: "US", mx: "MX", br: "BR", uk: "UK", in: "IN",
  };
  const all = readMarkets(input);
  if (all.length === 0) return "Global";
  if (all.includes("global") || all.length > 1) return "Global";
  return map[all[0]] ?? "Global";
}
