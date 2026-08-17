import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const DAY = 24 * 60 * 60 * 1000;
const runtimeState = globalThis.__contentEngineRuntimeState ??= {};

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8"));
  } catch {
    return fallback;
  }
}

function readDirJson(dir) {
  const full = path.join(DATA_DIR, dir);
  try {
    return Object.fromEntries(
      fs.readdirSync(full)
        .filter((name) => name.endsWith(".json"))
        .map((name) => [path.basename(name, ".json"), JSON.parse(fs.readFileSync(path.join(full, name), "utf8"))]),
    );
  } catch {
    return {};
  }
}

function data() {
  runtimeState.articles ??= readJson("articles.json", []).map(withArticleDefaults);
  runtimeState.publishedArticles ??= readJson("published-articles.json", []);
  runtimeState.jobs ??= readJson("jobs.json", []);
  runtimeState.emails ??= readJson("emails.json", []);
  return {
    articles: runtimeState.articles,
    publishedArticles: runtimeState.publishedArticles,
    jobs: runtimeState.jobs,
    emails: runtimeState.emails,
    countries: readJson("country-catalog.json", []),
    markets: readDirJson("market-profiles"),
    sectors: readDirJson("sector-profiles"),
    audiences: readDirJson("audience-profiles"),
  };
}

function send(res, status, value) {
  res.status(status).setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}

function notFound(res) {
  send(res, 404, { error: "not found" });
}

function methodNotAllowed(res) {
  send(res, 405, { error: "method not allowed" });
}

function withArticleDefaults(article) {
  return {
    countries: [],
    seo: { title: "", metaDescription: "", keywords: [] },
    ...article,
    countries: Array.isArray(article?.countries) ? article.countries : [],
    seo: { title: "", metaDescription: "", keywords: [], ...(article?.seo || {}) },
  };
}

function daysSince(iso) {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / DAY);
}

function timeScore(days, weight, softCap) {
  const x = days / softCap;
  return Math.round(weight * (x / (1 + x)));
}

function trafficScore(views30d, weight) {
  if (views30d >= 30) return 0;
  return Math.round(weight * (1 - views30d / 30));
}

function trendScore(trend, weight) {
  if (trend === "down") return weight;
  if (trend === "flat") return Math.round(weight * 0.4);
  return 0;
}

function computeStaleness(article) {
  if (article.archivedAt) {
    return {
      score: 100,
      level: "archived",
      reasons: [article.archivedBy ? `Archived by ${article.archivedBy}.` : "Archived."],
    };
  }

  const metrics = article.metrics || { views30d: 0, trend: "flat" };
  const reviewedAt = article.lastReviewedAt || article.publishedAt;
  const reviewDays = daysSince(reviewedAt);
  const publishDays = daysSince(article.publishedAt);
  const reasons = [];

  if (reviewDays > 180) reasons.push(`Not reviewed in ${Math.round(reviewDays)} days (cadence: 180 days).`);
  if (publishDays > 365) reasons.push(`Published ${Math.round(publishDays / 30)} months ago.`);
  if (metrics.views30d < 30) reasons.push(`${metrics.views30d} views in the last 30 days (target: >=30).`);
  if (metrics.trend === "down") reasons.push("Viewership trend is declining.");

  const score = Math.min(
    100,
    Math.max(
      0,
      timeScore(reviewDays, 35, 180) +
        timeScore(publishDays, 30, 365) +
        trafficScore(metrics.views30d, 25) +
        trendScore(metrics.trend, 10),
    ),
  );
  const level = score >= 65 ? "stale" : score >= 35 ? "aging" : "fresh";
  if (level === "fresh" && reasons.length === 0) reasons.push("Recently reviewed and getting steady traffic.");
  return { score, level, reasons };
}

