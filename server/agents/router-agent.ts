import { callClaude, parseJsonOutput } from "../lib/claude";

export type MarketId = "us" | "mx" | "br" | "uk" | "in";

export type RouterResult = {
  markets: MarketId[];
  rationale: string;
};

const SINGLES: MarketId[] = ["us", "mx", "br", "uk", "in"];

const SYSTEM = `You are the Router Agent. Given a parsed content request, confirm which
market agent(s) should draft this article.

Available markets:
- "us": United States, English
- "mx": Mexico, Spanish
- "br": Brazil, Portuguese (Brazilian)
- "uk": United Kingdom, English (British)
- "in": India, English (Indian)

The author may select one or more specific markets. They may also select "global",
which means "all five specific markets above". Expand "global" before drafting.
Always return at least one market.

Respond with JSON only:
{ "markets": ["us", "mx"], "rationale": "brief reason" }`;

/**
 * Resolves the author's market selection into the concrete set of market
 * agents to invoke. Handles the "global" sentinel by expanding to all five
 * specific markets, and de-dupes so duplicate selections don't run twice.
 */
function resolveMarkets(selected: string[]): MarketId[] {
  if (!selected || selected.length === 0) return ["us"];
  const out = new Set<MarketId>();
  for (const m of selected) {
    if (m === "global") {
      SINGLES.forEach((id) => out.add(id));
    } else if (SINGLES.includes(m as MarketId)) {
      out.add(m as MarketId);
    }
  }
  return out.size > 0 ? Array.from(out) : ["us"];
}

export async function runRouterAgent(parsed: {
  title: string;
  /** Author's market selection — may include "global" plus specific markets. */
  markets: string[];
  audience: string;
}): Promise<RouterResult> {
  const resolved = resolveMarkets(parsed.markets);
  const isGlobal = parsed.markets.includes("global");

  const userMsg = `Route this request to the correct market agent(s):

Title: ${parsed.title}
Markets the user selected: ${parsed.markets.join(", ") || "(none)"}
Resolved (after expanding "global"): ${resolved.join(", ")}
Audience: ${parsed.audience}

Return JSON.`;

  const mockResponse = JSON.stringify({
    markets: resolved,
    rationale: isGlobal
      ? `User selected Global. Expanded to all five market agents: ${resolved.join(", ")}.`
      : resolved.length > 1
        ? `User selected ${resolved.length} markets. Each will produce a localized variant.`
        : `User selected ${resolved[0].toUpperCase()}. Routing to that market agent only.`,
  });

  const text = await callClaude({
    system: [{ text: SYSTEM, cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse,
    maxTokens: 400,
  });
  return parseJsonOutput<RouterResult>(text);
}
