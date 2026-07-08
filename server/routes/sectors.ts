import { Router } from "express";
import {
  KNOWN_SECTOR_IDS,
  loadAllSectorProfiles,
  loadSectorProfile,
  saveSectorProfile,
  loadAllMarketProfiles,
} from "../lib/storage";
import type { SectorProfile } from "../lib/types";

/**
 * Sector routes.
 *
 *   GET  /            list of all sector profiles
 *   GET  /:id         single sector profile
 *   PUT  /:id         update sector-level fields (merged with existing)
 *   GET  /:id/markets markets belonging to this sector (helper for the admin editor)
 */
export const sectorsRouter = Router();

const KNOWN_IDS = new Set<string>(KNOWN_SECTOR_IDS);

sectorsRouter.get("/", async (_req, res) => {
  const profiles = await loadAllSectorProfiles();
  res.json(profiles);
});

sectorsRouter.get("/:id", async (req, res) => {
  if (!KNOWN_IDS.has(req.params.id))
    return res.status(404).json({ error: "unknown sector" });
  const profile = await loadSectorProfile(req.params.id);
  if (!profile) return res.status(404).json({ error: "not found" });
  res.json(profile);
});

sectorsRouter.get("/:id/markets", async (req, res) => {
  if (!KNOWN_IDS.has(req.params.id))
    return res.status(404).json({ error: "unknown sector" });
  const all = await loadAllMarketProfiles();
  const markets = all.filter((m) => m.sectorId === req.params.id);
  res.json(markets);
});

sectorsRouter.put("/:id", async (req, res) => {
  const id = req.params.id;
  if (!KNOWN_IDS.has(id))
    return res.status(404).json({ error: "unknown sector" });

  const incoming = req.body as Partial<SectorProfile>;
  const errors = validateProfile({ ...incoming, id });
  if (errors.length) return res.status(400).json({ error: errors.join("; ") });

  const existing = await loadSectorProfile(id);
  if (!existing) return res.status(404).json({ error: "profile not found" });

  const merged: SectorProfile = {
    ...existing,
    ...incoming,
    id, // never allow the id to change through PUT
  };
  const saved = await saveSectorProfile(merged);
  res.json(saved);
});

/**
 * Minimal server-side validation. Client already has a rich form UX;
 * these checks defend against malformed direct API calls.
 */
function validateProfile(p: Partial<SectorProfile>): string[] {
  const errs: string[] = [];
  if (p.id && typeof p.id !== "string") errs.push("id must be a string");
  if (p.name !== undefined && typeof p.name !== "string")
    errs.push("name must be a string");
  if (p.toneOfVoice !== undefined && typeof p.toneOfVoice !== "string")
    errs.push("toneOfVoice must be a string");
  if (p.contentStrategy !== undefined && typeof p.contentStrategy !== "string")
    errs.push("contentStrategy must be a string");
  if (p.contentGuidelines !== undefined && typeof p.contentGuidelines !== "string")
    errs.push("contentGuidelines must be a string");
  if (p.terminology !== undefined && typeof p.terminology !== "object")
    errs.push("terminology must be an object");
  if (p.bannedTerms !== undefined && !Array.isArray(p.bannedTerms))
    errs.push("bannedTerms must be an array");
  if (p.regulatoryNotes !== undefined && typeof p.regulatoryNotes !== "string")
    errs.push("regulatoryNotes must be a string");
  if (p.sources !== undefined && !Array.isArray(p.sources))
    errs.push("sources must be an array");
  return errs;
}
