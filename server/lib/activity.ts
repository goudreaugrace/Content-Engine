/**
 * Activity feed — derived from existing article + published-article
 * timestamps. We don't persist a separate events log; the feed is computed
 * on-demand by joining the timestamps already on the entities:
 *
 *   - Article.submittedAt       → "submitted"
 *   - Article.reviewedAt        → "approved" | "rejected" | "needs-info"
 *                                 (action keyed to the final status)
 *   - Article.rejections[i].at  → "rejected" (one per prior rejection)
 *   - PublishedArticle.publishedAt → "published"
 *   - PublishedArticle.lastReviewedAt → "marked-reviewed" (cadence reset)
 *   - PublishedArticle.archivedAt → "archived"
 *
 * Returned events are sorted newest-first. The client uses a localStorage
 * "last seen" timestamp to compute an unread count and an activity strip.
 */

import { loadAll } from "./storage";
import type { Article, PublishedArticle } from "./types";

export type ActivityAction =
  | "submitted"
  | "rejected"
  | "needs-info"
  | "published"
  | "archived"
  | "marked-reviewed";

export type ActivityEvent = {
  /** Stable composite key so the client can dedupe across re-fetches. */
  id: string;
  action: ActivityAction;
  /** Always present — the underlying article id (draft or published). */
  articleId: string;
  articleTitle: string;
  /** Display name of whoever performed the action (best-effort). */
  actor: string;
  /** ISO timestamp when the action occurred. */
  at: string;
  /** Where to send the user when they click the row. */
  linkTo: string;
  /** Optional one-line context — for needs-info this is the note, for
   *  reject this is the reason, for published this is the version, etc. */
  detail?: string;
};

/** Max events the server returns — recent history only. */
const MAX_EVENTS = 40;

export async function buildActivityFeed(): Promise<ActivityEvent[]> {
  const [articles, published] = await Promise.all([
    loadAll<Article>("articles"),
    loadAll<PublishedArticle>("publishedArticles"),
  ]);

  const events: ActivityEvent[] = [];

  for (const a of articles) {
    // Submitted event — always exists.
    events.push({
      id: `submit:${a.id}`,
      action: "submitted",
      articleId: a.id,
      articleTitle: a.title,
      actor: a.submittedBy?.name ?? "Unknown",
      at: a.submittedAt,
      linkTo: `/articles/${a.id}`,
    });

    // Prior rejections from the rejections log.
    if (a.rejections) {
      for (const r of a.rejections) {
        events.push({
          id: `reject:${a.id}:${r.at}`,
          action: "rejected",
          articleId: a.id,
          articleTitle: a.title,
          actor: r.by,
          at: r.at,
          linkTo: `/articles/${a.id}`,
          detail: r.reason,
        });
      }
    }

    // Most-recent review action — derived from the current status. Approval
    // doesn't emit a separate event here: the atomic approve-and-publish
    // surfaces as a "published" event below (built from the PublishedArticle's
    // publishedAt). Older rejections come from the rejections[] log above.
    if (a.reviewedAt && a.status === "rejected" && a.rejectionReason) {
      // The current rejection (not yet in the rejections[] log until
      // resubmit). Avoid double-counting if the rejection is also logged.
      const alreadyLogged = (a.rejections ?? []).some(
        (r) => r.at === a.reviewedAt,
      );
      if (!alreadyLogged) {
        events.push({
          id: `reject:${a.id}:${a.reviewedAt}`,
          action: "rejected",
          articleId: a.id,
          articleTitle: a.title,
          actor: a.reviewer ?? "Reviewer",
          at: a.reviewedAt,
          linkTo: `/articles/${a.id}`,
          detail: a.rejectionReason,
        });
      }
    }
    if (a.reviewedAt && a.status === "needs-info" && a.infoNeeded) {
      events.push({
        id: `needs-info:${a.id}:${a.reviewedAt}`,
        action: "needs-info",
        articleId: a.id,
        articleTitle: a.title,
        actor: a.reviewer ?? "Reviewer",
        at: a.reviewedAt,
        linkTo: `/articles/${a.id}`,
        detail: a.infoNeeded,
      });
    }
  }

  for (const p of published) {
    // Publish event — the moment the draft crossed into the library.
    events.push({
      id: `publish:${p.id}:${p.publishedAt}`,
      action: "published",
      articleId: p.id,
      articleTitle: p.title,
      actor: p.publishedBy ?? "Reviewer",
      at: p.publishedAt,
      linkTo: `/library/${p.id}`,
      detail: `v${p.version}`,
    });

    // Cadence reset — surfaces "this article was confirmed accurate
    // again," which is a quiet but useful signal for owners.
    if (
      p.lastReviewedAt &&
      p.lastReviewedAt !== p.publishedAt &&
      // Skip the noise of synthetic "marked-reviewed" events that exactly
      // match the archive timestamp (the archive route doesn't touch
      // lastReviewedAt today, but belt-and-suspenders).
      p.lastReviewedAt !== p.archivedAt
    ) {
      events.push({
        id: `mark-reviewed:${p.id}:${p.lastReviewedAt}`,
        action: "marked-reviewed",
        articleId: p.id,
        articleTitle: p.title,
        actor: p.lastReviewer ?? "Reviewer",
        at: p.lastReviewedAt,
        linkTo: `/library/${p.id}`,
      });
    }

    // Archive event.
    if (p.archivedAt) {
      events.push({
        id: `archive:${p.id}:${p.archivedAt}`,
        action: "archived",
        articleId: p.id,
        articleTitle: p.title,
        actor: p.archivedBy ?? "Admin",
        at: p.archivedAt,
        linkTo: `/library/${p.id}`,
      });
    }
  }

  // Newest first.
  events.sort((a, b) => +new Date(b.at) - +new Date(a.at));

  return events.slice(0, MAX_EVENTS);
}