function recommendation(article, staleness) {
  if (staleness.level === "archived") {
    return { kind: "noop", title: "Already archived", reason: "No action needed.", severity: "low", evidence: [], apply: { kind: "noop" } };
  }
  if (staleness.level === "stale" && (article.metrics?.views30d || 0) <= 10) {
    return {
      kind: "archive",
      title: "Archive low-engagement stale article",
      actionLabel: "Archive",
      reason: "Low recent traffic and stale review signals.",
      severity: "high",
      evidence: [{ signal: "traffic", label: "Low traffic", detail: "Below target views in the last 30 days.", severity: "high" }],
      apply: { kind: "archive" },
    };
  }
  if (staleness.level === "stale" || staleness.level === "aging") {
    return {
      kind: "mark-reviewed",
      title: staleness.level === "stale" ? "Refresh and mark reviewed" : "Review soon to reset cadence",
      actionLabel: "Review",
      reason: "Review cadence signal detected.",
      severity: staleness.level === "stale" ? "high" : "medium",
      evidence: [{ signal: "staleness", label: staleness.level, detail: staleness.reasons.join(" "), severity: staleness.level === "stale" ? "high" : "medium" }],
      apply: { kind: "mark-reviewed" },
    };
  }
  return { kind: "noop", title: "No immediate action", reason: "Fresh article.", severity: "low", evidence: [], apply: { kind: "noop" } };
}

function enrichedPublished(article) {
  const staleness = computeStaleness(article);
  return { ...article, staleness, recommendation: recommendation(article, staleness) };
}

function deterministicPublishedId(article) {
  return article.publishedArticleId || `pub-${String(article.id || Date.now()).replace(/^ka-/, "").slice(0, 8)}`;
}

function defaultFeedback() {
  return { helpful: 0, notHelpful: 0, shares: 0, comments: [] };
}

function publishedFromSource(article, reviewer = "Demo Reviewer") {
  const now = new Date().toISOString();
  return {
    id: deterministicPublishedId(article),
    sourceArticleId: article.id,
    originalSubmittedBy: article.submittedBy,
    originalSubmittedAt: article.submittedAt,
    reviewer,
    reviewedAt: article.reviewedAt || now,
    rejections: article.rejections || [],
    complianceIssues: article.complianceIssues || [],
    title: article.title,
    contentType: article.contentType,
    knowledgeBase: article.knowledgeBase,
    sector: article.sector,
    market: article.market,
    countries: Array.isArray(article.countries) ? article.countries : [],
    lead: article.lead,
    canonicalSlug: article.canonicalSlug,
    aliases: article.aliases || [],
    topics: article.topics || [],
    references: article.references || [],
    relatedArticleIds: article.relatedArticleIds || [],
    visibility: article.visibility,
    owner: article.owner || article.submittedBy?.name,
    effectiveAt: article.effectiveAt,
    nextReviewAt: article.nextReviewAt,
    approvedBy: article.approvedBy || reviewer,
    body: article.body,
    seo: article.seo || { title: article.title, metaDescription: article.lead || "", keywords: [] },
    globalJustification: article.globalJustification,
    translations: article.translations || {},
    publishedAt: article.publishedAt || article.reviewedAt || now,
    publishedBy: reviewer,
    version: article.version || 1,
    lastReviewedAt: article.reviewedAt || now,
    lastReviewer: reviewer,
    revisionHistory: article.revisionHistory || [{
      version: 1,
      at: article.reviewedAt || now,
      by: reviewer,
      summary: "Initial publish",
      title: article.title,
      body: article.body,
    }],
    metrics: article.metrics || { views30d: 0, viewsAllTime: 0, trend: "up" },
    feedback: article.feedback || defaultFeedback(),
  };
}

function upsert(items, next) {
  const idx = items.findIndex((item) => item.id === next.id);
  if (idx >= 0) items[idx] = next;
  else items.unshift(next);
  return next;
}

function findPublishedById(db, id) {
  const stored = db.publishedArticles.find((a) => a.id === id);
  if (stored) return stored;
  const source = db.articles.find((a) =>
    a.publishedArticleId === id ||
    deterministicPublishedId(a) === id ||
    a.id === id
  );
  return source ? publishedFromSource(source, source.reviewer || "Demo Reviewer") : null;
}

