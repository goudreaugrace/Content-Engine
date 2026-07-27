import { randomUUID } from "node:crypto";
import {
  loadById,
  loadDEExRules,
  loadMarketProfile,
  loadSectorProfile,
  mutate,
  upsert,
} from "../lib/storage";
import type {
  AgentName,
  Article,
  Job,
  JobInput,
  JobStatus,
  StubbedEmail,
  TraceEntry,
} from "../lib/types";
import { runIntakeAgent } from "./intake-agent";
import { runClarifierAgent } from "./clarifier-agent";
import { runRouterAgent } from "./router-agent";
import { runMarketAgent, runMarketRevisionAgent } from "./market-agent";
import { runComplianceAgent } from "./compliance-agent";
import { runGeoAgent } from "./geo-agent";
import { evaluate as evaluateApprovalRules } from "../lib/approval-rules";

function now() {
  return new Date().toISOString();
}

async function patchJob(jobId: string, patch: Partial<Job>) {
  return mutate<Job>("jobs", jobId, (j) => ({ ...j, ...patch, updatedAt: now() }));
}

async function appendTrace(jobId: string, entry: TraceEntry) {
  return mutate<Job>("jobs", jobId, (j) => ({
    ...j,
    trace: [...j.trace, entry],
    updatedAt: now(),
  }));
}

async function runStep<T>(
  jobId: string,
  agent: AgentName,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = now();
  const t0 = Date.now();
  try {
    const output = await fn();
    const endedAt = now();
    await appendTrace(jobId, {
      agent,
      label,
      startedAt,
      endedAt,
      durationMs: Date.now() - t0,
      status: "success",
      output,
    });
    return output;
  } catch (e: any) {
    const endedAt = now();
    await appendTrace(jobId, {
      agent,
      label,
      startedAt,
      endedAt,
      durationMs: Date.now() - t0,
      status: "error",
      output: null,
      error: e?.message ?? String(e),
    });
    throw e;
  }
}

export async function createJob(input: JobInput): Promise<Job> {
  const job: Job = {
    id: `job-${randomUUID().slice(0, 8)}`,
    status: "intake",
    createdAt: now(),
    updatedAt: now(),
    input,
    trace: [],
    articleIds: [],
  };
  await upsert("jobs", job);
  return job;
}

/**
 * Run the full orchestration. Designed to be invoked async (fire-and-forget)
 * after the API returns the job ID — the client polls for status.
 */
