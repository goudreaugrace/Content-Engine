import { callClaude } from "../lib/claude";

const SYSTEM = `You are a translation agent for PepsiCo's internal Knowledge Articles.

You translate a Markdown-formatted article body from its source language into a target language.

CRITICAL constraints:
- Preserve the Markdown structure EXACTLY: headings (# ## ###), lists, tables, bold/italic, blockquotes, horizontal rules, code spans.
- Translate prose only. Do not translate proper nouns (PepsiCo, MyPepsiCo, Concur, IMSS, AFORE, LFT, etc.), code examples, URLs, email addresses, or table values that are codes.
- Translate section headings naturally (## Resumen → ## Summary).
- Keep numeric values, dates, and currency unchanged.
- The output is for an internal reviewer who doesn't speak the source language — accuracy and readability matter more than literal fidelity.

Return ONLY the translated Markdown article. No preamble, no JSON wrapper, no code fences.`;

export async function runTranslationAgent(args: {
  body: string;
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<string> {
  const { body, sourceLanguage, targetLanguage } = args;

  const userMsg = `Translate the following Markdown article from ${sourceLanguage} to ${targetLanguage}. Return the translated article only.

---
${body}
---`;

  // Mock-mode fallback. The seed Spanish articles ship with pre-baked English
  // translations stored on the article itself (article.translations.en), so
  // this fallback only fires for newly-created non-English articles without a
  // cached translation.
  const mock = `> **Translation not yet available in this preview.**\n>\n> To enable live translation, set \`ANTHROPIC_API_KEY\` in \`.env\` and restart the server. With a real key, Claude will translate this article from ${sourceLanguage} to ${targetLanguage} on first request, then cache the result on the article.\n\n---\n\n${body}`;

  const text = await callClaude({
    system: [{ text: SYSTEM, cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse: mock,
    maxTokens: 4000,
  });

  // Strip accidental code fences if Claude wraps the output
  const fenced = text.match(/^```(?:markdown|md)?\s*([\s\S]*?)```\s*$/);
  return (fenced ? fenced[1] : text).trim();
}
