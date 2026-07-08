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
