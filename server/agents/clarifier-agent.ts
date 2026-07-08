import { callClaude } from "../lib/claude";
import type { JobInput } from "../lib/types";

export type ClarifierResult = {
  subject: string;
  body: string;
};

const SYSTEM = `You are the Clarifier Agent. When a content request is missing required information,
you draft a polite, concise email to the requester asking for what's needed.

Guidelines:
- Be friendly and brief.
- Number the questions clearly so the user knows what to provide.
- Don't repeat fields the user already filled in.
- Sign off as "The Content Agent".

Respond with JSON only:
{ "subject": "...", "body": "..." }`;

export async function runClarifierAgent(
  input: JobInput,
  missingFields: string[],
): Promise<ClarifierResult> {
  const userMsg = `Draft a clarification email for this request.

Author: ${input.submittedBy.name} (${input.submittedBy.email})
Title they gave: ${input.title || "(none)"}
Missing: ${missingFields.join(", ")}

Return JSON with "subject" and "body".`;

  const mockBody = `Hi ${input.submittedBy.name.split(" ")[0]},

Thanks for submitting "${input.title || "your article request"}" to the Content Agent.
Before we can draft your article, we need a bit more information:

${missingFields.map((f, i) => `${i + 1}. ${humanize(f)}`).join("\n")}

Just reply to this email with the details and we'll pick it back up.

Thanks,
The Content Agent`;

  const mockResponse = JSON.stringify({
    subject: `Quick follow-up on your article: "${input.title || "new request"}"`,
    body: mockBody,
  });

  const text = await callClaude({
    system: [{ text: SYSTEM, cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse,
    maxTokens: 800,
  });

  // Tolerant parse
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return JSON.parse(raw.slice(start, end + 1));
}

function humanize(field: string): string {
  const map: Record<string, string> = {
    title: "What's the title of the article?",
    audience: "Who is the intended audience? (e.g. all employees, IT managers, new hires)",
    market: "Which market is this for? US, Mexico, or both?",
    "summary or source material": "Can you provide a short summary or paste any source notes you have?",
  };
  return map[field] ?? `Please provide: ${field}`;
}
