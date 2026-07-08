/**
 * GEO (Generative Engine Optimization) agent.
 *
 * Runs after the market agent drafts the body. Derives three fields that
 * help RAG / enterprise-LLM retrieval surface and cite the article:
 *
 *   - summary       : 2-3 sentence factual extract LLMs can lift verbatim
 *   - keyQuestions  : natural-language questions the article answers
 *   - entities      : named programs, policies, systems, products covered
 *
 * Two execution paths, same shape as the other agents:
 *
 *   - LIVE: small focused Claude call with a JSON schema. Light prompt
 *     because the body already exists; we just ask Claude to extract.
 *   - MOCK: deterministic heuristics over the markdown body — first
 *     paragraph as summary, H2 headings → questions, capitalized phrases
 *     → entities. Lossy but enough to populate the panel without an API.
 */

import { callClaude, isMockMode } from "../lib/claude";
import type { ContentType, MarketProfile } from "../lib/types";

export type GeoFields = {
  summary: string;
  keyQuestions: string[];
  entities: string[];
};

const SYSTEM = `You are the GEO Agent for PepsiCo's content creation system.

Your job: read a finished Knowledge Article and extract three pieces of metadata that help retrieval-augmented generation (RAG) systems and enterprise LLM copilots surface and cite this article correctly.

Output ONLY valid JSON matching this schema:

{
  "summary": "2-3 sentence factual extract a RAG system can lift and cite verbatim. 200-400 characters. Plain prose, no bullets.",
  "keyQuestions": ["Question 1?", "Question 2?", ...],
  "entities": ["Named entity 1", "Named entity 2", ...]
}

Rules:
- summary: stick to what the article ACTUALLY says. No hype. No "this article explains" framing. Write it as the answer itself, not as a description of the article.
- keyQuestions: 3-6 questions. Real natural-language questions an employee might type into a copilot. Phrase as questions (start with How / What / When / Who / Where / Why / Can / Do). Each must be answerable from the article body.
- entities: 3-8 entities. Named programs, policies, systems, products, or organizational units the article authoritatively covers. Prefer specific proper nouns (e.g. "Workday Leave Portal") over generic concepts.

Do not include any text outside the JSON.`;

function buildUserPrompt(args: {
  body: string;
  contentType: ContentType;
  market: string;
  language: string;
}): string {
  return `Extract GEO metadata for this ${args.contentType} article (${args.market} market, written in ${args.language}).

ARTICLE BODY:
${args.body}

Return JSON only.`;
}

// ─────────────────────────────────────────────────────────────
// Mock mode — deterministic derivation from the markdown body.
// ─────────────────────────────────────────────────────────────

