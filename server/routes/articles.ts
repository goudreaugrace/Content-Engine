import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  loadAll,
  loadById,
  loadMarketProfile,
  upsert,
} from "../lib/storage";
import type {
  Article,
  PublishedArticle,
  PublishedMetrics,
} from "../lib/types";
import { runRevisionInstructionAgent } from "../agents/revision-instruction-agent";
import { runSectionRevisionAgent } from "../agents/section-revision-agent";
import { runTranslationAgent } from "../agents/translation-agent";
import { findSimilar } from "../lib/similarity";
import { isMockMode } from "../lib/claude";
import {
  defaultFeedback,
  normalizeArticleStandard,
  translationBody,
} from "../lib/article-standard";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  ja: "Japanese",
  zh: "Chinese (Simplified)",
  ko: "Korean",
  hi: "Hindi",
  ar: "Arabic",
  ru: "Russian",
  pl: "Polish",
  tr: "Turkish",
};

/** Resolve a locale like "en-US" → ("en", "English"). Bare codes pass through. */
function resolveLanguage(code: string): { base: string; name: string } | null {
  const lower = code.toLowerCase();
  const base = lower.split("-")[0];
  const name = LANG_NAMES[base];
  if (!name) return null;
  return { base, name };
}

function languageForMarket(market: Article["market"]): { name: string; code: string } {
  switch (market) {
    case "MX": return { name: "Spanish (Mexican)", code: "es" };
    case "BR": return { name: "Portuguese (Brazilian)", code: "pt" };
    case "US": return { name: "English (US)", code: "en" };
    case "UK": return { name: "English (British)", code: "en" };
    case "IN": return { name: "English (Indian)", code: "en" };
    default: return { name: "English", code: "en" };
  }
}

export const articlesRouter = Router();

function extractTitle(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m?.[1]?.trim() ?? fallback;
}

function marketIdFor(article: Article): string | null {
  const map: Record<string, string> = {
    US: "us", MX: "mx", BR: "br", UK: "uk", IN: "in",
  };
  return map[article.market] ?? null;
}

articlesRouter.get("/", async (_req, res) => {
  const articles = await loadAll<Article>("articles");
  // newest first
  articles.sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
  res.json(articles.map((a) => normalizeArticleStandard(a)));
});

/**
 * Phase B — duplicate-detection lookup. Called by the new-article form as
 * the user fills out title + summary, before submission. Returns up to 5
 * existing articles ranked by TF-IDF cosine similarity (boosted by country
 * overlap). Frontend uses this to show a "looks similar to" panel.
 *
 * Note: defined BEFORE the /:id handler below so it doesn't get shadowed.
 */
articlesRouter.post("/similar", async (req, res) => {
  const { title, summary, countries } = req.body as {
    title?: string;
    summary?: string;
    countries?: string[];
  };
  if (!title?.trim() && !summary?.trim()) {
    return res.json({ matches: [] });
  }
  const corpus = await loadAll<Article>("articles");
  const published = await loadAll<PublishedArticle>("publishedArticles");
  const fullCorpus = [
    ...corpus.map((a) => normalizeArticleStandard(a)),
    ...published.map((a) => normalizeArticleStandard(a)),
  ];
  const matches = findSimilar(
    {
      title: title ?? "",
      summary: summary ?? "",
      countries: countries ?? [],
    },
    fullCorpus.map((a) => ({
      id: a.id,
      title: a.title,
      body: [
        a.lead,
        a.body,
        ...(a.aliases ?? []),
        ...(a.topics ?? []),
        ...(a.references ?? []).map((r) => `${r.title} ${r.excerpt ?? ""}`),
      ].filter(Boolean).join("\n"),
      countries: a.countries ?? [],
      // Carry the full article through so the response can include
      // status / market without a second lookup on the client.
      __article: a,
    })),
  );
  res.json({
    matches: matches.map((m) => ({
      id: m.item.id,
      title: m.item.title,
      score: Number(m.score.toFixed(3)),
      sharedCountries: m.sharedCountries,
      market: (m.item as any).__article.market as Article["market"],
      status: ((m.item as any).__article.status ?? "published") as Article["status"],
      contentType: (m.item as any).__article.contentType as Article["contentType"],
    })),
  });
});