function listPublished(db) {
  const byId = new Map(db.publishedArticles.map((article) => [article.id, article]));
  db.articles.forEach((article) => {
    if (article.status === "published" || article.publishedArticleId) {
      const published = publishedFromSource(article, article.reviewer || "Demo Reviewer");
      if (!byId.has(published.id)) byId.set(published.id, published);
    }
  });
  return Array.from(byId.values());
}

function sortDesc(items, key) {
  return [...items].sort((a, b) => +new Date(b[key] || 0) - +new Date(a[key] || 0));
}

function fakeJob(input = {}) {
  return {
    id: `job-${Date.now()}`,
    status: "complete",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    input,
    trace: [],
    articleIds: [],
  };
}

export default function handler(req, res) {
  const db = data();
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/^\/api\/?/, "");
  const parts = pathname.split("/").filter(Boolean);
  const method = req.method || "GET";

  if (method === "OPTIONS") return send(res, 200, { ok: true });
  if (parts.length === 0 || parts[0] === "health") return send(res, 200, { ok: true, mockMode: true, ts: new Date().toISOString() });

  if (parts[0] === "articles") {
    if (parts.length === 1 && method === "GET") return send(res, 200, sortDesc(db.articles, "submittedAt"));
    if (parts.length === 2 && parts[1] === "similar" && method === "POST") return send(res, 200, { matches: [] });
    const article = db.articles.find((a) => a.id === parts[1]);
    if (!article) return notFound(res);
    if (parts.length === 2 && method === "GET") return send(res, 200, article);
    if (parts.length === 2 && method === "PATCH") return send(res, 200, upsert(db.articles, { ...article, ...req.body }));
    if (parts[2] === "owner" && method === "PATCH") return send(res, 200, { ...article, submittedBy: req.body?.submittedBy || article.submittedBy });
    if (parts[2] === "review" && method === "PATCH") {
      const reviewer = req.body?.reviewer || "Demo Reviewer";
      const reviewedAt = new Date().toISOString();
      if (req.body?.status === "approved") {
        const source = {
          ...article,
          status: "published",
          reviewedAt,
          reviewer,
          rejectionReason: undefined,
          infoNeeded: undefined,
        };
        const published = publishedFromSource(source, reviewer);
        const updated = { ...source, publishedArticleId: published.id };
        upsert(db.publishedArticles, published);
        upsert(db.articles, updated);
        return send(res, 200, updated);
      }
      return send(res, 200, upsert(db.articles, {
        ...article,
        status: req.body?.status || article.status,
        reviewedAt,
        reviewer,
        rejectionReason: req.body?.status === "rejected" ? (req.body?.rejectionReason || req.body?.note || "") : undefined,
        infoNeeded: req.body?.status === "needs-info" ? req.body?.note : undefined,
      }));
    }
    if (["revise", "revise-section"].includes(parts[2]) && method === "POST") return send(res, 200, { revisedBody: article.body, revisedSection: article.body, explanation: "Demo deployment keeps revisions simulated." });
    if (parts[2] === "resubmit" && method === "POST") return send(res, 200, { ...article, status: "needs-review", submittedAt: new Date().toISOString() });
    if (parts[2] === "translate" && method === "POST") return send(res, 200, { language: req.body?.target || "es", body: article.body });
    if (parts[2] === "compliance" && method === "PATCH") return send(res, 200, article);
    return methodNotAllowed(res);
  }

  if (parts[0] === "published-articles") {
    if (parts.length === 1 && method === "GET") return send(res, 200, sortDesc(listPublished(db).map(enrichedPublished), "publishedAt"));
    const article = findPublishedById(db, parts[1]);
    if (!article) return notFound(res);
    if (parts.length === 2 && method === "GET") return send(res, 200, { ...enrichedPublished(article), similar: [] });
    if (parts.length === 2 && method === "PATCH") return send(res, 200, enrichedPublished(upsert(db.publishedArticles, { ...article, ...req.body, version: (article.version || 1) + 1 })));
    if (parts[2] === "archive" && method === "PATCH") return send(res, 200, enrichedPublished(upsert(db.publishedArticles, { ...article, archivedAt: req.body?.archived === false ? undefined : new Date().toISOString(), archivedBy: req.body?.archivedBy || "Demo Admin" })));
    if (parts[2] === "review" && method === "PATCH") return send(res, 200, enrichedPublished(upsert(db.publishedArticles, { ...article, lastReviewedAt: new Date().toISOString(), lastReviewer: req.body?.reviewer || "Demo Admin" })));
    if (parts[2] === "consolidation-preview" && method === "POST") return send(res, 200, { primary: enrichedPublished(article), sources: [enrichedPublished(article)], previewTitle: article.title, coverage: ["Core guidance", "Metadata", "Owner governance"], conflicts: [], evidence: [] });
    if (parts[2] === "consolidate" && method === "POST") return send(res, 200, { job: fakeJob(), article: db.articles.find((a) => a.id === article.sourceArticleId) || db.articles[0] });
    return methodNotAllowed(res);
  }

  if (parts[0] === "jobs") {
    if (parts.length === 1 && method === "GET") return send(res, 200, sortDesc(db.jobs, "createdAt"));
    if (parts.length === 1 && method === "POST") return send(res, 200, fakeJob(req.body || {}));
    const job = db.jobs.find((j) => j.id === parts[1]);
    return job ? send(res, 200, job) : notFound(res);
  }

  if (parts[0] === "emails") {
    if (parts.length === 1 && method === "GET") return send(res, 200, sortDesc(db.emails, "sentAt"));
    if (parts[1] === "owner-alert" && method === "POST") {
      if (!req.body?.articleId || !req.body?.articleTitle || !req.body?.ownerName || !Array.isArray(req.body?.to) || !req.body?.reason) {
        return send(res, 400, { error: "articleId, articleTitle, ownerName, to, action, and reason are required" });
      }
      return send(res, 201, { id: `email-${Date.now()}`, to: req.body.to, subject: `Action requested: ${req.body.articleTitle}`, body: req.body.reason, sentAt: new Date().toISOString(), kind: "owner-alert", articleId: req.body.articleId, articleTitle: req.body.articleTitle });
    }
  }

  if (parts[0] === "countries") return send(res, 200, db.countries);
  if (parts[0] === "markets") {
    if (parts.length === 1) return send(res, 200, Object.values(db.markets));
    if (method === "PUT") return send(res, 200, req.body || db.markets[parts[1]] || {});
    return send(res, 200, db.markets[parts[1]] || {});
  }
  if (parts[0] === "sectors") {
    if (parts.length === 1) return send(res, 200, Object.values(db.sectors));
    if (parts[2] === "markets") return send(res, 200, Object.values(db.markets).filter((m) => m.sectorId === parts[1]));
    if (method === "PUT") return send(res, 200, req.body || db.sectors[parts[1]] || {});
    return send(res, 200, db.sectors[parts[1]] || {});
  }
  if (parts[0] === "audiences") {
    if (parts.length === 1) return send(res, 200, Object.values(db.audiences));
    if (method === "PUT") return send(res, 200, req.body || db.audiences[parts[1]] || {});
    return send(res, 200, db.audiences[parts[1]] || {});
  }

  if (parts[0] === "attention" || parts[0] === "activity") return send(res, 200, []);
  if (parts[0] === "uploads" && method === "POST") return send(res, 200, { id: `upload-${Date.now()}`, kind: "doc", title: req.body?.title || "Uploaded source", fileName: req.body?.fileName || "source.txt", filePath: "vercel-demo", mimeType: req.body?.mimeType || "text/plain" });
  if (parts[0] === "migrations" && parts[1] === "standardize" && method === "POST") return send(res, 200, { job: fakeJob(req.body || {}), article: { ...db.articles[0], id: `article-${Date.now()}`, title: req.body?.sourceTitle || "Standardized article", status: "needs-review" } });

  return notFound(res);
}