export async function orchestrate(jobId: string): Promise<void> {
  try {
    const job = await loadById<Job>("jobs", jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // ---- Step 1: Intake ----
    const intake = await runStep(jobId, "intake", "Parsing request", () =>
      runIntakeAgent(job.input),
    );

    if (!intake.complete) {
      // ---- Step 2a: Clarifier ----
      const clarifier = await runStep(jobId, "clarifier", "Drafting clarification email", () =>
        runClarifierAgent(job.input, intake.missingFields),
      );

      // Surface this as a first-class "needs-info" article so it appears on the
      // dashboard alongside other statuses, rather than as a hidden parked job.
      const missing = intake.missingFields.length
        ? intake.missingFields.map((f) => `- ${f}`).join("\n")
        : "- Additional detail about the topic and intended content";
      const MARKET_MAP: Record<string, Article["market"]> = {
        us: "US", mx: "MX", br: "BR", uk: "UK", in: "IN",
        both: "Global", global: "Global",
      };
      // Use the first selected country for the needs-info placeholder. If
      // multiple were selected, picking the first is good enough — the
      // author will pick up where they left off when they resubmit.
      const selectedMarkets = (job.input.markets && job.input.markets.length > 0)
        ? job.input.markets
        : (job.input.market ? [job.input.market] : ["us"]);
      const market: Article["market"] =
        selectedMarkets.includes("global") || selectedMarkets.length > 1
          ? "Global"
          : (MARKET_MAP[selectedMarkets[0]] ?? "Global");

      const infoArticle: Article = {
        id: `ka-${randomUUID().slice(0, 8)}`,
        jobId,
        title: job.input.title || "Untitled request",
        contentType: job.input.contentType,
        market,
        // Phase A: carry submission tags forward so the needs-info card
        // already shows where this is meant to land if the author fills the gaps.
        countries: job.input.countries ?? [],
        seo: job.input.seo ?? { title: "", metaDescription: "", keywords: [] },
        globalJustification: job.input.globalJustification,
        replacesArticleId: job.input.replacesArticleId,
        body: `# ${job.input.title || "Untitled request"}\n\n## More information needed\n\nBefore this article can be drafted, the content agent needs the following from the requester:\n\n${missing}\n\nA clarification email has been sent to **${job.input.submittedBy.email}**. Once the missing details are provided, resubmit the request to generate the draft.`,
        submittedBy: job.input.submittedBy,
        submittedAt: now(),
        status: "needs-info",
        complianceIssues: [],
        infoNeeded: `Missing: ${intake.missingFields.join(", ") || "additional detail"}`,
      };
      await upsert("articles", infoArticle);

      const email: StubbedEmail = {
        id: `email-${randomUUID().slice(0, 8)}`,
        to: [job.input.submittedBy.email],
        subject: clarifier.subject,
        body: clarifier.body,
        sentAt: now(),
        kind: "clarification",
        jobId,
        articleId: infoArticle.id,
      };
      await upsert("emails", email);

      await mutate<Job>("jobs", jobId, (j) => ({
        ...j,
        articleIds: [...j.articleIds, infoArticle.id],
        status: "complete",
        updatedAt: now(),
      }));
      return;
    }

    // ---- Step 2b: Router ----
    const router = await runStep(jobId, "router", "Routing to country agent(s)", () =>
      runRouterAgent(intake.parsedRequest),
    );

    // ---- Step 3 + 4: Market + Compliance in PARALLEL ----
    await patchJob(jobId, { status: "drafting" });
    const rules = await loadDEExRules();
    if (!rules) throw new Error("DEEx rules not found at server/data/deex-rules.json");

    for (const marketId of router.markets) {
      const profile = await loadMarketProfile(marketId);
      if (!profile) throw new Error(`Country profile '${marketId}' not found`);

      // Load the sector that owns this country so the country agent can
      // compose corporate framing above locale execution. `sectorId` is
      // optional on older country profiles — a null sector is a no-op in
      // the prompt template.
      const sector = profile.sectorId
        ? await loadSectorProfile(profile.sectorId)
        : null;

      const [draft, compliance] = await Promise.all([
        runStep(jobId, "market", `Drafting (${marketId.toUpperCase()})`, () =>
          runMarketAgent({ parsed: intake.parsedRequest, profile, sector }),
        ),
        runStep(jobId, "compliance", `Compliance check (${marketId.toUpperCase()})`, () =>
          runComplianceAgent({ parsed: intake.parsedRequest, rules }),
        ),
      ]);

      // ---- Step 5: Revise if compliance flagged ERROR-level issues ----
      let finalDraft = draft;
      const hasErrors = compliance.issues.some((i) => i.severity === "error");
      if (hasErrors) {
        await patchJob(jobId, { status: "revising" });
        finalDraft = await runStep(
          jobId,
          "revision",
          `Revising draft for compliance (${marketId.toUpperCase()})`,
          () =>
            runMarketRevisionAgent({
              originalDraft: draft.body,
              complianceIssues: compliance.issues,
              profile,
              sector,
            }),
        );
      }

      // ---- Step 6a: Derive GEO fields from the final body ----
      // Runs after any compliance revisions so the GEO snapshot reflects
      // the actual published-shape body. Live mode calls Claude with a
      // focused extraction prompt; mock mode walks the markdown heuristically.
      // Failures fall back to mock derivation so a Claude hiccup never
      // blocks publishing.
      const geo = await runStep(
        jobId,
        "market",
        `Generating AI-discovery fields (${marketId.toUpperCase()})`,
        () =>
          runGeoAgent({
            body: finalDraft.body,
            contentType: job.input.contentType,
            profile,
          }),
      );

      // Merge the agent-derived GEO into the author's submitted SEO. Author
      // values win when present (the wizard exposes the GEO fields up front
      // for motivated authors); blanks fall through to the agent's output.
      const submittedSeo = job.input.seo ?? {
        title: "",
        metaDescription: "",
        keywords: [],
      };
      const mergedSeo = {
        ...submittedSeo,
        summary:
          (submittedSeo.summary ?? "").trim() || geo.summary,
        keyQuestions:
          (submittedSeo.keyQuestions ?? []).length > 0
            ? submittedSeo.keyQuestions
            : geo.keyQuestions,
        entities:
          (submittedSeo.entities ?? []).length > 0
            ? submittedSeo.entities
            : geo.entities,
      };

      // ---- Step 6b: Create article record ----
      // Build the article first so the rules engine has the full final state
      // (including compliance issues from this run) to evaluate against.
      const baseArticle: Article = {
        id: `ka-${randomUUID().slice(0, 8)}`,
        jobId,
        title: finalDraft.title,
        contentType: job.input.contentType,
        market: (
          { us: "US", mx: "MX", br: "BR", uk: "UK", in: "IN" } as const
        )[marketId] ?? "Global",
        // Phase A: thread submission metadata through to the persisted article.
        countries: job.input.countries ?? [],
        seo: mergedSeo,
        globalJustification: job.input.globalJustification,
        replacesArticleId: job.input.replacesArticleId,
        body: finalDraft.body,
        submittedBy: job.input.submittedBy,
        submittedAt: now(),
        status: "needs-review",
        complianceIssues: compliance.issues,
      };

      // ---- Step 7: Phase C — approval rules engine ----
      // Cheap, deterministic post-check that adjusts status + attaches the
      // pass/fail checklist the review UI renders. Three outcomes:
      //   - auto-approve-candidate → status stays needs-review, banner shown
      //   - needs-review (warnings only) → status stays needs-review
      //   - needs-info (≥1 error)       → status drops, infoNeeded set
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
                .map((r) => `• ${r.label}${r.reason ? ` — ${r.reason}` : ""}`)
                .join("\n"),
            }
          : {}),
      };
      await upsert("articles", article);

      // Stakeholder notification email (stubbed)
      const notification: StubbedEmail = {
        id: `email-${randomUUID().slice(0, 8)}`,
        to: ["portal-gov@pepsico.com", "search-seo@pepsico.com", "deex-design@pepsico.com"],
        subject: `New article ready for review: ${article.title}`,
        body: `A new ${article.contentType} for the ${article.market} country has been drafted and is pending review.\n\nTitle: ${article.title}\nAuthor: ${job.input.submittedBy.name}\nID: ${article.id}\n\nReview at: /articles/${article.id}`,
        sentAt: now(),
        kind: "stakeholder-notification",
        jobId,
        articleId: article.id,
      };
      await upsert("emails", notification);

      await mutate<Job>("jobs", jobId, (j) => ({
        ...j,
        articleIds: [...j.articleIds, article.id],
        updatedAt: now(),
      }));
    }

    await patchJob(jobId, { status: "complete" });
  } catch (e: any) {
    await patchJob(jobId, {
      status: "failed",
      error: e?.message ?? String(e),
    });
  }
}

export type JobStatusType = JobStatus;
