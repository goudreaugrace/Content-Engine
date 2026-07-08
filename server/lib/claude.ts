import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
export const isMockMode = !apiKey || apiKey.includes("...");

const client = isMockMode ? null : new Anthropic({ apiKey });

const MODEL = "claude-sonnet-4-5";

export type CachedSystem = {
  text: string;
  // If true, applies ephemeral cache_control. Use for stable bits (market profile, rules).
  cache?: boolean;
};

export type CallOptions = {
  system: CachedSystem[];
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
  /** Mock response to return when ANTHROPIC_API_KEY is missing. */
  mockResponse: string;
};

export async function callClaude({
  system,
  messages,
  maxTokens = 2048,
  mockResponse,
}: CallOptions): Promise<string> {
  if (isMockMode) {
    // Tiny delay so the UI feels lifelike during demos
    await new Promise((r) => setTimeout(r, 400));
    return mockResponse;
  }

  const systemBlocks = system.map((s) =>
    s.cache
      ? { type: "text" as const, text: s.text, cache_control: { type: "ephemeral" as const } }
      : { type: "text" as const, text: s.text },
  );

  const response = await client!.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const text = response.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  return text;
}

/** Extract a JSON object from a model response, tolerant of ```json fences. */
export function parseJsonOutput<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  // Find first { and last } to be tolerant of preamble
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error(`No JSON found in: ${text.slice(0, 200)}`);
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
