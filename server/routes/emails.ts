import { Router } from "express";
import { loadAll } from "../lib/storage";
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
      market: article?.market,
      articleStatus: article?.status,
      articleTitle: article?.title,
    };
  });

  enriched.sort((a, b) => +new Date(b.sentAt) - +new Date(a.sentAt));
  res.json(enriched);
});