articlesRouter.get("/:id", async (req, res) => {
  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });
  res.json(normalizeArticleStandard(article));
});


articlesRouter.patch("/:id/owner", async (req, res) => {
  const { submittedBy } = req.body as {
    submittedBy?: { name?: string; email?: string };
  };
  const name = submittedBy?.name?.trim();
  const email = submittedBy?.email?.trim();
  if (!name || !email) {
    return res.status(400).json({ error: "submittedBy.name and submittedBy.email are required" });
  }

  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });

  const updated: Article = {
    ...article,
    submittedBy: { name, email },
  };
  await upsert("articles", updated);
  res.json(updated);
});

articlesRouter.patch("/:id", async (req, res) => {
  const { body, title, seo } = req.body as {
    body?: string;
    title?: string;
    seo?: Article["seo"];
  };
  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });

  // At least one field has to change for the patch to be meaningful.
  if (body === undefined && title === undefined && seo === undefined) {
    return res
      .status(400)
      .json({ error: "Provide at least one of: body, title, seo." });
  }
  // Body is still validated when present — empty body would break the renderer.
  if (typeof body === "string" && !body.trim()) {
    return res.status(400).json({ error: "body cannot be empty" });
  }

  const nextBody = typeof body === "string" ? body : article.body;
  const nextTitle =
    title?.trim() ||
    (typeof body === "string" ? extractTitle(body, article.title) : article.title);
  // SEO can be updated holistically (whole object) without disturbing body/title.
  // Shallow merge here lets callers send a partial SEO payload if they want.
  const nextSeo = seo
    ? {
        title: typeof seo.title === "string" ? seo.title : article.seo.title,
        metaDescription:
          typeof seo.metaDescription === "string"
            ? seo.metaDescription
            : article.seo.metaDescription,
        keywords: Array.isArray(seo.keywords)
          ? seo.keywords
          : article.seo.keywords,
      }
    : article.seo;

  const updated: Article = {
    ...article,
    body: nextBody,
    title: nextTitle,
    seo: nextSeo,
  };
  const normalized = normalizeArticleStandard(updated);
  await upsert("articles", normalized);
  res.json(normalized);
});

