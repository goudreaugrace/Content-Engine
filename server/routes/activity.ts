/**
 * GET /api/activity — returns the derived activity feed (recent state-change
 * events across articles + published articles). See server/lib/activity.ts
 * for the derivation logic. Used by the notification badge and the recent-
 * activity widget on the Review Cycle page.
 */

import { Router } from "express";
import { buildActivityFeed } from "../lib/activity";

export const activityRouter = Router();

activityRouter.get("/", async (_req, res) => {
  try {
    const events = await buildActivityFeed();
    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});
