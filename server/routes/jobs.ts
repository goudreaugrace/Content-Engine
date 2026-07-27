import { Router } from "express";
import { loadAll, loadById, loadCountryCatalog } from "../lib/storage";
import { createJob, orchestrate } from "../agents/orchestrator";
import { readMarkets, type Job, type JobInput } from "../lib/types";

/** All single-region market ids. "global" is a meta-id that expands to all of these. */
const SINGLE_MARKET_IDS = ["us", "mx", "br", "uk", "in"] as const;
const VALID_MARKET_IDS = new Set<string>([...SINGLE_MARKET_IDS, "global"]);

export const jobsRouter = Router();

/**
 * Validate a submission against Phase A rules. Returns null if valid, or
 * { field, message } for the first failure encountered. Order matters —
 * we surface the highest-leverage failure first (missing content > missing
 * metadata > borderline SEO formatting).
 */
async function validateJobInput(
  input: JobInput,
): Promise<{ field: string; message: string } | null> {
  // Core content presence
  if (!input?.title && !input?.summary) {
    return { field: "title", message: "title and/or summary required" };
  }
  if (!input?.contentType) {
    return { field: "contentType", message: "contentType is required" };
  }
  // Markets: at least one selected; "global" is allowed as a meta-id.
  const markets = readMarkets(input);
  if (markets.length === 0) {
    return { field: "markets", message: "At least one country is required." };
  }
  const unknownMarkets = markets.filter((m) => !VALID_MARKET_IDS.has(m));
  if (unknownMarkets.length > 0) {
    return {
      field: "markets",
      message: `Unknown country/countries: ${unknownMarkets.join(", ")}`,
    };
  }

  // Countries (Phase A): at least one, all must be in the catalog.
  if (!Array.isArray(input.countries) || input.countries.length === 0) {
    return {
      field: "countries",
      message: "At least one country is required.",
    };
  }
  const catalog = await loadCountryCatalog();
  const validCodes = new Set(catalog.map((c) => c.code));
  const unknown = input.countries.filter((c) => !validCodes.has(c));
  if (unknown.length > 0) {
    return {
      field: "countries",
      message: `Unknown country codes: ${unknown.join(", ")}`,
    };
  }

  // Global gate (Phase A): selecting "global" requires a justification.
  // Most articles should target a specific market; Global is rarely correct.
  const isGlobal = markets.includes("global");
  if (isGlobal) {
    if (
      typeof input.globalJustification !== "string" ||
      input.globalJustification.trim().length < 10
    ) {
      return {
        field: "globalJustification",
        message:
          "Global country context needs a justification (≥10 chars). Most articles should target a specific country.",
      };
    }
  }

  // SEO (Phase A): title within target range, meta description present.
  if (!input.seo || typeof input.seo !== "object") {
    return {
      field: "seo",
      message: "SEO metadata (title, metaDescription, keywords) is required.",
    };
  }
  const seoTitle = (input.seo.title ?? "").trim();
  if (seoTitle.length < 30 || seoTitle.length > 60) {
    return {
      field: "seo.title",
      message: `SEO title must be 30–60 characters (got ${seoTitle.length}).`,
    };
  }
  const metaDesc = (input.seo.metaDescription ?? "").trim();
  if (metaDesc.length < 50) {
    return {
      field: "seo.metaDescription",
      message: "Meta description is required (≥50 chars).",
    };
  }

  return null;
}

jobsRouter.post("/", async (req, res) => {
  try {
    const input = req.body as JobInput;
    const failure = await validateJobInput(input);
    if (failure) {
      return res
        .status(400)
        .json({ error: failure.message, field: failure.field });
    }
    const job = await createJob(input);
    // Fire-and-forget orchestration. Client polls /api/jobs/:id.
    orchestrate(job.id).catch((e) => console.error("Orchestration error:", e));
    res.status(201).json(job);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

jobsRouter.get("/", async (_req, res) => {
  const jobs = await loadAll<Job>("jobs");
  res.json(jobs);
});

jobsRouter.get("/:id", async (req, res) => {
  const job = await loadById<Job>("jobs", req.params.id);
  if (!job) return res.status(404).json({ error: "not found" });
  res.json(job);
});
