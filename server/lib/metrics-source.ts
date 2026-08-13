/**
 * Phase E — Metrics source abstraction.
 *
 * In the POC, metrics live inline on each PublishedArticle (`article.metrics`)
 * and `JSONMetricsSource` is a no-op pass-through. The interface is the seam
 * where a real source — ServiceNow Performance Analytics, Adobe, etc. — plugs
 * in later without changing the staleness / library / decision-matrix code.
 *
 * Stable contract for the future implementation:
 *   - `read(articleId)`: returns the latest metrics for a published article.
 *     Always synchronous from the caller's perspective; the JSON impl returns
 *     instantly, a real impl can cache + refresh in the background.
 *   - `readMany(ids)`: batched variant. The library page calls this once per
 *     render with the visible article ids.
 */

import type { PublishedArticle, PublishedMetrics } from "./types";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", MX: "Mexico", GB: "United Kingdom",
  IE: "Ireland", SG: "Singapore", BR: "Brazil", IN: "India", DE: "Germany",
  FR: "France", AU: "Australia", PH: "Philippines",
};

function stableNumber(value: string): number {
  return [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) % 997, 17);
}

function wordsFor(article: PublishedArticle): string[] {
  const raw = [...article.seo.keywords, ...article.title.toLowerCase().split(/[^a-z0-9]+/)]
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word.length > 2);
  return Array.from(new Set(raw)).slice(0, 4).length
    ? Array.from(new Set(raw)).slice(0, 4)
    : ["help", "policy", "request"];
}

function nextStepFor(article: PublishedArticle): string | null {
  const markdownLink = article.body.match(/\[([^\]]{3,80})\]\([^\)]+\)/);
  if (markdownLink) return markdownLink[1].trim();
  const action = article.body.match(/\b(open a case|submit (?:a |an )?request|apply (?:for|to)[^.\n]*|start (?:a |an )?request)\b/i);
  return action?.[1] ? action[1].replace(/^./, (letter) => letter.toUpperCase()) : null;
}

/** Owner-view-only sample telemetry. Kept separate from the admin metrics
 * source so the POC's established admin health view is unchanged. Replace
 * this with ServiceNow/Adobe event data later; the UI contract stays unchanged. */
export function demoFindabilityMetrics(article: PublishedArticle): PublishedMetrics {
  const seed = stableNumber(article.id);
  const views30d = article.metrics.views30d || 18 + (seed % 125);
  const expected = article.countries.length ? article.countries : ["US"];
  const unexpectedPool = ["US", "CA", "MX", "GB", "IE", "SG", "BR", "IN", "DE", "AU"]
    .filter((code) => !expected.includes(code));
  const unexpected = unexpectedPool[seed % unexpectedPool.length];
  const unexpectedShare = seed % 3 === 0 ? 0.42 : seed % 3 === 1 ? 0.16 : 0.08;
  const unexpectedViews = Math.max(3, Math.round(views30d * unexpectedShare));
  const expectedViews = Math.max(1, views30d - unexpectedViews);
  const baseLocations = expected.map((code, index) => ({
    code,
    name: COUNTRY_NAMES[code] ?? code,
    views: index === 0 ? Math.round(expectedViews * 0.7) : Math.max(1, Math.round(expectedViews * 0.3 / Math.max(1, expected.length - 1))),
  }));
  const terms = wordsFor(article);
  const phrases = [
    `${terms[0]} ${terms[1] ?? "help"}`,
    `how to ${terms[0]}`,
    article.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 44),
    `${terms[0]} policy`,
    `${terms[1] ?? terms[0]} request`,
  ].filter((phrase, index, all) => phrase.trim().length > 2 && all.indexOf(phrase) === index);
  const nextStep = nextStepFor(article);

  return {
    ...article.metrics,
    views30d,
    viewsAllTime: article.metrics.viewsAllTime || views30d * (4 + (seed % 7)),
    lastViewedAt: article.metrics.lastViewedAt ?? new Date(Date.now() - (seed % 36) * 3_600_000).toISOString(),
    averageEngagementSeconds: 24 + (seed % 105),
    scrollDepthPercent: 42 + (seed % 49),
    ...(nextStep ? { cta: { label: nextStep, clicks: Math.max(3, Math.round(views30d * (0.12 + (seed % 12) / 100))) } } : {}),
    locations: [
      ...baseLocations,
      { code: unexpected, name: COUNTRY_NAMES[unexpected] ?? unexpected, views: unexpectedViews },
    ].sort((a, b) => b.views - a.views),
    searchQueries: phrases.slice(0, 5).map((phrase, index) => {
      const searches = Math.max(5, Math.round(views30d * (0.55 - index * 0.07)));
      return { phrase, searches, articleOpens: Math.max(3, Math.round(searches * (0.68 - index * 0.06))) };
    }),
  };
}

export interface MetricsSource {
  name: string;
  read(article: PublishedArticle): Promise<PublishedMetrics>;
  readMany(articles: PublishedArticle[]): Promise<Map<string, PublishedMetrics>>;
}

/**
 * Default impl. Reads metrics straight off the persisted PublishedArticle.
 * Useful for the POC where view counts are seeded into the JSON; the article
 * IS its own source of truth.
 */
export class JSONMetricsSource implements MetricsSource {
  name = "json";
  async read(article: PublishedArticle): Promise<PublishedMetrics> {
    return article.metrics;
  }
  async readMany(
    articles: PublishedArticle[],
  ): Promise<Map<string, PublishedMetrics>> {
    return new Map(articles.map((a) => [a.id, a.metrics]));
  }
}

/**
 * Stub for the future ServiceNow Performance Analytics integration. Throws
 * on use — wire it up by replacing the constructor body with the SN PA client
 * call and pointing the singleton below at this class instead of JSONMetricsSource.
 */
export class ServiceNowMetricsSource implements MetricsSource {
  name = "service-now";
  async read(_article: PublishedArticle): Promise<PublishedMetrics> {
    throw new Error(
      "ServiceNowMetricsSource is a stub — implement SN PA client calls here.",
    );
  }
  async readMany(
    _articles: PublishedArticle[],
  ): Promise<Map<string, PublishedMetrics>> {
    throw new Error("ServiceNowMetricsSource is a stub.");
  }
}

// Single instance used across the server. Swap this to switch sources.
export const metricsSource: MetricsSource = new JSONMetricsSource();
