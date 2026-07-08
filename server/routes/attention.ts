import { Router } from "express";
import { buildAttentionFeed } from "../lib/attention";

/**
 * Phase F — unified "needs attention" feed. Returns one flat list of every
 * draft / job / published article that needs a human's action right now,
 * sorted by urgency. The dashboard + review queue both consume this.
 */
export const attentionRouter = Router();

attentionRouter.get("/", async (_req, res) => {
  const items = await buildAttentionFeed();
  res.json(items);
});