articlesRouter.post("/:id/revise", async (req, res) => {
  const { instruction } = req.body as { instruction?: string };
  if (typeof instruction !== "string" || !instruction.trim()) {
    return res.status(400).json({ error: "instruction is required" });
  }
  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });

  const marketId = marketIdFor(article) ?? "us";
  const profile = await loadMarketProfile(marketId);
  if (!profile) return res.status(500).json({ error: `Market profile ${marketId} not found` });

  try {
    const result = await runRevisionInstructionAgent({
      currentBody: article.body,
      instruction: instruction.trim(),
      profile,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

articlesRouter.post("/:id/revise-section", async (req, res) => {
  const { section, instruction } = req.body as {
    section?: string;
    instruction?: string;
  };
  if (typeof section !== "string" || !section.trim()) {
    return res.status(400).json({ error: "section is required" });
  }
  if (typeof instruction !== "string" || !instruction.trim()) {
    return res.status(400).json({ error: "instruction is required" });
  }

  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });

  const marketId = marketIdFor(article) ?? "us";
  const profile = await loadMarketProfile(marketId);
  if (!profile) return res.status(500).json({ error: `Market profile ${marketId} not found` });

  try {
    const result = await runSectionRevisionAgent({
      section,
      instruction: instruction.trim(),
      profile,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// Phase E publish endpoint removed: approval is now an atomic operation
// inside PATCH /:id/review (see below). The source Article moves to
// status="published" in the same transaction that creates the
// PublishedArticle, so a separate publish call has no role.

/**
 * Phase P3.3 — dismiss a single compliance issue. Reviewer override for the
 * "this flag is wrong" case. Marks the issue dismissed (still visible in the
 * UI but struck through and excluded from the rules engine's error count).
 */
articlesRouter.patch("/:id/compliance/:issueIdx/dismiss", async (req, res) => {
  const issueIdx = parseInt(req.params.issueIdx, 10);
  if (Number.isNaN(issueIdx) || issueIdx < 0) {
    return res.status(400).json({ error: "issueIdx must be a non-negative integer" });
  }
  const { note, reviewer } = req.body as { note?: string; reviewer?: string };

  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });
  if (issueIdx >= article.complianceIssues.length) {
    return res.status(400).json({ error: "issueIdx out of range" });
  }

  const updatedIssues = article.complianceIssues.map((iss, i) =>
    i === issueIdx
      ? {
          ...iss,
          dismissed: true,
          dismissedBy: reviewer ?? "Demo Reviewer",
          dismissedAt: new Date().toISOString(),
          dismissalNote: note?.trim() || undefined,
        }
      : iss,
  );
  const updated: Article = { ...article, complianceIssues: updatedIssues };
  await upsert("articles", updated);
  res.json(updated);
});

/**
 * Reviewer actions allowed against the source article. "approved" is a
 * transient input that the endpoint translates to an immediate publish —
 * there is no persisted "approved" status. Approving creates the
 * PublishedArticle and bumps the source to status="published" in one
 * transaction.
 */
const REVIEW_ACTIONS = [
  "approved",
  "rejected",
  "needs-info",
  "needs-review",
] as const;
type ReviewAction = (typeof REVIEW_ACTIONS)[number];

articlesRouter.patch("/:id/review", async (req, res) => {
  const { status, reviewer, rejectionReason } = req.body as {
    status: ReviewAction;
    reviewer?: string;
    rejectionReason?: string;
  };
  if (!REVIEW_ACTIONS.includes(status)) {
    return res
      .status(400)
      .json({ error: `status must be one of: ${REVIEW_ACTIONS.join(", ")}` });
  }
  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });

  const { note } = req.body as { note?: string };
  const reviewedBy = reviewer ?? "Demo Reviewer";
  const reason = status === "rejected" ? (rejectionReason ?? note ?? "") : undefined;

  // ── Approve = atomic publish ──
  // Approving creates the PublishedArticle and marks the source as
  // status="published". No intermediate "approved" state. The source
  // persists as audit history; future edits happen on the PublishedArticle.
  if (status === "approved") {
    if (article.status === "published") {
      return res
        .status(400)
        .json({ error: "Article is already published" });
    }
    const initialMetrics: PublishedMetrics = {
      views30d: 0,
      viewsAllTime: 0,
      trend: "up",
    };
    const published: PublishedArticle = {
      id: `pub-${randomUUID().slice(0, 8)}`,
      sourceArticleId: article.id,
      originalSubmittedBy: article.submittedBy,
      originalSubmittedAt: article.submittedAt,
      reviewer: reviewedBy,
      reviewedAt: new Date().toISOString(),
      rejections: article.rejections,
      complianceIssues: article.complianceIssues,
      title: article.title,
      contentType: article.contentType,
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
      owner: article.owner,
      effectiveAt: article.effectiveAt,
      nextReviewAt: article.nextReviewAt,
      approvedBy: article.approvedBy ?? reviewedBy,
      body: article.body,
      seo: article.seo,
      globalJustification: article.globalJustification,
      translations: article.translations,
      publishedAt: new Date().toISOString(),
      publishedBy: reviewedBy,
      version: 1,
      lastReviewedAt: new Date().toISOString(),
      lastReviewer: reviewedBy,
      revisionHistory: [{
        version: 1,
        at: new Date().toISOString(),
        by: reviewedBy,
        summary: "Initial publish",
        title: article.title,
        body: article.body,
      }],
      metrics: initialMetrics,
      feedback: defaultFeedback(),
    };
    await upsert("publishedArticles", normalizeArticleStandard(published));
    const updatedSource: Article = {
      ...article,
      status: "published",
      reviewedAt: new Date().toISOString(),
      reviewer: reviewedBy,
      rejectionReason: undefined,
      infoNeeded: undefined,
      publishedArticleId: published.id,
    };
    await upsert("articles", updatedSource);
    return res.json(updatedSource);
  }

  const updated: Article = {
    ...article,
    status,
    reviewedAt: new Date().toISOString(),
    reviewer: reviewedBy,
    rejectionReason: status === "rejected" ? reason : undefined,
    infoNeeded: status === "needs-info" ? note : undefined,
  };
  await upsert("articles", updated);
  res.json(updated);
});

/**
 * Resubmit a rejected article for review. The current rejection (reason +
 * snapshot of the body that was rejected) is moved into the rejections log,
 * the live rejection fields are cleared, version is incremented, and status
 * flips back to "needs-review".
 */
articlesRouter.post("/:id/resubmit", async (req, res) => {
  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });
  if (article.status !== "rejected") {
    return res
      .status(400)
      .json({ error: "Only rejected articles can be resubmitted" });
  }

  const currentVersion = article.version ?? 1;
  const entry = {
    at: article.reviewedAt ?? new Date().toISOString(),
    by: article.reviewer ?? "Demo Reviewer",
    reason: article.rejectionReason ?? "",
    version: currentVersion,
    // Snapshot whatever body was on the article at the moment of rejection.
    // If edits happened between reject and resubmit, the user has already
    // changed the live body — but that's fine: the snapshot stored here is
    // the most recent body we have at the time of resubmit, which is the
    // version the reviewer rejected unless the author edited in-place.
    body: article.body,
  };

  const updated: Article = {
    ...article,
    status: "needs-review",
    version: currentVersion + 1,
    rejections: [...(article.rejections ?? []), entry],
    // Clear the live rejection fields — they now live in history.
    rejectionReason: undefined,
    reviewedAt: undefined,
    reviewer: undefined,
  };
  await upsert("articles", updated);
  res.json(updated);
});

