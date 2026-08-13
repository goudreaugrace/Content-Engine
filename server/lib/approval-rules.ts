/**
 * Phase C — Approval rules engine.
 *
 * Runs deterministic checks against a drafted Article and produces a decision:
 *   - "auto-approve-candidate" — every rule passed. The article goes to
 *     needs-review with an `autoApproveCandidate` banner so the reviewer
 *     can one-click confirm.
 *   - "needs-info" — at least one ERROR-level rule failed. The orchestrator
 *     routes the article to status=needs-info and joins the failure reasons
 *     into infoNeeded so the author sees exactly what to fix.
 *   - "needs-review" — only WARNING-level failures. Normal review path.
 *
 * Rules are intentionally simple and machine-checkable. The compliance agent
 * still runs separately for content-judgment issues (tone, inclusivity, etc.).
 */

import type { Article, ContentType } from "./types";

export type RuleSeverity = "error" | "warning" | "ok";

export type RuleResult = {
  /** Stable id for the rule — useful for filtering/UI. */
  id: string;
  /** Human-readable label shown in the pass/fail checklist. */
  label: string;
  severity: RuleSeverity;
  /** Optional one-line explanation of what failed (omit when severity=ok). */
  reason?: string;
};

export type ApprovalDecision = {
  decision: "auto-approve-candidate" | "needs-info" | "needs-review";
  reasons: RuleResult[];
};

/**
 * Required H2 sections per content type. Kept in lockstep with the
 * front-end's REQUIRED_SECTIONS map — both surfaces show the same list.
 */
const REQUIRED_SECTIONS: Record<ContentType, string[]> = {
  FAQ: ["Question", "Answer", "Related"],
  Policy: ["Overview", "Policy", "Effective date", "Contact"],
  "Knowledge Article": ["Overview", "Steps", "Troubleshooting"],
  "Topic Page": ["Overview", "Details", "Resources"],
};

/** Extract H2 headings from a markdown body. Case-insensitive lookup downstream. */
function extractH2s(body: string): string[] {
  const headings: string[] = [];
  const re = /^##\s+(.+?)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    headings.push(m[1].trim());
  }
  return headings;
}

export function evaluate(article: Article): ApprovalDecision {
  const reasons: RuleResult[] = [];

  // ── Required H2 sections present ──
  const requiredSections =
    REQUIRED_SECTIONS[article.contentType] ?? [];
  if (requiredSections.length > 0) {
    const present = extractH2s(article.body).map((h) => h.toLowerCase());
    const missing = requiredSections.filter(
      (r) => !present.some((p) => p.includes(r.toLowerCase())),
    );
    if (missing.length === 0) {
      reasons.push({
        id: "required-sections",
        label: "All required sections present",
        severity: "ok",
      });
    } else {
      // Warning, not error — the agent may have used equivalent section names
      // (e.g. "Body" instead of "Steps") that satisfy the intent. The reviewer
      // still sees the warning and can adjust; it just doesn't force a hard
      // needs-info downgrade. When the live agent learns the canonical names
      // in Phase D's prompt update, we can promote this back to error.
      reasons.push({
        id: "required-sections",
        label: `Missing recommended sections: ${missing.join(", ")}`,
        severity: "warning",
        reason: `${article.contentType} articles work best with: ${requiredSections.join(", ")}.`,
      });
    }
  }

  // ── SEO title within 30–60 chars ──
  const seoTitle = (article.seo?.title ?? "").trim();
  if (seoTitle.length >= 30 && seoTitle.length <= 60) {
    reasons.push({
      id: "seo-title-length",
      label: `SEO title length OK (${seoTitle.length} chars)`,
      severity: "ok",
    });
  } else {
    reasons.push({
      id: "seo-title-length",
      label: `SEO title length out of range (${seoTitle.length} chars; target 30–60)`,
      severity: "error",
      reason:
        "Search engines truncate titles outside 30–60 characters. Rewrite the SEO title.",
    });
  }

  // ── Meta description present + reasonable length ──
  const meta = (article.seo?.metaDescription ?? "").trim();
  if (meta.length >= 50) {
    reasons.push({
      id: "meta-description",
      label: `Meta description present (${meta.length} chars)`,
      severity: meta.length > 160 ? "warning" : "ok",
      reason:
        meta.length > 160
          ? "Search snippets cap at ~160 chars; the tail will be cut."
          : undefined,
    });
  } else {
    reasons.push({
      id: "meta-description",
      label: "Meta description missing or too short",
      severity: "error",
      reason: "Add a 140–160 character meta description so search shows a useful snippet.",
    });
  }

  // ── At least one country tagged ──
  if (article.countries && article.countries.length > 0) {
    reasons.push({
      id: "countries",
      label: `${article.countries.length} ${article.countries.length === 1 ? "country" : "countries"} tagged`,
      severity: "ok",
    });
  } else {
    reasons.push({
      id: "countries",
      label: "No countries tagged",
      severity: "error",
      reason: "Tag at least one country so the article surfaces in country-filtered search.",
    });
  }

  // ── No ERROR-level compliance issues ──
  // Phase P3.3 — dismissed flags don't count as errors for the rules
  // engine (a reviewer marked them false-positive). They still render in
  // the article view as struck-through for audit.
  const errorIssues = (article.complianceIssues ?? []).filter(
    (i) => i.severity === "error" && !i.dismissed,
  );
  if (errorIssues.length === 0) {
    reasons.push({
      id: "compliance-errors",
      label: "No compliance errors",
      severity: "ok",
    });
  } else {
    reasons.push({
      id: "compliance-errors",
      label: `${errorIssues.length} compliance error${errorIssues.length === 1 ? "" : "s"}`,
      severity: "error",
      reason: errorIssues.map((i) => i.message).join("; "),
    });
  }

  // ── Global market requires justification ──
  if (article.market === "Global" || article.sector === "global") {
    if (
      article.globalJustification &&
      article.globalJustification.trim().length >= 10
    ) {
      reasons.push({
        id: "global-justification",
        label: "Global cross-sector justification provided",
        severity: "ok",
      });
    } else {
      reasons.push({
        id: "global-justification",
        label: "Global cross-sector justification missing",
        severity: "error",
        reason:
          "Global content must include a justification explaining the cross-sector intent.",
      });
    }
  }

  // ── Decision ──
  const hasError = reasons.some((r) => r.severity === "error");
  const hasWarning = reasons.some((r) => r.severity === "warning");

  let decision: ApprovalDecision["decision"];
  if (hasError) {
    decision = "needs-info";
  } else if (hasWarning) {
    decision = "needs-review";
  } else {
    decision = "auto-approve-candidate";
  }

  return { decision, reasons };
}
