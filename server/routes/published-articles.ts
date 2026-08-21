import { randomUUID } from "node:crypto";
import { Router } from "express";
import { loadAll, loadById, mutate, upsert } from "../lib/storage";
import { computeStaleness } from "../lib/staleness";
import { evaluate as evaluateApprovalRules } from "../lib/approval-rules";
import { runConsolidationAgent } from "../agents/consolidation-agent";
import { demoFindabilityMetrics, metricsSource } from "../lib/metrics-source";
import { findSimilar } from "../lib/similarity";
import { recommend, type Recommendation } from "../lib/recommendation";
import { buildKnowledgeGraph } from "../lib/knowledge-graph";
import {
  defaultFeedback,
  makeRevision,
  markTranslationsStale,
  normalizeArticleStandard,
} from "../lib/article-standard";
import type {
  Article,
  Job,
  PublishedArticle,
  Staleness,
  TraceEntry,
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

function deterministicPublishedId(article: Article): string {
  return (
    article.publishedArticleId ||
    `pub-${String(article.id || Date.now()).replace(/^ka-/, "").slice(0, 8)}`
  );
}

function publishedFromSource(article: Article, reviewer = "Demo Reviewer"): PublishedArticle {
  const nowIso = now();
  const reviewedAt = article.reviewedAt || nowIso;
  const metrics = (article as Article & { metrics?: PublishedArticle["metrics"] }).metrics;
  const feedback = (article as Article & { feedback?: PublishedArticle["feedback"] }).feedback;
  return normalizeArticleStandard({
    id: deterministicPublishedId(article),
    sourceArticleId: article.id,
    originalSubmittedBy: article.submittedBy,
    originalSubmittedAt: article.submittedAt,
    reviewer: article.reviewer || reviewer,
    reviewedAt,
    rejections: article.rejections,
    complianceIssues: article.complianceIssues,
    title: article.title,
    contentType: article.contentType,
    knowledgeBase: article.knowledgeBase,
    sector: article.sector,
    market: article.market,
    countries: article.countries,
    lead: article.lead,
    canonicalSlug: article.canonicalSlug,
    aliases: article.aliases,
    topics: article.topics,
    references: article.references,
    relatedArticleIds: article.relatedArticleIds,
    visibility: article.visibility,
    owner: article.owner || article.submittedBy.name,
    effectiveAt: article.effectiveAt,
    nextReviewAt: article.nextReviewAt,
    approvedBy: article.approvedBy || article.reviewer || reviewer,
    body: article.body,
    sections: article.sections,
    taxonomy: article.taxonomy,
    relationships: article.relationships,
    seo: article.seo,
    globalJustification: article.globalJustification,
    translations: article.translations,
    publishedAt: article.reviewedAt || article.submittedAt || nowIso,
    publishedBy: article.reviewer || reviewer,
    version: article.version || 1,
    lastReviewedAt: article.reviewedAt || nowIso,
    lastReviewer: article.reviewer || reviewer,
    revisionHistory: [{
      version: article.version || 1,
      at: reviewedAt,
      by: article.reviewer || reviewer,
      summary: "Initial publish",
      title: article.title,
      body: article.body,
    }],
    metrics: metrics ?? { views30d: 0, viewsAllTime: 0, trend: "up" },
    feedback: feedback ?? defaultFeedback(),
  });
}

async function listPublishedArticles(): Promise<PublishedArticle[]> {
  const [published, sourceArticles] = await Promise.all([
    loadAll<PublishedArticle>("publishedArticles"),
    loadAll<Article>("articles"),
  ]);
  const byId = new Map(
    published.map((article) => [article.id, normalizeArticleStandard(article)]),
  );

  for (const source of sourceArticles) {
    if (source.status !== "published" && !source.publishedArticleId) continue;
    const synthesized = publishedFromSource(source, source.reviewer || "Demo Reviewer");
    if (!byId.has(synthesized.id)) byId.set(synthesized.id, synthesized);
  }

  return Array.from(byId.values());
}

async function findPublishedArticle(id: string): Promise<PublishedArticle | null> {
  const stored = await loadById<PublishedArticle>("publishedArticles", id);
  if (stored) return normalizeArticleStandard(stored);

  const sources = await loadAll<Article>("articles");
  const source = sources.find(
    (article) =>
      article.id === id ||
      article.publishedArticleId === id ||
      deterministicPublishedId(article) === id,
  );
  return source ? publishedFromSource(source, source.reviewer || "Demo Reviewer") : null;
}

async function withStaleness(
  article: PublishedArticle,
): Promise<PublishedArticleEnriched> {
  // The metrics source is currently JSON-backed — a future SN PA impl would
  // refresh `article.metrics` from the source before computing staleness.
  const metrics = await metricsSource.read(article);
  const enriched = normalizeArticleStandard({ ...article, metrics, feedback: article.feedback ?? defaultFeedback() });
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
  const corpus = await listPublishedArticles();
  const others = corpus.filter((a) => a.id !== article.id).map((a) => normalizeArticleStandard(a));
  const matches = findSimilar(
    {
      title: article.title,
      summary: [article.lead, article.seo?.metaDescription, ...(article.aliases ?? [])].filter(Boolean).join(" "),
      countries: article.countries ?? [],
    },
    others.map((a) => ({
      id: a.id,
      title: a.title,
      body: [a.lead, a.body, ...(a.topics ?? []), ...(a.aliases ?? [])].filter(Boolean).join("\n"),
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
  const all = await listPublishedArticles();
  const enriched = await Promise.all(
    all.map(async (article) => {
      const base = await withStaleness(article);
      const extras = await withSimilarAndRecommendation(article, base.staleness);
      return { ...base, recommendation: extras.recommendation };
    }),
  );
  // Default order: most-recently-published first.
  enriched.sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );
  res.json(enriched);
});

publishedArticlesRouter.get("/knowledge-graph", async (_req, res) => {
  const all = await listPublishedArticles();
  res.json(buildKnowledgeGraph(all));
});

/**
 * Owner-only performance view. This keeps POC telemetry out of the admin
 * health feed, whose existing counts and recommendations must remain stable.
 */
publishedArticlesRouter.get("/:id/performance", async (req, res) => {
  const article = await findPublishedArticle(req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });
  res.json(demoFindabilityMetrics(article));
});

publishedArticlesRouter.get("/:id", async (req, res) => {
  const article = await findPublishedArticle(req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });
  const base = await withStaleness(article);
  const extras = await withSimilarAndRecommendation(article, base.staleness);
  res.json({ ...base, ...extras });
});

function now() {
  return new Date().toISOString();
}

function trace(agent: TraceEntry["agent"], label: string, output: unknown): TraceEntry {
  const at = now();
  return {
    agent,
    label,
    startedAt: at,
    endedAt: at,
    durationMs: 1,
    status: "success",
    output,
  };
}

async function sourceSet(primaryId: string, ids: string[]): Promise<PublishedArticle[]> {
  const uniqueIds = Array.from(new Set([primaryId, ...ids]));
  const sources = await Promise.all(
    uniqueIds.map((id) => findPublishedArticle(id)),
  );
  return sources.filter((a): a is PublishedArticle => !!a);
}

publishedArticlesRouter.post("/:id/consolidation-preview", async (req, res) => {
  const primary = await findPublishedArticle(req.params.id);
  if (!primary) return res.status(404).json({ error: "not found" });
  const base = await withStaleness(primary);
  const extras = await withSimilarAndRecommendation(primary, base.staleness);
  const bodyIds = req.body?.articleIds as string[] | undefined;
  const recommendedIds =
    extras.recommendation.apply.kind === "generate-draft"
      ? extras.recommendation.apply.candidateIds ?? []
      : [];
  const ids = bodyIds ?? recommendedIds;
  const sources = await sourceSet(primary.id, ids);
  const draft = await runConsolidationAgent({ primary, sources: sources.filter((s) => s.id !== primary.id) });
  res.json({
    primary,
    sources,
    previewTitle: draft.title,
    coverage: draft.coverage,
    conflicts: draft.conflicts,
    evidence: extras.recommendation.evidence,
  });
});

publishedArticlesRouter.post("/:id/consolidate", async (req, res) => {
  try {
    const primary = await findPublishedArticle(req.params.id);
    if (!primary) return res.status(404).json({ error: "not found" });
    const ids = (req.body?.articleIds as string[] | undefined) ?? [];
    const sources = await sourceSet(primary.id, ids);
    if (sources.length < 2) {
      return res.status(400).json({ error: "Select at least one additional article to consolidate." });
    }
    const draft = await runConsolidationAgent({
      primary,
      sources: sources.filter((s) => s.id !== primary.id),
    });
    const articleId = `ka-${randomUUID().slice(0, 8)}`;
    const jobId = `job-${randomUUID().slice(0, 8)}`;
    const baseArticle: Article = normalizeArticleStandard({
      id: articleId,
      jobId,
      title: draft.title,
      contentType: primary.contentType,
      sector: primary.sector,
      market: primary.market,
      countries: Array.from(new Set(sources.flatMap((s) => s.countries ?? []))),
      seo: draft.seo,
      replacesArticleIds: sources.map((s) => s.id),
      references: sources.flatMap((s) =>
        s.references?.length
          ? s.references
          : [{
              id: `ref-${s.id}`,
              title: `Published source: ${s.title}`,
              kind: "note" as const,
              source: "migration" as const,
              excerpt: s.lead ?? s.seo?.summary ?? s.body.slice(0, 220),
              addedAt: now(),
              addedBy: "Consolidation Agent",
            }],
      ),
      relatedArticleIds: sources.map((s) => s.id),
      body: draft.body,
      submittedBy: { name: "Consolidation Agent", email: "content-agent@pepsico.com" },
      submittedAt: now(),
      status: "needs-review",
      complianceIssues: [],
    }, { actor: "Consolidation Agent" });
    const ruling = evaluateApprovalRules(baseArticle);
    const article: Article = {
      ...baseArticle,
      approvalResults: ruling.reasons,
      autoApproveCandidate: ruling.decision === "auto-approve-candidate",
      ...(ruling.decision === "needs-info"
        ? {
            status: "needs-info" as const,
            infoNeeded: ruling.reasons
              .filter((r) => r.severity === "error")
              .map((r) => `- ${r.label}${r.reason ? ` - ${r.reason}` : ""}`)
              .join("\n"),
          }
        : {}),
    };
    const job: Job = {
      id: jobId,
      status: "complete",
      createdAt: now(),
      updatedAt: now(),
      input: {
        title: draft.title,
        contentType: primary.contentType,
        summary: `Consolidate ${sources.length} overlapping published articles into one master article.`,
        audience: "All employees",
        markets: [primary.market.toLowerCase()],
        sectors: primary.sector ? [primary.sector] : [],
        sourceText: sources.map((s) => `${s.title}\n${s.body}`).join("\n\n---\n\n"),
        submittedBy: article.submittedBy,
        countries: article.countries,
        seo: draft.seo,
      },
      articleIds: [article.id],
      trace: [
        trace("consolidation", "Detected overlap", {
          sourceCount: sources.length,
          sources: sources.map((s) => ({ id: s.id, title: s.title })),
        }),
        trace("consolidation", "Selected canonical source", {
          id: primary.id,
          title: primary.title,
        }),
        trace("consolidation", "Generated master draft", {
          title: draft.title,
          coverage: draft.coverage,
          conflicts: draft.conflicts,
        }),
        trace("compliance", "Validated metadata and review cadence", {
          summary: ruling.decision,
          issues: ruling.reasons.filter((r) => r.severity !== "ok"),
        }),
      ],
    };

    await upsert("articles", article);
    await upsert("jobs", job);
    await Promise.all(
      sources.map((source) =>
        mutate<PublishedArticle>("publishedArticles", source.id, (cur) => ({
          ...cur,
          replacedByArticleId: article.id,
          archivedReason: `Consolidation draft ${article.id} generated from this source. Publish the master article before archiving.`,
        })),
      ),
    );
    res.status(201).json({ job, article });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

publishedArticlesRouter.patch("/:id", async (req, res) => {
  const { body, title, seo, lead, references, relatedArticleIds, aliases, topics, visibility, owner, effectiveAt, nextReviewAt, approvedBy, sections, taxonomy, relationships, editor, summary } = req.body as {
    body?: string;
    title?: string;
    seo?: PublishedArticle["seo"];
    lead?: string;
    references?: PublishedArticle["references"];
    relatedArticleIds?: string[];
    aliases?: string[];
    topics?: string[];
    visibility?: PublishedArticle["visibility"];
    owner?: string;
    effectiveAt?: string;
    nextReviewAt?: string;
    approvedBy?: string;
    sections?: PublishedArticle["sections"];
    taxonomy?: PublishedArticle["taxonomy"];
    relationships?: PublishedArticle["relationships"];
    editor?: string;
    summary?: string;
  };
  try {
    const updated = await mutate<PublishedArticle>(
      "publishedArticles",
      req.params.id,
      (cur) => {
        const before = normalizeArticleStandard(cur);
        const bodyChanged = typeof body === "string" && body !== cur.body;
        const next: PublishedArticle = {
          ...cur,
          body: typeof body === "string" ? body : cur.body,
          title: typeof title === "string" ? title : cur.title,
          seo: seo ?? cur.seo,
          lead: typeof lead === "string" ? lead : cur.lead,
          references: references ?? cur.references,
          relatedArticleIds: relatedArticleIds ?? cur.relatedArticleIds,
          aliases: aliases ?? cur.aliases,
          topics: topics ?? cur.topics,
          visibility: visibility ?? cur.visibility,
          owner: owner ?? cur.owner,
          effectiveAt: effectiveAt ?? cur.effectiveAt,
          nextReviewAt: nextReviewAt ?? cur.nextReviewAt,
          approvedBy: approvedBy ?? cur.approvedBy,
          sections: sections ?? cur.sections,
          taxonomy: taxonomy ?? cur.taxonomy,
          relationships: relationships ?? cur.relationships,
          translations: bodyChanged ? markTranslationsStale(cur.translations) : cur.translations,
          version: cur.version + 1,
          revisionHistory: [
            ...(cur.revisionHistory ?? []),
            makeRevision(before, editor ?? "Demo Reviewer", summary ?? "Edited published article"),
          ],
        };
        return normalizeArticleStandard(next, { actor: editor ?? "Demo Reviewer" });
      },
    );
    res.json(await withStaleness(updated));
  } catch (e: any) {
    res.status(404).json({ error: e?.message ?? String(e) });
  }
});

publishedArticlesRouter.post("/:id/feedback", async (req, res) => {
  const { kind, comment, by } = req.body as {
    kind?: "helpful" | "notHelpful" | "share" | "comment";
    comment?: string;
    by?: string;
  };
  if (!kind || !["helpful", "notHelpful", "share", "comment"].includes(kind)) {
    return res.status(400).json({ error: "kind must be helpful, notHelpful, share, or comment" });
  }
  try {
    const updated = await mutate<PublishedArticle>(
      "publishedArticles",
      req.params.id,
      (cur) => {
        const feedback = cur.feedback ?? defaultFeedback();
        if (kind === "helpful") return { ...cur, feedback: { ...feedback, helpful: feedback.helpful + 1 } };
        if (kind === "notHelpful") return { ...cur, feedback: { ...feedback, notHelpful: feedback.notHelpful + 1 } };
        if (kind === "share") return { ...cur, feedback: { ...feedback, shares: feedback.shares + 1 } };
        const body = comment?.trim();
        if (!body) return cur;
        return {
          ...cur,
          feedback: {
            ...feedback,
            comments: [
              ...feedback.comments,
              {
                id: `comment-${randomUUID().slice(0, 8)}`,
                by: by?.trim() || "Demo User",
                body,
                at: new Date().toISOString(),
              },
            ],
          },
        };
      },
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
            archivedReason: cur.archivedReason ?? "Manual lifecycle action.",
          };
        }
        // Unarchive: drop both fields cleanly so JSON serialization doesn't
        // leak nullable artifacts.
        const next = { ...cur };
        delete next.archivedAt;
        delete next.archivedBy;
        delete next.archivedReason;
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
