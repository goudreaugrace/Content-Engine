import { Router } from "express";
import {
  KNOWN_AUDIENCE_IDS,
  loadAllAudienceProfiles,
  loadAudienceProfile,
  saveAudienceProfile,
} from "../lib/storage";
import type { AudienceProfile } from "../lib/types";

export const audiencesRouter = Router();

const KNOWN_IDS = new Set<string>(KNOWN_AUDIENCE_IDS);

audiencesRouter.get("/", async (_req, res) => {
  const profiles = await loadAllAudienceProfiles();
  res.json(profiles);
});

audiencesRouter.get("/:id", async (req, res) => {
  if (!KNOWN_IDS.has(req.params.id)) {
    return res.status(404).json({ error: "unknown audience" });
  }
  const profile = await loadAudienceProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "not found" });
  res.json(profile);
});

audiencesRouter.put("/:id", async (req, res) => {
  const id = req.params.id;
  if (!KNOWN_IDS.has(id)) {
    return res.status(404).json({ error: "unknown audience" });
  }
  const incoming = req.body as Partial<AudienceProfile>;
  const errors = validate({ ...incoming, id });
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const existing = await loadAudienceProfile(id);
  if (!existing) return res.status(404).json({ error: "profile not found" });

  const merged: AudienceProfile = { ...existing, ...incoming, id };
  res.json(await saveAudienceProfile(merged));
});

function validate(p: Partial<AudienceProfile> & { id: string }): string[] {
  const errors: string[] = [];
  const requireStr = (k: keyof AudienceProfile) => {
    const v = p[k];
    if (typeof v !== "string" || !v.trim())
      errors.push(`${String(k)} is required`);
  };
  requireStr("label");
  requireStr("summary");
  requireStr("toneOfVoice");
  requireStr("readingContext");
  requireStr("contentGuidelines");
  if (p.sources !== undefined && !Array.isArray(p.sources))
    errors.push("sources must be an array");
  return errors;
}
