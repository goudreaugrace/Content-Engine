import { callClaude } from "../lib/claude";
import type { MarketProfile } from "../lib/types";

export type RevisionResult = {
  revisedBody: string;
  explanation: string;
};

const SYSTEM_TEMPLATE = (profile: MarketProfile) => `You are the ${profile.name} Market Agent for PepsiCo's content creation system, now operating in REVISION mode.

A reviewer has asked you to revise an already-drafted Knowledge Article based on a free-form instruction. Your job is to produce a clean revised version of the article while preserving its structure, voice, and language.

## CRITICAL: Output language

The article is in **${profile.language}** (locale: ${profile.languageCode}). Keep the revision in the same language. Translate the instruction internally if it comes in English but the article is in Spanish; never mix languages in the output.

## Market profile (continued from drafting):

**Tone of Voice:** ${profile.toneOfVoice}

**Content Strategy:** ${profile.contentStrategy}

**Content Guidelines:** ${profile.contentGuidelines}

**Banned terms (NEVER use):** ${profile.bannedTerms.join(", ") || "(none)"}

**Date format:** ${profile.dateFormat}

## Output format

Respond with a JSON object in this exact shape:

\`\`\`json
{
  "revisedBody": "the full revised article in Markdown, starting with the H1",
  "explanation": "one short paragraph (2-4 sentences) explaining what you changed and why"
}
\`\`\`

Do not include any text outside the JSON. The revisedBody is the COMPLETE article — not a diff, not a snippet. Preserve untouched sections verbatim. Only change what the instruction asks for, plus any necessary connective edits.`;