function stripMarkdown(s: string): string {
  return s
    .replace(/[#*_`>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMockSummary(body: string): string {
  // Try to use the "## Summary" section's first paragraph if present.
  // Otherwise fall back to the first non-heading paragraph in the body.
  const summaryMatch = body.match(
    /^##\s+(?:Summary|Resumen|Resumo|要約)\s*\n+([\s\S]+?)(?=\n##|\n---|\Z)/im,
  );
  let candidate = summaryMatch?.[1] ?? "";
  if (!candidate) {
    // First paragraph after the H1.
    const afterH1 = body.replace(/^#\s+.+\n+/, "");
    const firstPara = afterH1
      .split(/\n\n+/)
      .find((p) => p.trim() && !p.trim().startsWith("#"));
    candidate = firstPara ?? "";
  }
  candidate = stripMarkdown(candidate);
  // Target 200-400 chars. Truncate at sentence boundary if too long.
  if (candidate.length > 400) {
    const trimmed = candidate.slice(0, 400);
    const lastPeriod = trimmed.lastIndexOf(".");
    candidate = lastPeriod > 200 ? trimmed.slice(0, lastPeriod + 1) : trimmed;
  }
  return candidate;
}

function extractMockQuestions(body: string, contentType: ContentType): string[] {
  // Derive questions from H2 headings — turn "Steps" into "How do I…",
  // "Eligibility" into "Who is eligible?", etc. Fall back to contentType-
  // generic questions when headings are absent.
  const headings = Array.from(body.matchAll(/^##\s+(.+)$/gm)).map((m) =>
    m[1].trim(),
  );
  const out: string[] = [];
  for (const h of headings) {
    const lower = h.toLowerCase();
    if (/summary|resumen|resumo/.test(lower)) continue;
    if (/who.*appl/.test(lower) || /eligib/.test(lower)) {
      out.push("Who is eligible?");
    } else if (/before you start|requirements/.test(lower)) {
      out.push("What do I need before starting?");
    } else if (/steps|how to|procedure/.test(lower)) {
      out.push(`How do I ${contentType === "How-To" ? "do this" : "complete this"}?`);
    } else if (/troubleshoot|common situations|common issues/.test(lower)) {
      out.push("What if something goes wrong?");
    } else if (/exception/.test(lower)) {
      out.push("Are there exceptions to this policy?");
    } else if (/compliance|consequences/.test(lower)) {
      out.push("What happens if I don't comply?");
    } else if (/help|contact|support|need help/.test(lower)) {
      out.push("Where can I get help?");
    } else if (/policy|what this/.test(lower)) {
      out.push("What does this policy cover?");
    } else if (/expectations|what.*expected/.test(lower)) {
      out.push("What's expected of me?");
    }
  }
  // Always include a meta-question pulled from the article title (the H1)
  // so retrieval against the literal title also matches.
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h1) {
    // "How to reset your MyPepsiCo password" → already a question-ish phrase.
    // Otherwise prepend "What is…".
    const lowerH1 = h1.toLowerCase();
    if (lowerH1.startsWith("how") || lowerH1.includes("?")) {
      out.unshift(h1.endsWith("?") ? h1 : `${h1}?`);
    } else {
      out.unshift(`What is ${h1}?`);
    }
  }
  // Dedupe + cap.
  return Array.from(new Set(out)).slice(0, 6);
}

function extractMockEntities(body: string, market: string): string[] {
  // Naive proper-noun extraction: 2-4 capitalized words in a row, not
  // including section headings. Plus the market name itself as a baseline.
  const text = body
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join(" ");
  const matches = Array.from(
    text.matchAll(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/g),
  ).map((m) => m[1]);
  // Filter common false positives (sentence starters, single capitalized
  // words that are just sentence-initial articles, etc.).
  const stopwords = new Set([
    "I",
    "If",
    "It",
    "The",
    "This",
    "That",
    "When",
    "Where",
    "Why",
    "How",
    "What",
    "Who",
    "Open",
    "Read",
    "Note",
    "Tip",
    "Important",
    "Step",
    "All",
    "An",
    "A",
    "And",
    "But",
    "Or",
    "For",
    "To",
    "In",
    "On",
    "At",
    "Set",
    "Go",
    "Enter",
    "Answer",
    "Verify",
    "Confirm",
    "Document",
    "Apply",
    "Report",
    "Complete",
    "Last",
    "Owner",
    "Effective",
    "Next",
    "TBD",
  ]);
  const candidates = matches
    .filter((m) => !stopwords.has(m))
    .filter((m) => m.length > 2);
  // Score by frequency — entities that recur are likely real.
  const counts = new Map<string, number>();
  for (const c of candidates) counts.set(c, (counts.get(c) ?? 0) + 1);
  const ranked = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .slice(0, 6);
  // Always include the market as an anchor (e.g. "US", "MX") if present.
  if (market && !ranked.includes(market)) ranked.push(market);
  return ranked.slice(0, 6);
}

function mockDerive(args: {
  body: string;
  contentType: ContentType;
  market: string;
}): GeoFields {
  return {
    summary: extractMockSummary(args.body) || "Reference article from the MyPepsiCo content library.",
    keyQuestions: extractMockQuestions(args.body, args.contentType),
    entities: extractMockEntities(args.body, args.market),
  };
}

// ─────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────

export async function runGeoAgent(args: {
  body: string;
  contentType: ContentType;
  profile: MarketProfile;
}): Promise<GeoFields> {
  if (isMockMode) {
    return mockDerive({
      body: args.body,
      contentType: args.contentType,
      market: args.profile.name,
    });
  }

  try {
    // mockResponse isn't reached at runtime — we already short-circuited to
    // mockDerive above when isMockMode is true — but CallOptions requires
    // the field, so we pass a stringified mock-equivalent as the safety net.
    const mockFallback = JSON.stringify(
      mockDerive({
        body: args.body,
        contentType: args.contentType,
        market: args.profile.name,
      }),
    );
    const raw = await callClaude({
      system: [{ text: SYSTEM, cache: true }],
      messages: [
        {
          role: "user",
          content: buildUserPrompt({
            body: args.body,
            contentType: args.contentType,
            market: args.profile.name,
            language: args.profile.language,
          }),
        },
      ],
      maxTokens: 800,
      mockResponse: mockFallback,
    });
    const parsed = JSON.parse(raw) as Partial<GeoFields>;
    return {
      summary: (parsed.summary ?? "").trim(),
      keyQuestions: Array.isArray(parsed.keyQuestions)
        ? parsed.keyQuestions.filter((q): q is string => typeof q === "string")
        : [],
      entities: Array.isArray(parsed.entities)
        ? parsed.entities.filter((e): e is string => typeof e === "string")
        : [],
    };
  } catch {
    // Live call failed (bad JSON, transient API error, etc.). Fall back to
    // mock derivation so the article still arrives with reasonable GEO.
    return mockDerive({
      body: args.body,
      contentType: args.contentType,
      market: args.profile.name,
    });
  }
}
