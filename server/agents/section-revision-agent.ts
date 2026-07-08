import { callClaude } from "../lib/claude";
import type { MarketProfile } from "../lib/types";

export type SectionRevisionResult = {
  revisedSection: string;
  explanation: string;
};

const SYSTEM_TEMPLATE = (profile: MarketProfile) => `You are the ${profile.name} Market Agent, operating in SECTION-REVISION mode.

A reviewer is editing a single section of a Knowledge Article. You will receive the section markdown and a short instruction. Return only the revised section.

## CRITICAL constraints

- Output ONLY the revised section in Markdown. No preamble, no JSON, no commentary above or below.
- Keep the same section heading unless the instruction explicitly asks for a different heading.
- Do not add other sections from the article. Do not invent new H2 sections.
- Output language: ${profile.language} (${profile.languageCode}). All section text in that language.
- Preserve Markdown structure: existing lists, tables, code spans, bold/italic stay as they are unless the instruction calls them out.

## Market context (apply if relevant to the instruction)

**Tone of voice:** ${profile.toneOfVoice}

**Content guidelines:** ${profile.contentGuidelines}

**Banned terms (never use):** ${profile.bannedTerms.join(", ") || "(none)"}

Return the revised section as plain Markdown. No code fences.`;

export async function runSectionRevisionAgent(args: {
  section: string;
  instruction: string;
  profile: MarketProfile;
}): Promise<SectionRevisionResult> {
  const { section, instruction, profile } = args;

  const userMsg = `Section to revise:
---
${section}
---

Reviewer instruction: ${instruction}

Return the revised section in Markdown.`;

  const isSpanish = profile.languageCode === "es-MX";
  const mock = buildMockSection({ section, instruction, isSpanish });

  const text = await callClaude({
    system: [{ text: SYSTEM_TEMPLATE(profile), cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse: mock.revisedSection,
    maxTokens: 2000,
  });

  // Strip accidental code fences
  const fenced = text.trim().match(/^```(?:markdown|md)?\s*([\s\S]*?)```\s*$/);
  const revisedSection = (fenced ? fenced[1] : text).trim();

  return {
    revisedSection,
    explanation: mock.explanation,
  };
}

// ----------------------------------------------------------------------------
// Mock-mode behavior — deterministic transforms for the common instructions.
// ----------------------------------------------------------------------------
function buildMockSection({
  section,
  instruction,
  isSpanish,
}: {
  section: string;
  instruction: string;
  isSpanish: boolean;
}): SectionRevisionResult {
  const lower = instruction.toLowerCase().trim();

  // Shorter / concise
  if (/(shorter|concise|condense|tighten|brevity|cortar|resumir|conciso|breve)/.test(lower)) {
    return {
      revisedSection: condense(section),
      explanation: isSpanish
        ? "Condensé la sección al encabezado y al primer párrafo."
        : "Condensed the section to its heading and first paragraph.",
    };
  }

  // Longer / more detail
  if (/(longer|more detail|expand|elaborate|in-depth|extender|ampliar|detallar|add detail)/.test(lower)) {
    return {
      revisedSection: expand(section, isSpanish),
      explanation: isSpanish
        ? "Agregué un párrafo adicional para más contexto. Edite los detalles según corresponda."
        : "Appended a placeholder paragraph for additional context. Edit the detail to fit your article.",
    };
  }

  // Simpler / plainer
  if (/(simpler|plain|easier|simplify|simple)/.test(lower)) {
    return {
      revisedSection: section,
      explanation:
        "Simplifying prose needs the Claude API. In mock mode the section is unchanged. Set ANTHROPIC_API_KEY to enable real rewrites.",
    };
  }

  // Compliance fix — detect when the instruction includes flagged-term hints
  // ("Flagged term: ...") and run a deterministic substitution map for the
  // common inclusivity issues. Lets the demo show a real before/after even
  // without a live Claude key. Runs BEFORE the tone matcher because the
  // AiFixCard instruction often contains words like "professional" which the
  // tone matcher would otherwise eat.
  if (/(compliance|non-inclusive|flagged term|inclusivity|inclusive)/.test(lower)) {
    const flagged = extractFlaggedTerms(instruction);
    const result = applyInclusivitySubs(section, flagged);
    if (result.changed) {
      return {
        revisedSection: result.section,
        explanation: isSpanish
          ? `Reemplazó ${result.replacements} término(s): ${result.replacedSummary}.`
          : `Replaced ${result.replacements} flagged term${result.replacements === 1 ? "" : "s"}: ${result.replacedSummary}.`,
      };
    }
    // Fall through if nothing matched — we still want the user to see the
    // section, just untouched, with a helpful explanation.
    return {
      revisedSection: section,
      explanation:
        "Mock mode couldn't auto-fix this — the flagged terms aren't in the inclusivity substitution map. With the Claude API enabled, the agent would rewrite the prose. Common substitutions covered: guys → team/everyone, manpower → workforce, blacklist → blocklist, whitelist → allowlist.",
    };
  }

  // Phase P1.5 — new quick-chip handlers. Each does a targeted, deterministic
  // transform so the chips visibly DO something in mock mode. Real Claude
  // calls would do much better; these are demo-mode placeholders that don't
  // feel broken.

  // Active voice — flag passive constructions for the user to fix.
  if (/(active voice|avoid passive|passive constructions)/.test(lower)) {
    return {
      revisedSection: section,
      explanation:
        "Active-voice rewrites need the Claude API. In mock mode the section is unchanged. With a real key, the agent would flip passive constructions (\"is reviewed by\" → \"reviewers check\") throughout.",
    };
  }

  // Add bullets — convert sentences in paragraphs to bullets where reasonable.
  if (/(bullet|bullets|bulleted|list)/.test(lower)) {
    return {
      revisedSection: convertToBullets(section),
      explanation: isSpanish
        ? "Convirtió oraciones del primer párrafo en viñetas."
        : "Converted the first paragraph's sentences into a bullet list. Edit the bullets to keep what's useful and drop what isn't.",
    };
  }

  // Add example — append a placeholder example block.
  if (/(example|illustrate)/.test(lower)) {
    return {
      revisedSection: appendExample(section, isSpanish),
      explanation: isSpanish
        ? "Agregué un bloque de ejemplo de marcador de posición. Reemplácelo con el caso concreto que aplica."
        : "Appended a placeholder example block. Replace it with the concrete case that applies to your audience.",
    };
  }

  // Remove jargon — strip a small map of known jargon terms.
  if (/(jargon|acronym|plain-language|plain language|specialized)/.test(lower)) {
    return removeJargon(section, isSpanish);
  }

  // Fix tone — runs after the compliance check so an inclusivity-fix
  // instruction that mentions "professional alternatives" doesn't get
  // captured here by accident.
  if (/(tone|voice|formal|casual|professional)/.test(lower)) {
    return {
      revisedSection: section,
      explanation:
        "Tone changes need the Claude API. In mock mode the section is unchanged. With a real key, this would apply the market profile's tone-of-voice rules to the section.",
    };
  }

  // Default — append a note documenting the instruction
  const note = isSpanish
    ? `\n\n*Instrucción registrada: "${instruction.slice(0, 80)}".*`
    : `\n\n*Reviewer note: "${instruction.slice(0, 80)}".*`;
  return {
    revisedSection: section + note,
    explanation: isSpanish
      ? "Modo simulación: la instrucción se registró en la sección. Con la API real esto sería una edición."
      : "Mock mode: the instruction was recorded in the section. With the Claude API this would be an actual edit.",
  };
}

function condense(section: string): string {
  const lines = section.split("\n");
  if (lines.length === 0) return section;
  const heading = lines[0];
  const out: string[] = [heading];
  let paragraphStarted = false;
  let blankAfterParagraph = false;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") {
      if (paragraphStarted) {
        blankAfterParagraph = true;
        continue;
      }
      out.push(line);
    } else {
      if (blankAfterParagraph) break; // we're past the first paragraph
      out.push(line);
      paragraphStarted = true;
    }
  }
  return out.join("\n").trimEnd();
}

