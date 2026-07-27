import { callClaude, parseJsonOutput } from "../lib/claude";
import { readMarkets, type ArticleSEO, type JobInput } from "../lib/types";

export type IntakeResult = {
  complete: boolean;
  missingFields: string[];
  parsedRequest: {
    title: string;
    contentType: string;
    summary: string;
    audience: string;
    /** Author's market selection. May include "global". Router expands it. */
    markets: string[];
    sourceText: string;
    /** Phase A: pass-through so downstream agents see submission tags. */
    countries: string[];
    /** Phase A: pass-through. The market agent uses these to align headings + keywords with intent. */
    seo: ArticleSEO;
  };
  notes: string;
};

const SYSTEM = `You are the Intake Agent for PepsiCo's content creation system.
Your job is to parse a user's request for a new Knowledge Article, validate completeness,
and identify any missing required information.

Required fields for a complete request:
- title (clear, descriptive)
- contentType (FAQ, Policy, Knowledge Article, or Topic Page)
- summary (one paragraph describing what the article is about)
- audience (who should read this)
- markets (one or more of us, mx, br, uk, in, or global)
- sourceText OR enough detail in the summary to draft from

Respond with JSON only, in this exact shape:
{
  "complete": boolean,
  "missingFields": string[],
  "parsedRequest": { "title": "...", "contentType": "...", "summary": "...", "audience": "...", "markets": ["us"], "sourceText": "..." },
  "notes": "brief assessment"
}`;

export async function runIntakeAgent(input: JobInput): Promise<IntakeResult> {
  const selectedMarkets = readMarkets(input);

  const userMsg = `Here is the user's submitted request:

Title: ${input.title || "(missing)"}
Content Type: ${input.contentType || "(missing)"}
Summary: ${input.summary || "(missing)"}
Audience: ${input.audience || "(missing)"}
Markets: ${selectedMarkets.length > 0 ? selectedMarkets.join(", ") : "(missing)"}
Source Material: ${input.sourceText ? input.sourceText.slice(0, 2000) : "(none provided)"}

Validate this request and return JSON only.`;

  const missing: string[] = [];
  if (!input.title?.trim()) missing.push("title");
  if (!input.audience?.trim()) missing.push("audience");
  if (selectedMarkets.length === 0) missing.push("markets");
  if (!input.summary?.trim() && !input.sourceText?.trim()) missing.push("summary or source material");

  const mockResponse = JSON.stringify({
    complete: missing.length === 0,
    missingFields: missing,
    parsedRequest: {
      title: input.title,
      contentType: input.contentType,
      summary: input.summary,
      audience: input.audience,
      markets: selectedMarkets,
      sourceText: input.sourceText,
      countries: input.countries ?? [],
      seo: input.seo ?? { title: "", metaDescription: "", keywords: [] },
    },
    notes:
      missing.length === 0
        ? "Request appears complete and ready to draft."
        : `Missing required fields: ${missing.join(", ")}. Need to follow up with author.`,
  });

  const text = await callClaude({
    system: [{ text: SYSTEM, cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse,
    maxTokens: 1024,
  });

  return parseJsonOutput<IntakeResult>(text);
}
