import { randomUUID } from "node:crypto";
import { Router } from "express";
import { loadAll, upsert } from "../lib/storage";
import type { Article, Job, StubbedEmail } from "../lib/types";

export const emailsRouter = Router();

type EnrichedEmail = StubbedEmail & {
  market?: Article["market"];
  articleStatus?: Article["status"];
  articleTitle?: string;
};

emailsRouter.get("/", async (_req, res) => {
  const [emails, articles, jobs] = await Promise.all([
    loadAll<StubbedEmail>("emails"),
    loadAll<Article>("articles"),
    loadAll<Job>("jobs"),
  ]);

  const articleById = new Map(articles.map((a) => [a.id, a]));
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  const enriched: EnrichedEmail[] = emails.map((e) => {
    // Prefer the explicit articleId set at creation time. Fall back to the
    // first article on the linked job for older emails written before the
    // field existed.
    let article: Article | undefined = e.articleId ? articleById.get(e.articleId) : undefined;
    if (!article && e.jobId) {
      const job = jobById.get(e.jobId);
      const firstArticleId = job?.articleIds?.[0];
      if (firstArticleId) article = articleById.get(firstArticleId);
    }
    return {
      ...e,
      market: article?.market ?? e.market,
      articleStatus: article?.status ?? e.articleStatus,
      articleTitle: article?.title ?? e.articleTitle,
    };
  });

  enriched.sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt));
  res.json(enriched);
});


emailsRouter.post("/owner-alert", async (req, res) => {
  const { articleId, articleTitle, ownerName, to, action, reason } = req.body as {
    articleId?: string;
    articleTitle?: string;
    ownerName?: string;
    to?: string[];
    action?: string;
    reason?: string;
  };

  if (!articleId || !articleTitle || !ownerName || !Array.isArray(to) || to.length === 0 || !action || !reason?.trim()) {
    return res.status(400).json({ error: "articleId, articleTitle, ownerName, to, action, and reason are required" });
  }

  const actionLabel = {
    review: "review",
    update: "update",
    archive: "remove or archive",
    consolidate: "consolidate",
  }[action] ?? action;

  const email: StubbedEmail = {
    id: randomUUID(),
    to,
    subject: `Action requested: ${articleTitle}`,
    body: `Hi ${ownerName},\n\nDEEx content monitoring flagged "${articleTitle}" and requests that you ${actionLabel} this article.\n\nReason: ${reason.trim()}\n\nPlease review the article health signals and confirm the next step in DEEx.`,
    sentAt: new Date().toISOString(),
    kind: "owner-alert",
    articleId,
    articleTitle,
  };

  await upsert("emails", email);
  res.status(201).json(email);
});
