import { Router } from "express";
import {
  KNOWN_MARKET_IDS,
  loadAllMarketProfiles,
  loadMarketProfile,
  saveMarketProfile,
} from "../lib/storage";
import type { MarketProfile } from "../lib/types";

export const marketsRouter = Router();

const KNOWN_IDS = new Set<string>(KNOWN_MARKET_IDS);

marketsRouter.get("/", async (_req, res) => {
  const profiles = await loadAllMarketProfiles();
  res.json(profiles);
});

marketsRouter.get("/:id", async (req, res) => {
  if (!KNOWN_IDS.has(req.params.id)) return res.status(404).json({ error: "unknown market" });
  const profile = await loadMarketProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "not found" });
  res.json(profile);
});

marketsRouter.put("/:id", async (req, res) => {
  const id = req.params.id;
  if (!KNOWN_IDS.has(id)) return res.status(404).json({ error: "unknown market" });

  const incoming = req.body as Partial<MarketProfile>;
  const errors = validateProfile({ ...incoming, id });
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  // Merge with existing to defend against accidental partial wipes
  const existing = await loadMarketProfile(id);
  if (!existing) return res.status(404).json({ error: "profile not found" });

  const merged: MarketProfile = {
    ...existing,
    ...incoming,
    id, // never let the ID change via PUT
  };
  const saved = await saveMarketProfile(merged);
  res.json(saved);
});

function validateProfile(p: Partial<MarketProfile> & { id: string }): string[] {
  const errors: string[] = [];
  const requireStr = (k: keyof MarketProfile) => {
    const v = p[k];
    if (typeof v !== "string" || !v.trim()) errors.push(`${String(k)} is required`);
  };
  requireStr("name");
  requireStr("language");
  requireStr("languageCode");
  requireStr("toneOfVoice");
  requireStr("contentStrategy");
  requireStr("contentGuidelines");
  requireStr("regulatoryNotes");
  requireStr("dateFormat");
  requireStr("currency");
  if (p.terminology && typeof p.terminology !== "object") errors.push("terminology must be an object");
  if (p.bannedTerms && !Array.isArray(p.bannedTerms)) errors.push("bannedTerms must be an array");
  if (p.reviewers && !Array.isArray(p.reviewers)) errors.push("reviewers must be an array");
  if (p.sources !== undefined && !Array.isArray(p.sources)) errors.push("sources must be an array");
  return errors;
}