articlesRouter.post("/:id/translate", async (req, res) => {
  const raw = ((req.body as { target?: string })?.target ?? "en").toLowerCase();
  const resolved = resolveLanguage(raw);
  if (!resolved) {
    return res
      .status(400)
      .json({ error: `Unsupported target language: ${raw}` });
  }

  const article = await loadById<Article>("articles", req.params.id);
  if (!article) return res.status(404).json({ error: "not found" });

  // Cache lookup: try the exact target first (e.g. "en-US"), then base lang
  // ("en") so existing pre-baked translations still resolve when the client
  // asks for a region-qualified locale.
  const cached =
    translationBody(article.translations?.[raw]) ??
    translationBody(article.translations?.[resolved.base]);
  if (cached) return res.json({ language: raw, body: cached });

  const source = languageForMarket(article.market);
  if (source.code === resolved.base) {
    // Same base language as the article — no translation needed.
    return res.json({ language: raw, body: article.body });
  }

  try {
    const translated = await runTranslationAgent({
      body: article.body,
      sourceLanguage: source.name,
      targetLanguage: resolved.name,
    });

    // Only cache real translations. In mock mode the agent returns a placeholder;
    // caching it would poison future requests once a real API key is added.
    if (!isMockMode) {
      const updated: Article = {
        ...article,
        translations: {
          ...(article.translations ?? {}),
          [raw]: {
            body: translated,
            status: "current",
            sourceVersion: article.version ?? 1,
            translatedAt: new Date().toISOString(),
            translatedBy: "Translation Agent",
          },
        },
      };
      await upsert("articles", updated);
    }
    res.json({ language: raw, body: translated });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});