function expand(section: string, isSpanish: boolean): string {
  const placeholder = isSpanish
    ? "Esta sección amplía los puntos clave con contexto adicional, ejemplos concretos, o casos límite. Reemplace este texto con el detalle específico que la audiencia necesita."
    : "This expanded paragraph adds context, examples, or specific edge cases. Replace this placeholder with the concrete detail your audience needs.";
  return `${section.trimEnd()}\n\n${placeholder}`;
}

/**
 * Pulls "Flagged term: foo" hints out of an instruction string. The frontend
 * AiFixCard formats issues using exactly this phrasing so the mock can parse
 * them back out reliably.
 */
function extractFlaggedTerms(instruction: string): string[] {
  const terms: string[] = [];
  const re = /Flagged term:\s*["']?([^"'\n.]+)["']?\.?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(instruction)) !== null) {
    const term = m[1].trim().replace(/[.,]$/, "");
    if (term && !terms.includes(term)) terms.push(term);
  }
  return terms;
}

/**
 * Inclusivity substitution table. Bog-standard ND&I replacements that demo
 * teams expect to see auto-fixed. Casing is preserved on a best-effort basis
 * (Guys → Team, guys → team).
 */
const INCLUSIVITY_MAP: Record<string, string> = {
  guys: "team",
  manpower: "workforce",
  blacklist: "blocklist",
  whitelist: "allowlist",
  chairman: "chair",
  manhours: "staff hours",
  mankind: "humanity",
  manmade: "synthetic",
};

