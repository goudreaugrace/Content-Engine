import { Router } from "express";
import { loadAll, loadById, mutate, upsert } from "../lib/storage";
import { computeStaleness } from "../lib/staleness";
import { metricsSource } from "../lib/metrics-source";
import { findSimilar } from "../lib/similarity";
import { recommend, type Recommendation } from "../lib/recommendation";
import type {
  PublishedArticle,
  Staleness,
} from "../lib/types";

/**
 * Phase E — Published Library routes.
 *
 * Mirrors the shape of articlesRouter but for the post-publish lifecycle:
 *   GET    /                  list (with staleness computed)
 *   GET    /:id               detail (with staleness)
 *   PATCH  /:id               edit body / title / SEO (bumps version)
 *   PATCH  /:id/archive       toggle archivedAt (replaces the old /lifecycle route)
 *   PATCH  /:id/review        marks last-reviewed = now (cadence reset)
 */
export const publishedArticlesRouter = Router();

type PublishedArticleEnriched = PublishedArticle & {
  staleness: Staleness;
  /** Only present on detail responses — list view skips this for payload size. */
  similar?: PublishedSimilarMatch[];
  /** Only present on detail responses. */
  recommendation?: Recommendation;
};

export type PublishedSimilarMatch = {
  id: string;
  title: string;
  market: PublishedArticle["market"];
  contentType: PublishedArticle["contentType"];
  score: number;
  sharedCountries: string[];
  stalenessLevel: Staleness["level"];
  views30d: number;
};

async function withStaleness(
  article: PublishedArticle,
): Promise<PublishedArticleEnriched> {
  // The metrics source is currently JSON-backed — a future SN PA impl would
  // refresh `article.metrics` from the source before computing staleness.
  const metrics = await metricsSource.read(article);
  const enriched = { ...article, metrics };
  return { ...enriched, staleness: computeStaleness(enriched) };
}

/**
 * Detail-only enrichment. Adds the similarity matches over the rest of the
 * published corpus, plus a single recommended next action. Kept separate from
 * `withStaleness` so the list endpoint stays cheap.
 */
async function withSimilarAndRecommendation(
  article: PublishedArticle,
  staleness: Staleness,
): Promise<{
  similar: PublishedSimilarMatch[];
  recommendation: Recommendation;
}> {
  const corpus = await loadAll<PublishedArticle>("publishedArticles");
  const others = corpus.filter((a) => a.id !== article.id);
  const matches = findSimilar(
    {
      title: article.title,
      summary: article.seo?.metaDescription ?? "",
      countries: article.countries ?? [],
    },
    others.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      countries: a.countries ?? [],
      // Stash the full record so we can re-attach view + staleness info
      // on the way out without a second lookup.
      __article: a,
    })),
    { limit: 5, threshold: 0.18 },
  );

  const similar: PublishedSimilarMatch[] = matches.map((m) => {
    const full = (m.item as any).__article as PublishedArticle;
    const s = computeStaleness(full);
    return {
      id: full.id,
      title: full.title,
      market: full.market,
      contentType: full.contentType,
      score: Number(m.score.toFixed(3)),
      sharedCountries: m.sharedCountries,
      stalenessLevel: s.level,
      views30d: full.metrics.views30d,
    };
  });

  const recommendation = recommend(article, staleness, matches);
  return { similar, recommendation };
}

publishedArticlesRouter.get("/", async (_req, res) => {
  const all = await loadAll<PublishedArticle>("publishedArticles");
  const enriched = await Promise.all(all.map(withStaleness));
  // Default order: most-recently-published first.
  enriched.sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
  res.json(enriched);
});

publishedArticlesRouter.get("/:id", async (req, res) => {
  const article = await loadById<PublishedArticle>(
    "publishedArticles",
    req.params.id,
  );
  if (!article) return res.status(404).json({ error: "not found" });
  const base = await withStaleness(article);
  const extras = await withSimilarAndRecommendation(article, base.staleness);
  res.json({ ...base, ...extras });
});

publishedArticlesRouter.patch("/:id", async (req, res) => {
  const { body, title, seo } = req.body as {
    body?: string;
    title?: string;
    seo?: PublishedArticle["seo"];
  };
  try {
    const updated = await mutate<PublishedArticle>(
      "publishedArticles",
      req.params.id,
      (cur) => ({
        ...cur,
        body: typeof body === "string" ? body : cur.body,
        title: typeof title === "string" ? title : cur.title,
        seo: seo ?? cur.seo,
        version: cur.version + 1,
      }),
    );
    res.json(await withStaleness(updated));
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? String(e) });
  }
});

publishedArticlesRouter.patch("/:id/archive", async (req, res) => {
  const { archived, archivedBy } = req.body as {
    archived: boolean;
    /** Display name of the admin performing the action — surfaced in the
     *  staleness panel's "Archived by X" line. */
    archivedBy?: string;
  };
  if (typeof archived !== "boolean") {
    return res.status(400).json({ error: "archived must be a boolean" });
  }
  try {
    const updated = await mutate<PublishedArticle>(
      "publishedArticles",
      req.params.id,
      (cur) => {
        if (archived) {
          // Already archived? leave the existing timestamp so we don't
          // overwrite the original archive event when the client re-fires.
          return {
            ...cur,
            archivedAt: cur.archivedAt ?? new Date().toISOString(),
            archivedBy: cur.archivedBy ?? archivedBy ?? cur.archivedBy,
          };
        }
        // Unarchive: drop both fields cleanly so JSON serialization doesn't
        // leak nullable artifacts.
        const next = { ...cur };
        delete next.archivedAt;
        delete next.archivedBy;
        return next;
      },
    );
    res.json(await withStaleness(updated));
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? String(e) });
  }
});

/**
 * Marks the article as freshly reviewed. Used by the "Mark as reviewed" action
 * in the library — resets the cadence clock for the staleness scorer without
 * editing the body.
 */
publishedArticlesRouter.patch("/:id/review", async (req, res) => {
  const reviewer =
    (req.body?.reviewer as string | undefined) ?? "Demo Reviewer";
  try {
    const updated = await mutate<PublishedArticle>(
      "publishedArticles",
      req.params.id,
      (cur) => ({
        ...cur,
        lastReviewedAt: new Date().toISOString(),
        lastReviewer: reviewer,
      }),
    );
    res.json(await withStaleness(updated));
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? String(e) });
  }
});
