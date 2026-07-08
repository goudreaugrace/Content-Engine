/**
 * Recommendation engine for published articles.
 *
 * Given a PublishedArticle (with its computed staleness) plus the list of
 * similar published articles, return a single suggested next action with
 * a short human-readable reason and the lifecycle action — if any — that
 * a one-click "Apply" should set.
 *
 * The rules are deliberately layered so the most specific match wins:
 *
 *   1. lifecycleAction already set → "Action queued: …" (informational)
 *   2. stale + similar found       → consolidate with the top match
 *   3. stale + very low views      → archive (low engagement)
 *   4. stale (any other)           → mark reviewed (keep alive)
 *   5. aging + similar found       → flag for review & consolidate
 *   6. aging                       → soft "review soon" reminder
 *   7. fresh                       → no action — explicitly say "you're good"
 *
 * Severity drives the recommendation card color in the UI:
 *   - high   = take action soon (stale / strong consolidate hint)
 *   - medium = aging signals
 *   - low    = fresh, or action already queued
 */

import type {
  PublishedArticle,
  Staleness,
} from "./types";
import type { SimilarityMatch } from "./similarity";

export type RecommendationSeverity = "high" | "medium" | "low";

export type ApplyOperation =
  /** Archive via PATCH /:id/archive. Removes from search and rotation. */
  | { kind: "archive" }
  /** Reset the cadence via PATCH /:id/review. */
  | { kind: "mark-reviewed" }
  /** No backend call — the article is healthy or already archived. */
  | { kind: "noop" };

export type Recommendation = {
  /** Short user-facing label rendered on the card heading. */
  title: string;
  /** One-sentence explanation of why we recommend this. */
  reason: string;
  severity: RecommendationSeverity;
  /** What clicking "Apply" should do. The UI builds the button label from `kind`. */
  apply: ApplyOperation;
  /**
   * Optional reference to the similar article this recommendation cites
   * (only set when the rule used a similar-article signal). The UI deep-links
   * to it from the recommendation card.
   */
  similarRef?: {
    id: string;
    title: string;
  };
};

/** Threshold for "very low" 30-day views — copied from the user's UXR feedback. */
const LOW_VIEWS_THRESHOLD = 5;

export function recommend(
  article: PublishedArticle,
  staleness: Staleness,
  similars: SimilarityMatch[],
): Recommendation {
  // ---- 1. Already archived — nothing to recommend. ----
  if (staleness.level === "archived") {
    return {
      title: "Archived",
      reason:
        "This article is out of rotation. Unarchive from the staleness panel if it needs to come back into search.",
      severity: "low",
      apply: { kind: "noop" },
    };
  }

  const topSimilar = similars[0];

  // ---- 2-3. Stale ----
  if (staleness.level === "stale") {
    if (article.metrics.views30d <= LOW_VIEWS_THRESHOLD) {
      return {
        title: "Archive — low engagement",
        reason: `Only ${article.metrics.views30d} views in the last 30 days and it's been ${daysSince(staleness)}+ days since the last review. Archiving removes it from search without deleting the source.`,
        severity: "high",
        apply: { kind: "archive" },
      };
    }
    return {
      title:
        topSimilar && topSimilar.score >= 0.3
          ? `Refresh and mark reviewed (similar to "${truncate(topSimilar.item.title, 50)}")`
          : "Refresh and mark reviewed",
      reason:
        topSimilar && topSimilar.score >= 0.3
          ? `Stale (score ${staleness.score}/100) but still getting traffic. A similar article exists (${Math.round(topSimilar.score * 100)}% match) — consider merging during the refresh.`
          : `Stale (score ${staleness.score}/100) but still getting traffic. Confirm the content is current, then reset the cadence clock.`,
      severity: "high",
      apply: { kind: "mark-reviewed" },
      similarRef:
        topSimilar && topSimilar.score >= 0.3
          ? { id: topSimilar.item.id, title: topSimilar.item.title }
          : undefined,
    };
  }

  // ---- 4. Aging ----
  if (staleness.level === "aging") {
    return {
      title:
        topSimilar && topSimilar.score >= 0.4
          ? `Review soon — and a similar article exists`
          : "Review soon to reset the cadence",
      reason:
        topSimilar && topSimilar.score >= 0.4
          ? `Approaching the review cadence. "${truncate(topSimilar.item.title, 60)}" is a strong match (${Math.round(topSimilar.score * 100)}%); consider merging when you refresh.`
          : `Articles should be reviewed 2–3× per year. Score ${staleness.score}/100 — getting close to stale.`,
      severity: "medium",
      apply: { kind: "mark-reviewed" },
      similarRef:
        topSimilar && topSimilar.score >= 0.4
          ? { id: topSimilar.item.id, title: topSimilar.item.title }
          : undefined,
    };
  }

  // ---- 5. Fresh ----
  return {
    title: "No action needed",
    reason: `Fresh (score ${staleness.score}/100), recent review, and traffic is ${article.metrics.trend === "down" ? "trending down — keep an eye on it" : "healthy"}.`,
    severity: "low",
    apply: { kind: "noop" },
  };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

/** Pull the days-since-review number out of the staleness reasons array. */
function daysSince(staleness: Staleness): number {
  for (const r of staleness.reasons) {
    const m = r.match(/Not reviewed in (\d+) days/);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}