function applyInclusivitySubs(
  section: string,
  flaggedTerms: string[],
): { section: string; changed: boolean; replacements: number; replacedSummary: string } {
  let working = section;
  let count = 0;
  const replaced: string[] = [];
  // Always run the full map; the flaggedTerms array is just used to prioritize
  // which substitutions to mention in the explanation.
  for (const [from, to] of Object.entries(INCLUSIVITY_MAP)) {
    const re = new RegExp(`\\b${from}\\b`, "gi");
    if (!re.test(working)) continue;
    working = working.replace(re, (match) => {
      count++;
      // Preserve title-case on the original match.
      if (match[0] === match[0].toUpperCase()) {
        return to[0].toUpperCase() + to.slice(1);
      }
      return to;
    });
    replaced.push(`"${from}" → "${to}"`);
  }
  // Move "primary" flagged terms (those the compliance agent explicitly
  // surfaced) to the front of the summary so the explanation matches the
  // issue the user saw flagged.
  if (flaggedTerms.length > 0) {
    const primary = flaggedTerms
      .map((t) => INCLUSIVITY_MAP[t.toLowerCase()] && `"${t}" → "${INCLUSIVITY_MAP[t.toLowerCase()]}"`)
      .filter((s): s is string => !!s);
    const rest = replaced.filter((r) => !primary.includes(r));
    replaced.length = 0;
    replaced.push(...primary, ...rest);
  }
  return {
    section: working,
    changed: count > 0,
    replacements: count,
    replacedSummary: replaced.join(", ") || "(none)",
  };
}

// ─────────────────────────────────────────────────────────────
// Phase P1.5 — quick-chip mock transforms (Add bullets, Add example, Remove jargon)
// ─────────────────────────────────────────────────────────────

/**
 * Converts the first non-heading paragraph in a section into a bullet list,
 * splitting on sentence boundaries. Heading + later paragraphs untouched.
 * Mock-only — a real Claude call would be smarter about which paragraphs
 * benefit from being bulleted.
 */
function convertToBullets(section: string): string {
  const lines = section.split("\n");
  let inFirstPara = false;
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("#")) {
      out.push(line);
      continue;
    }
    if (line.trim() === "") {
      out.push(line);
      if (inFirstPara) inFirstPara = false;
      continue;
    }
    if (!inFirstPara) {
      // First paragraph encountered — split on sentence boundary and bullet.
      const sentences = line
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (sentences.length > 1) {
        sentences.forEach((s) => out.push(`- ${s}`));
        inFirstPara = true; // mark so we skip until next blank line
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Appends a placeholder example block under the section, formatted as a
 * Markdown blockquote so it visually reads as "fill this in".
 */
function appendExample(section: string, isSpanish: boolean): string {
  const example = isSpanish
    ? "\n\n> **Ejemplo:** Reemplace este texto con un caso concreto que ilustre el punto principal de esta sección (qué hizo el empleado, cuál fue el resultado)."
    : "\n\n> **Example:** Replace this with a concrete case that illustrates the main point of this section (what the employee did, what happened, what the outcome was).";
  return section.trimEnd() + example;
}

/**
 * Small jargon substitution map. Catches common HR / IT terms that often
 * sneak into KAs and confuse new hires. Same shape as the inclusivity map.
 */
const JARGON_MAP: Record<string, string> = {
  "EOD": "end of day",
  "COB": "close of business",
  "EOW": "end of week",
  "FYE": "fiscal year end",
  "synergize": "work together",
  "leverage": "use",
  "circle back": "follow up",
  "actionable": "useful",
  "stakeholder": "person involved",
  "deliverable": "thing being delivered",
};

function removeJargon(
  section: string,
  isSpanish: boolean,
): SectionRevisionResult {
  let working = section;
  let count = 0;
  const replaced: string[] = [];
  for (const [from, to] of Object.entries(JARGON_MAP)) {
    const re = new RegExp(`\\b${from}\\b`, "gi");
    if (!re.test(working)) continue;
    working = working.replace(re, (match) => {
      count++;
      return match[0] === match[0].toUpperCase()
        ? to[0].toUpperCase() + to.slice(1)
        : to;
    });
    replaced.push(`"${from}" → "${to}"`);
  }
  if (count === 0) {
    return {
      revisedSection: section,
      explanation:
        "No jargon from the substitution map found in this section. With the Claude API enabled, the agent would scan for less-common jargon too.",
    };
  }
  return {
    revisedSection: working,
    explanation: isSpanish
      ? `Reemplacé ${count} término(s) de jerga: ${replaced.join(", ")}.`
      : `Replaced ${count} jargon term${count === 1 ? "" : "s"}: ${replaced.join(", ")}.`,
  };
}
