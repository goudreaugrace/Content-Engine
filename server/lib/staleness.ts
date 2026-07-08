/**
 * Phase E — Staleness scoring.
 *
 * Inputs:
 *   - publishedAt: when the article was first published
 *   - lastReviewedAt: most recent review (defaults to publishedAt if never re-reviewed)
 *   - metrics: views30d + trend
 *   - archivedAt: admin-set; presence short-circuits to level="archived"
 *
 * Output: { score 0–100, level: fresh|aging|stale|archived, reasons: string[] }
 *
 * Weights (sum to 100):
 *   - 35: time since last review (cadence — articles should be reviewed 2–3×/yr)
 *   - 30: time since first publish
 *   - 25: 30-day views (low traffic = candidate for archive)
 *   - 10: trend direction (declining = small push toward stale)
 *
 * Levels:
 *   - 0–34   : fresh
 *   - 35–64  : aging     ← review-cadence reminder shows in the library
 *   - 65+    : stale     ← appears in the dashboard "due for review" widget
 *   - any    : archived  ← terminal; admin took it out of rotation
 *
 * Cadence math: "should be reviewed 2–3× per year" → ~180-day half-life.
 * 180 days since last review = ~50 points on that axis.
 */

import type {
  PublishedArticle,
  PublishedMetrics,
  Staleness,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;

function daysSince(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / DAY);
}

/**
 * Maps a value to 0–weight using a soft saturating curve.
 * At `softCap` days the contribution is half the weight; doubles beyond.
 */
function timeScore(days: number, weight: number, softCap: number): number {
  const x = days / softCap;
  // 0→0, 1→0.5, 2→0.8, infinity→weight (asymptote)
  const fraction = x / (1 + x);
  return Math.round(weight * fraction);
}

function trafficScore(views30d: number, weight: number): number {
  // 0 views in 30 days → full weight (stale signal)
  // 30 views → ~0 (the user feedback's reference number: "30 views in 30 days")
  // Above 30 stays at 0.
  if (views30d >= 30) return 0;
  const fraction = 1 - views30d / 30;
  return Math.round(weight * fraction);
}

function trendScore(trend: PublishedMetrics["trend"], weight: number): number {
  switch (trend) {
    case "down":
      return weight;
    case "flat":
      return Math.round(weight * 0.4);
    case "up":
      return 0;
  }
}

export function computeStaleness(article: PublishedArticle): Staleness {
  // Archived short-circuits everything else. The score still goes to 100 so
  // any UI that sorts by staleness ranks archived items last/first as
  // appropriate without special-casing the level.
  if (article.archivedAt) {
    const archivedAgo = Math.round(daysSince(article.archivedAt));
    const reasons = [
      article.archivedBy
        ? `Archived by ${article.archivedBy} (${archivedAgo} days ago).`
        : `Archived ${archivedAgo} days ago.`,
    ];
    return { score: 100, level: "archived", reasons };
  }

  const reasons: string[] = [];

  const reviewedAt = article.lastReviewedAt ?? article.publishedAt;
  const daysSinceReview = daysSince(reviewedAt);
  const daysSincePublish = daysSince(article.publishedAt);

  const reviewPart = timeScore(daysSinceReview, 35, 180);
  if (daysSinceReview > 180) {
    reasons.push(
      `Not reviewed in ${Math.round(daysSinceReview)} days (cadence: 180 days).`,
    );
  }

  const publishPart = timeScore(daysSincePublish, 30, 365);
  if (daysSincePublish > 365) {
    reasons.push(
      `Published ${Math.round(daysSincePublish / 30)} months ago.`,
    );
  }

  const trafficPart = trafficScore(article.metrics.views30d, 25);
  if (article.metrics.views30d < 30) {
    reasons.push(
      `${article.metrics.views30d} views in the last 30 days (target: ≥30).`,
    );
  }

  const trendPart = trendScore(article.metrics.trend, 10);
  if (article.metrics.trend === "down") {
    reasons.push("Viewership trend is declining.");
  }

  const raw = reviewPart + publishPart + trafficPart + trendPart;
  const score = Math.min(100, Math.max(0, raw));

  let level: Staleness["level"];
  if (score >= 65) level = "stale";
  else if (score >= 35) level = "aging";
  else level = "fresh";

  // Always include at least one positive reason for "fresh" articles so the UI
  // can render something useful when the staleness panel is opened.
  if (level === "fresh" && reasons.length === 0) {
    reasons.push("Recently reviewed and getting steady traffic.");
  }

  return { score, level, reasons };
}
