import { callClaude, parseJsonOutput } from "../lib/claude";
import type { ComplianceIssue, DEExRules } from "../lib/types";

export type ComplianceResult = {
  issues: ComplianceIssue[];
  summary: string;
};

const SYSTEM = (rules: DEExRules) => `You are the Compliance Agent. You check content requests
(and drafts when available) against PepsiCo's DEEx guidelines and flag issues for the country agent.

## DEEx Rules

### Tone
${rules.toneRules.map((r) => `- ${r}`).join("\n")}

### Inclusivity
${rules.inclusivityRules.map((r) => `- ${r}`).join("\n")}

### Accessibility
${rules.accessibilityRules.map((r) => `- ${r}`).join("\n")}

### Formatting
${rules.formattingRules.map((r) => `- ${r}`).join("\n")}

### Character limits
- Title: ${rules.characterLimits.title} chars
- Summary: ${rules.characterLimits.summary} chars
- Meta description: ${rules.characterLimits.metaDescription} chars

## Output

Respond with JSON only:
{
  "issues": [
    {
      "severity": "info" | "warning" | "error",
      "category": "tone" | "inclusivity" | "accessibility" | "formatting" | "regulatory",
      "message": "...",
      "section": "exact H2 heading text the issue applies to, e.g. 'Steps' (omit for article-wide issues)",
      "excerpt": "the specific phrase (≤120 chars) the issue is about, copied verbatim from the draft (optional)"
    }
  ],
  "summary": "brief overall assessment"
}

When a draft body is provided, ALWAYS attach a section anchor when the issue
applies to a specific H2 — this lets the reviewer jump straight to the
offending paragraph. Use the exact heading text after the ## marker.

If everything looks good, return an empty issues array.`;

export async function runComplianceAgent(args: {
  parsed: {
    title: string;
    summary: string;
    audience: string;
    sourceText: string;
  };
  rules: DEExRules;
}): Promise<ComplianceResult> {
  const { parsed, rules } = args;

  const userMsg = `Review this content request against DEEx guidelines:

Title: ${parsed.title}
Audience: ${parsed.audience}
Summary: ${parsed.summary}

Source/draft material:
${parsed.sourceText || "(none — preliminary check only)"}

Flag any DEEx issues. Return JSON.`;

  // Deterministic mock: scan for a few common issues
  const mockIssues: ComplianceIssue[] = [];
  const combined = `${parsed.title} ${parsed.summary} ${parsed.sourceText}`.toLowerCase();

  if (parsed.title.length > rules.characterLimits.title) {
    mockIssues.push({
      severity: "warning",
      category: "formatting",
      message: `Title exceeds ${rules.characterLimits.title} characters.`,
      // Title is its own H1 — no H2 anchor.
    });
  }
  if (parsed.summary.length > rules.characterLimits.summary) {
    mockIssues.push({
      severity: "warning",
      category: "formatting",
      message: `Summary exceeds ${rules.characterLimits.summary} characters.`,
      section: "Summary",
    });
  }
  if (/\b(guys|manpower|blacklist|whitelist)\b/.test(combined)) {
    const match = combined.match(/\b(guys|manpower|blacklist|whitelist)\b/);
    mockIssues.push({
      severity: "error",
      category: "inclusivity",
      message: "Non-inclusive language detected. Use neutral alternatives.",
      excerpt: match?.[0],
      // Without the full draft body we can't reliably section-locate; the
      // live agent will, when it has the draft.
    });
  }
  if (/\bclick here\b|\bread more\b/.test(combined)) {
    mockIssues.push({
      severity: "warning",
      category: "accessibility",
      message: "Avoid generic link text like 'click here'. Use descriptive links.",
    });
  }
  if (!parsed.audience.trim()) {
    mockIssues.push({
      severity: "warning",
      category: "formatting",
      message: "No audience specified. Article should declare 'Who this applies to'.",
      section: "Who this applies to",
    });
  }

  const mockResponse = JSON.stringify({
    issues: mockIssues,
    summary:
      mockIssues.length === 0
        ? "No DEEx issues detected in the request. Safe to proceed."
        : `${mockIssues.length} issue(s) found. Country agent should address during drafting.`,
  });

  const text = await callClaude({
    system: [{ text: SYSTEM(rules), cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse,
    maxTokens: 1500,
  });

  return parseJsonOutput<ComplianceResult>(text);
}
