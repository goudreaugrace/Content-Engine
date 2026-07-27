import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  loadMarketProfile,
  loadSectorProfile,
  upsert,
} from "../lib/storage";
import type { Article, ContentType, Job, Market, TraceEntry } from "../lib/types";
import { evaluate as evaluateApprovalRules } from "../lib/approval-rules";
import { runMigrationStandardizationAgent } from "../agents/migration-standardization-agent";

export const migrationsRouter = Router();

const CONTENT_TYPES = new Set<ContentType>(["FAQ", "Policy", "Knowledge Article", "Topic Page"]);
const MARKET_MAP: Record<string, Market> = {
  us: "US",
  mx: "MX",
  br: "BR",
  uk: "UK",
  in: "IN",
  global: "Global",
};

function now() {
  return new Date().toISOString();
}

function trace(agent: TraceEntry["agent"], label: string, output: unknown): TraceEntry {
  const at = now();
  return {
    agent,
    label,
    startedAt: at,
    endedAt: at,
    durationMs: 1,
    status: "success",
    output,
  };
}

migrationsRouter.post("/standardize", async (req, res) => {
  try {
    const body = req.body as {
      sourceTitle?: string;
      sourceContent?: string;
      contentType?: ContentType;
      marketId?: string;
      sectorId?: string;
      countries?: string[];
      submittedBy?: { name: string; email: string };
    };

    if (!body.sourceContent?.trim()) {
      return res.status(400).json({ error: "sourceContent is required" });
    }
    const contentType = body.contentType ?? "Knowledge Article";
    if (!CONTENT_TYPES.has(contentType)) {
      return res.status(400).json({ error: "Unsupported contentType" });
    }
    const marketId = (body.marketId ?? "us").toLowerCase();
    const sectorId = (body.sectorId ?? "pfna").toLowerCase();
    const market = await loadMarketProfile(marketId);
    const sector = await loadSectorProfile(sectorId);
    const countries = body.countries?.length ? body.countries : market?.defaultCountries ?? [];
    const submittedBy = body.submittedBy ?? {
      name: "Migration Specialist",
      email: "migration@pepsico.com",
    };

    const draft = await runMigrationStandardizationAgent({
      sourceTitle: body.sourceTitle ?? "Migrated source content",
      sourceContent: body.sourceContent,
      contentType,
      market,
      sector,
      countries,
    });

    const baseArticle: Article = {
      id: `ka-${randomUUID().slice(0, 8)}`,
      jobId: `job-${randomUUID().slice(0, 8)}`,
      title: draft.title,
      contentType,
      sector: sector?.id ?? sectorId,
      market: MARKET_MAP[marketId] ?? "US",
      countries,
      seo: draft.seo,
      body: draft.body,
      submittedBy,
      submittedAt: now(),
      status: "needs-review",
      complianceIssues: [],
    };
    const ruling = evaluateApprovalRules(baseArticle);
    const article: Article = {
      ...baseArticle,
      approvalResults: ruling.reasons,
      autoApproveCandidate: ruling.decision === "auto-approve-candidate",
      ...(ruling.decision === "needs-info"
        ? {
            status: "needs-info" as const,
            infoNeeded: ruling.reasons
              .filter((r) => r.severity === "error")
              .map((r) => `- ${r.label}${r.reason ? ` - ${r.reason}` : ""}`)
              .join("\n"),
          }
        : {}),
    };

    const job: Job = {
      id: article.jobId!,
      status: "complete",
      createdAt: now(),
      updatedAt: now(),
      input: {
        title: body.sourceTitle ?? draft.title,
        contentType,
        summary: "Migration standardization request",
        audience: "All employees",
        markets: [marketId],
        sectors: [sector?.id ?? sectorId],
        sourceText: body.sourceContent,
        submittedBy,
        countries,
        seo: draft.seo,
      },
      articleIds: [article.id],
      trace: [
        trace("migration", "Detected migrated source content", {
          sourceLength: body.sourceContent.length,
          sourceTitle: body.sourceTitle ?? draft.title,
        }),
        trace("migration", "Applied DEEx template", {
          contentType,
          market: market?.name ?? marketId,
          sector: sector?.name ?? sectorId,
          steps: draft.traceSummary,
        }),
        trace("compliance", "Validated metadata and review cadence", {
          summary: ruling.decision,
          issues: ruling.reasons.filter((r) => r.severity !== "ok"),
        }),
      ],
    };

    await upsert("articles", article);
    await upsert("jobs", job);
    res.status(201).json({ job, article });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});