export async function runRevisionInstructionAgent(args: {
  currentBody: string;
  instruction: string;
  profile: MarketProfile;
}): Promise<RevisionResult> {
  const { currentBody, instruction, profile } = args;

  const userMsg = `Current article:
---
${currentBody}
---

Reviewer instruction:
${instruction}

Apply the instruction and return the full revised article as JSON.`;

  const isSpanish = profile.languageCode === "es-MX";
  const mock = buildMockRevision({ currentBody, instruction, isSpanish });

  const text = await callClaude({
    system: [{ text: SYSTEM_TEMPLATE(profile), cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse: JSON.stringify(mock),
    maxTokens: 4000,
  });

  // Tolerant JSON parse (strip code fences if present)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Revision agent returned non-JSON output");
  return JSON.parse(raw.slice(start, end + 1)) as RevisionResult;
}

// ----------------------------------------------------------------------------
// Mock-mode revision
// ----------------------------------------------------------------------------

function buildMockRevision({
  currentBody,
  instruction,
  isSpanish,
}: {
  currentBody: string;
  instruction: string;
  isSpanish: boolean;
}): RevisionResult {
  const trimmed = instruction.trim();
  const lower = trimmed.toLowerCase();

  // Shorter / concise
  if (/(shorter|concise|condense|tighten|brevity|cortar|resumir|conciso|breve)/.test(lower)) {
    const body = condenseBody(currentBody);
    return {
      revisedBody: body,
      explanation: isSpanish
        ? "Reduje el artículo conservando el título, el resumen y la sección principal. Las secciones secundarias se omitieron para mayor concisión."
        : "Condensed the article to its title, summary, and first major section. Secondary sections were dropped for brevity.",
    };
  }

  // Longer / expand
  if (/(longer|expand|more detail|elaborate|in-depth|extender|ampliar|detallar)/.test(lower)) {
    const body = expandBody(currentBody, trimmed, isSpanish);
    return {
      revisedBody: body,
      explanation: isSpanish
        ? "Agregué una nueva sección con detalle adicional según la instrucción."
        : "Added a new section with additional detail per the instruction.",
    };
  }

  // Add a section
  const addMatch = trimmed.match(/(?:add|agregar|añadir|incluir|include)\s+(?:a\s+)?(?:section|sección|seccion|párrafo|parrafo|paragraph)?\s*(?:about|sobre|de|on)?\s+(.+?)(?:[.,]|$)/i);
  if (addMatch && addMatch[1]) {
    const topic = addMatch[1].replace(/[.,;]$/, "").trim();
    const body = addSection(currentBody, topic, isSpanish);
    return {
      revisedBody: body,
      explanation: isSpanish
        ? `Agregué una nueva sección "${topic}" cerca del final del artículo. Revise el contenido y ajuste según sea necesario.`
        : `Added a new "${topic}" section near the end of the article. Review the placeholder content and adjust as needed.`,
    };
  }

  // Tone change
  if (/(formal|professional|profesional|serio|serious)/.test(lower) && /tone|voice|tono|estilo/.test(lower)) {
    return {
      revisedBody: currentBody,
      explanation: isSpanish
        ? "La instrucción solicita un tono más formal. En modo simulación no puedo reescribir prosa; con la API de Claude conectada, esto sí ajustaría el tono. El cuerpo no se modificó."
        : "The instruction asks for a more formal tone. In mock mode I can't actually rewrite prose; with the Claude API connected this would adjust the tone throughout. Body unchanged.",
    };
  }

  // Translate (mock can't really)
  if (/(translate|traducir|traduzca|in spanish|in english)/.test(lower)) {
    return {
      revisedBody: currentBody,
      explanation:
        "Translation requires the Claude API. In mock mode the body is returned unchanged. Set ANTHROPIC_API_KEY to enable real revisions.",
    };
  }

  // Default: append a "Recent edits" / "Cambios recientes" block at the end
  const body = appendEditNote(currentBody, trimmed, isSpanish);
  return {
    revisedBody: body,
    explanation: isSpanish
      ? "Se registró su instrucción al final del artículo. En modo simulación no realizo reescrituras semánticas; con la API de Claude esto produciría una edición real."
      : "Recorded your instruction at the end of the article. Mock mode doesn't perform semantic rewrites — with the Claude API connected, this would produce a real edit.",
  };
}

function condenseBody(body: string): string {
  const lines = body.split("\n");
  // Keep H1, the first ## section (typically Summary), and the next ## section (typically Who this applies to).
  const out: string[] = [];
  let h1Seen = false;
  let h2Count = 0;
  for (const line of lines) {
    if (/^#\s/.test(line)) {
      if (h1Seen) continue;
      h1Seen = true;
      out.push(line);
      continue;
    }
    if (/^##\s/.test(line)) {
      h2Count++;
      if (h2Count > 2) break;
      out.push(line);
      continue;
    }
    if (h2Count > 2) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

function expandBody(body: string, instruction: string, isSpanish: boolean): string {
  const heading = isSpanish ? "## Detalles adicionales" : "## Additional detail";
  const note = isSpanish
    ? `*Sección expandida por solicitud del revisor: "${instruction}".*`
    : `*Section expanded at reviewer's request: "${instruction}".*`;
  const placeholder = isSpanish
    ? "Esta sección amplía los puntos clave abordados anteriormente con contexto, ejemplos y casos límite específicos. Cada elemento debe ser concreto y accionable para el lector."
    : "This section expands on the key points covered above with additional context, examples, and specific edge cases. Each item should be concrete and actionable for the reader.";
  return appendBeforeFooter(body, `${heading}\n\n${note}\n\n${placeholder}\n`);
}

function addSection(body: string, topic: string, isSpanish: boolean): string {
  const Topic = topic.replace(/\b\w/g, (c) => c.toUpperCase());
  const heading = `## ${Topic}`;
  const placeholder = isSpanish
    ? `Sección agregada por solicitud del revisor sobre ${topic}.\n\nEsta área debe describir los aspectos relevantes de ${topic} para el lector. Incluya contexto, procedimientos, contactos, o referencias relacionadas según corresponda.`
    : `Section added at the reviewer's request about ${topic}.\n\nThis area should describe the relevant aspects of ${topic} for the reader. Include context, procedures, contacts, or related references as appropriate.`;
  return appendBeforeFooter(body, `${heading}\n\n${placeholder}\n`);
}

function appendEditNote(body: string, instruction: string, isSpanish: boolean): string {
  const heading = isSpanish ? "## Cambios recientes" : "## Recent edits";
  const noteLabel = isSpanish ? "Solicitud del revisor:" : "Reviewer request:";
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return appendBeforeFooter(
    body,
    `${heading}\n\n*${today}* — ${noteLabel} ${instruction}\n`,
  );
}

/** Inserts content before the `---` metadata footer if present, otherwise at end. */
function appendBeforeFooter(body: string, addition: string): string {
  const idx = body.lastIndexOf("\n---\n");
  if (idx < 0) return `${body.trimEnd()}\n\n${addition}`;
  return `${body.slice(0, idx).trimEnd()}\n\n${addition}\n${body.slice(idx)}`;
}
