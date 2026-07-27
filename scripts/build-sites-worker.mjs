import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "server", "data");
const distDir = path.join(root, "dist");
const serverDir = path.join(distDir, "server");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  } catch {
    return fallback;
  }
}

function readDirJson(dir) {
  const full = path.join(dataDir, dir);
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

const payload = {
  articles: readJson("articles.json", []),
  publishedArticles: readJson("published-articles.json", []),
  jobs: readJson("jobs.json", []),
  emails: readJson("emails.json", []),
  countries: readJson("country-catalog.json", []),
  deexRules: readJson("deex-rules.json", {}),
  markets: readDirJson("market-profiles"),
  sectors: readDirJson("sector-profiles"),
  audiences: readDirJson("audience-profiles"),
};

const worker = `const DATA = ${JSON.stringify(payload)};
const DAY = 24 * 60 * 60 * 1000;
const json = (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) } });
const notFound = () => json({ error: "not found" }, { status: 404 });
const badRequest = (message) => json({ error: message }, { status: 400 });
const nowIso = () => new Date().toISOString();

function daysSince(iso) { return Math.max(0, (Date.now() - new Date(iso).getTime()) / DAY); }
function timeScore(days, weight, softCap) { const x = days / softCap; return Math.round(weight * (x / (1 + x))); }
function trafficScore(views30d, weight) { return views30d >= 30 ? 0 : Math.round(weight * (1 - views30d / 30)); }
function trendScore(trend, weight) { return trend === "down" ? weight : trend === "flat" ? Math.round(weight * 0.4) : 0; }
function computeStaleness(article) {
  if (article.archivedAt) return { score: 100, level: "archived", reasons: [article.archivedBy ? \`Archived by \${article.archivedBy}.\` : "Archived."] };
  const reasons = [];
  const reviewedAt = article.lastReviewedAt || article.publishedAt;
  const reviewDays = daysSince(reviewedAt);
  const publishDays = daysSince(article.publishedAt);
  if (reviewDays > 180) reasons.push(\`Not reviewed in \\${Math.round(reviewDays)} days (cadence: 180 days).\`);
  if (publishDays > 365) reasons.push(\`Published \\${Math.round(publishDays / 30)} months ago.\`);
  if ((article.metrics?.views30d || 0) < 30) reasons.push(\`\${article.metrics?.views30d || 0} views in the last 30 days (target: >=30).\`);
  if (article.metrics?.trend === "down") reasons.push("Viewership trend is declining.");
  const score = Math.min(100, Math.max(0, timeScore(reviewDays, 35, 180) + timeScore(publishDays, 30, 365) + trafficScore(article.metrics?.views30d || 0, 25) + trendScore(article.metrics?.trend || "flat", 10)));
  const level = score >= 65 ? "stale" : score >= 35 ? "aging" : "fresh";
  if (level === "fresh" && reasons.length === 0) reasons.push("Recently reviewed and getting steady traffic.");
  return { score, level, reasons };
}
function recommend(article, staleness) {
  if (staleness.level === "archived") return { kind: "noop", title: "Already archived", reason: "No action needed.", severity: "low", evidence: [], apply: { kind: "noop" } };
  if (staleness.level === "stale" && (article.metrics?.views30d || 0) <= 10) return { kind: "archive", title: "Archive low-engagement stale article", actionLabel: "Archive", reason: "Low recent traffic and stale review signals.", severity: "high", evidence: [{ signal: "traffic", label: "Low traffic", detail: "Below target views in the last 30 days.", severity: "high" }], apply: { kind: "archive" } };
  if (staleness.level === "stale" || staleness.level === "aging") return { kind: "mark-reviewed", title: staleness.level === "stale" ? "Refresh and mark reviewed" : "Review soon", actionLabel: "Review", reason: "Review cadence signal detected.", severity: staleness.level === "stale" ? "high" : "medium", evidence: [{ signal: "staleness", label: staleness.level, detail: staleness.reasons.join(" "), severity: staleness.level === "stale" ? "high" : "medium" }], apply: { kind: "mark-reviewed" } };
  return { kind: "noop", title: "No immediate action", reason: "Fresh article.", severity: "low", evidence: [], apply: { kind: "noop" } };
}
function withArticleDefaults(article) {
  return { countries: [], seo: { title: "", metaDescription: "", keywords: [] }, ...article, seo: { title: "", metaDescription: "", keywords: [], ...(article.seo || {}) }, countries: Array.isArray(article.countries) ? article.countries : [] };
}
function enrichedPublished(article) {
  const staleness = computeStaleness(article);
  return { ...article, staleness, recommendation: recommend(article, staleness) };
}
function sortedByDate(items, key) { return [...items].sort((a,b) => +new Date(b[key] || 0) - +new Date(a[key] || 0)); }
async function bodyJson(request) { try { return await request.json(); } catch { return {}; } }

async function handleApi(request, url) {
  const path = url.pathname;
  if (path === "/api/health") return json({ ok: true, ts: nowIso(), mockMode: true });
  if (path === "/api/articles" && request.method === "GET") return json(sortedByDate(DATA.articles.map(withArticleDefaults), "submittedAt"));
  let match = path.match(/^\\/api\\/articles\\/([^/]+)$/);
  if (match && request.method === "GET") return json(withArticleDefaults(DATA.articles.find((a) => a.id === match[1]) || {}));
  match = path.match(/^\\/api\\/articles\\/([^/]+)\\/owner$/);
  if (match && request.method === "PATCH") { const body = await bodyJson(request); const article = DATA.articles.find((a) => a.id === match[1]); return article ? json({ ...withArticleDefaults(article), submittedBy: body.submittedBy || article.submittedBy }) : notFound(); }
  if (path === "/api/published-articles" && request.method === "GET") return json(sortedByDate(DATA.publishedArticles.map(enrichedPublished), "publishedAt"));
  match = path.match(/^\\/api\\/published-articles\\/([^/]+)$/);
  if (match && request.method === "GET") { const article = DATA.publishedArticles.find((a) => a.id === match[1]); return article ? json({ ...enrichedPublished(article), similar: [] }) : notFound(); }
  match = path.match(/^\\/api\\/published-articles\\/([^/]+)\\/archive$/);
  if (match && request.method === "PATCH") { const article = DATA.publishedArticles.find((a) => a.id === match[1]); return article ? json(enrichedPublished({ ...article, archivedAt: nowIso(), archivedBy: "Demo Admin", archivedReason: "Archived from shared POC." })) : notFound(); }
  match = path.match(/^\\/api\\/published-articles\\/([^/]+)\\/review$/);
  if (match && request.method === "PATCH") { const article = DATA.publishedArticles.find((a) => a.id === match[1]); return article ? json(enrichedPublished({ ...article, lastReviewedAt: nowIso(), lastReviewer: "Demo Admin" })) : notFound(); }
  match = path.match(/^\\/api\\/published-articles\\/([^/]+)\\/consolidation-preview$/);
  if (match && request.method === "POST") { const primary = DATA.publishedArticles.find((a) => a.id === match[1]); return primary ? json({ primary: enrichedPublished(primary), sources: [enrichedPublished(primary)], previewTitle: primary.title, coverage: ["Core guidance", "Owner review", "DEEx metadata"], conflicts: [], evidence: [] }) : notFound(); }
  match = path.match(/^\\/api\\/published-articles\\/([^/]+)\\/consolidate$/);
  if (match && request.method === "POST") { const primary = DATA.publishedArticles.find((a) => a.id === match[1]); return primary ? json({ job: { id: "job-sites-demo", status: "complete", createdAt: nowIso(), updatedAt: nowIso(), input: {}, trace: [], articleIds: [primary.sourceArticleId] }, article: withArticleDefaults(DATA.articles.find((a) => a.id === primary.sourceArticleId) || DATA.articles[0]) }) : notFound(); }
  if (path === "/api/emails" && request.method === "GET") return json(sortedByDate(DATA.emails, "sentAt"));
  if (path === "/api/emails/owner-alert" && request.method === "POST") { const body = await bodyJson(request); if (!body.articleId || !body.articleTitle || !body.ownerName || !Array.isArray(body.to) || !body.reason) return badRequest("articleId, articleTitle, ownerName, to, action, and reason are required"); return json({ id: crypto.randomUUID(), to: body.to, subject: \`Action requested: \\${body.articleTitle}\`, body: body.reason, sentAt: nowIso(), kind: "owner-alert", articleId: body.articleId, articleTitle: body.articleTitle }, { status: 201 }); }
  if (path === "/api/jobs" && request.method === "GET") return json(sortedByDate(DATA.jobs, "createdAt"));
  match = path.match(/^\\/api\\/jobs\\/([^/]+)$/);
  if (match && request.method === "GET") return json(DATA.jobs.find((j) => j.id === match[1]) || {});
  if (path === "/api/countries") return json(DATA.countries);
  if (path === "/api/markets") return json(Object.values(DATA.markets));
  match = path.match(/^\\/api\\/markets\\/([^/]+)$/); if (match) return json(DATA.markets[match[1]] || {});
  if (path === "/api/sectors") return json(Object.values(DATA.sectors));
  match = path.match(/^\\/api\\/sectors\\/([^/]+)$/); if (match) return json(DATA.sectors[match[1]] || {});
  if (path === "/api/audiences") return json(Object.values(DATA.audiences));
  match = path.match(/^\\/api\\/audiences\\/([^/]+)$/); if (match) return json(DATA.audiences[match[1]] || {});
  if (path === "/api/activity") return json([]);
  if (path === "/api/attention") return json([]);
  if (path === "/api/articles/similar") return json({ matches: [] });
  if (path === "/api/migrations/standardize" && request.method === "POST") return json({ job: { id: "job-migration-demo", status: "complete", createdAt: nowIso(), updatedAt: nowIso(), input: {}, trace: [], articleIds: [] }, article: withArticleDefaults(DATA.articles[0]) });
  return notFound();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, url);
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return assetResponse;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  }
};
`;

fs.mkdirSync(serverDir, { recursive: true });
fs.writeFileSync(path.join(serverDir, "index.js"), worker);
console.log(path.join(serverDir, "index.js"));
