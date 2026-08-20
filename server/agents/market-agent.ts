import { callClaude } from "../lib/claude";
import type { ArticleSEO, MarketProfile, SectorProfile } from "../lib/types";

export type MarketDraft = {
  title: string;
  body: string;
};

/**
 * Composes a sector profile with a country profile so the country agent's
 * system prompt reflects the two-tier taxonomy:
 *
 *   - Sector strategy comes FIRST (corporate framing / brand rules)
 *   - Market strategy comes SECOND (locale execution)
 *   - Terminology maps are UNIONED (market overrides sector on key collision)
 *   - Banned terms are UNIONED
 *   - Language, currency, dateFormat remain purely market-level
 *
 * Sector may be null (older articles pre-taxonomy, or a market with no
 * sector assigned yet). In that case we fall back to the pre-sector prompt
 * shape so nothing regresses.
 */
const SYSTEM_TEMPLATE = (
  profile: MarketProfile,
  sector: SectorProfile | null,
) => {
  const mergedTerminology: Record<string, string> = {
    ...(sector?.terminology ?? {}),
    ...profile.terminology, // market wins on key collision
  };
  const mergedBanned = Array.from(
    new Set([...(sector?.bannedTerms ?? []), ...profile.bannedTerms]),
  );

  const sectorBlock = sector
    ? `## Sector Profile: ${sector.name} (applies before country-specific rules)

**Sector tone (corporate framing):**
${sector.toneOfVoice}

**Sector content strategy:**
${sector.contentStrategy}

**Sector content guidelines:**
${sector.contentGuidelines}

**Sector regulatory notes:**
${sector.regulatoryNotes}
${sector.seoNotes ? `\n**Sector SEO context:** ${sector.seoNotes}\n` : ""}
`
    : "";

  return `You are the ${profile.name} Country Agent for PepsiCo's content creation system.

## CRITICAL: Output language

The final article MUST be written in **${profile.language}** (locale: ${profile.languageCode}).
Even though the guidelines below are authored in English for the admin team, your output
— including ALL headings, body text, section labels, and the H1 title — must be in ${profile.language}.

Translate generic section labels (Summary, Who this applies to, Body, Last updated, Owner) into
${profile.language} naturally. Do not include any English text in the final article.

${sectorBlock}## Country Profile: ${profile.name}${sector ? ` (in the ${sector.name} sector)` : ""}

**Tone of Voice:**
${profile.toneOfVoice}

**Content Strategy:**
${profile.contentStrategy}

**Content Guidelines:**
${profile.contentGuidelines}

**Terminology (unioned from sector + market — market wins on collision):**
${Object.entries(mergedTerminology).map(([k, v]) => `- "${k}" → "${v}"`).join("\n") || "(none)"}

**Banned terms (NEVER use these; unioned from sector + market):**
${mergedBanned.map((t) => `- ${t}`).join("\n") || "(none)"}

**Regulatory notes:**
${profile.regulatoryNotes}

**Date format:** ${profile.dateFormat}
**Currency:** ${profile.currency}

${profile.seoNotes || (profile.commonSearchTerms?.length ?? 0) > 0
  ? `## SEO context for ${profile.name}

${profile.seoNotes ? `${profile.seoNotes}\n` : ""}${
      (profile.commonSearchTerms?.length ?? 0) > 0
        ? `Common search terms in this country: ${profile.commonSearchTerms!.join(", ")}.\nWhen relevant, weave these into headings + opening paragraphs naturally — don't keyword-stuff.\n`
        : ""
    }`
  : ""}

## Output requirements

Return a complete article in Markdown using this internal knowledge article anatomy (translated into ${profile.language}):
1. H1 title
2. One short lead paragraph immediately after the H1 that stands alone and explains what the article covers, who it helps, and when to use it.
3. Content-type sections:
   - Knowledge Article: ## Before you start, ## Steps, ## Common situations, ## Need help?
   - Policy: ## Who this applies to, ## Policy details, ## Exceptions, ## Compliance, ## Effective date
   - FAQ: one H2 per question, then ## Need help?
   - Topic Page: ## Overview, ## Key resources, ## Related articles, ## Need help?
4. Use source material as the factual basis. Do not invent policy details, owners, dates, or exceptions.
5. Do not put owner, last updated, next review, effective date, or approved-by footer lines in the Markdown body; those live in structured metadata.

Do not include code fences or any preamble. Begin directly with the H1.`;
};

// ----------------------------------------------------------------------------
// Mock-mode content generation
// ----------------------------------------------------------------------------

type ContentType = "FAQ" | "Policy" | "Knowledge Article" | "Topic Page";

function inferContentType(title: string, summary: string): ContentType {
  const t = `${title} ${summary}`.toLowerCase();
  if (/^(faq|preguntas frecuentes|preguntas )/i.test(title.trim())) return "FAQ";
  if (/(policy|política)/i.test(t)) return "Policy";
  if (/^(how to|cómo|guía)/i.test(title.trim())) return "Knowledge Article";
  if (/(hub|overview|landing|portal page)/i.test(t)) return "Topic Page";
  return "Knowledge Article";
}

function localizedSections(isSpanish: boolean) {
  return isSpanish
    ? {
        summary: "Resumen",
        whoApplies: "A quién aplica",
        beforeStart: "Antes de comenzar",
        steps: "Pasos",
        commonIssues: "Situaciones comunes",
        needHelp: "¿Necesita ayuda?",
        whatChanging: "Qué incluye esta política",
        whyMatters: "Por qué es importante",
        whatExpected: "Lo que se espera",
        exceptions: "Excepciones",
        compliance: "Cumplimiento",
        lastUpdated: "Última actualización",
        owner: "Propietario",
        effective: "Vigencia",
        nextReview: "Próxima revisión",
        ownerPlaceholder: "[Propietario del artículo, por confirmar]",
        signIn: "Inicie sesión en MyPepsiCo con su cuenta corporativa.",
        navigate: "Navegue a la sección correspondiente al tema.",
        followInstr: "Siga las instrucciones en pantalla y revise sus selecciones antes de enviar.",
        confirm: "Confirme la acción. Recibirá una notificación cuando se procese.",
        immediate: "Inmediata",
        getHelp: "Si tiene dudas, abra un caso en MyPepsiCo en *Contactar a RH* o escriba al equipo responsable indicado abajo.",
        topicIntro: "Esta página reúne todo lo que necesita saber para",
        topicFooter: "Si no encuentra lo que busca aquí, contacte al equipo responsable indicado abajo.",
      }
    : {
        summary: "Summary",
        whoApplies: "Who this applies to",
        beforeStart: "Before you start",
        steps: "Steps",
        commonIssues: "Common situations",
        needHelp: "Need help?",
        whatChanging: "What this policy covers",
        whyMatters: "Why this matters",
        whatExpected: "What's expected",
        exceptions: "Exceptions",
        compliance: "Compliance",
        lastUpdated: "Last updated",
        owner: "Owner",
        effective: "Effective",
        nextReview: "Next review",
        ownerPlaceholder: "[Article Owner — to be confirmed]",
        signIn: "Sign in to MyPepsiCo with your corporate credentials.",
        navigate: "Navigate to the relevant section for this topic.",
        followInstr: "Follow the on-screen instructions and review your inputs before submitting.",
        confirm: "Confirm the action. You'll receive a notification when it's processed.",
        immediate: "Immediately",
        getHelp: "If you have questions, open a case in MyPepsiCo at *Get Help* or email the team listed below.",
        topicIntro: "This page collects everything you need to know to",
        topicFooter: "If you can't find what you're looking for here, contact the team listed below.",
      };
}

function buildMockBody(args: {
  title: string;
  summary: string;
  audience: string;
  sourceText: string;
  contentType: ContentType;
  isSpanish: boolean;
  dateFormat: string;
  languageCode: string;
}): string {
  const { title, summary, audience, sourceText, contentType, isSpanish, dateFormat } = args;
  const L = localizedSections(isSpanish);

  const today = formatDate(new Date(), dateFormat);

  const summaryText =
    summary?.trim() ||
    (isSpanish
      ? "Esta guía describe los pasos clave que los colaboradores deben seguir."
      : "This guide outlines the key steps employees should follow.");

  const audienceText =
    audience?.trim() ||
    (isSpanish ? "Todos los colaboradores aplicables." : "All applicable employees.");

  const source = sourceText?.trim();

  // ── Knowledge Article ──────────────────────────────────────────────────────────
  if (contentType === "Knowledge Article") {
    const stepsBlock = source
      ? formatSourceAsSteps(source, isSpanish)
      : isSpanish
        ? `1. ${L.signIn}\n2. ${L.navigate}\n3. ${L.followInstr}\n4. ${L.confirm}`
        : `1. ${L.signIn}\n2. ${L.navigate}\n3. ${L.followInstr}\n4. ${L.confirm}`;

    return `# ${title}

## ${L.summary}

${summaryText}

## ${L.whoApplies}

${audienceText}

## ${L.beforeStart}

${isSpanish
  ? "- Confirme que tiene acceso a MyPepsiCo con sus credenciales corporativas.\n- Tenga a la mano cualquier información de soporte (códigos, recibos, fechas) que pueda necesitar.\n- Si su solicitud requiere aprobación, identifique a su gerente directo antes de comenzar."
  : "- Confirm you have access to MyPepsiCo with your corporate credentials.\n- Have any supporting information ready (codes, receipts, dates) that you may need.\n- If your request requires approval, identify your direct manager before starting."}

## ${L.steps}

${stepsBlock}

## ${L.commonIssues}

${isSpanish
  ? "**No puedo iniciar sesión.** Verifique sus credenciales en MyPepsiCo o restablezca su contraseña.\n\n**Mi solicitud no fue aprobada en el plazo esperado.** Las aprobaciones pendientes por más de tres días hábiles se escalan automáticamente al siguiente nivel.\n\n**Necesito modificar una solicitud enviada.** Abra el caso original y use la opción *Editar*. Si ya fue procesado, contacte al equipo responsable."
  : "**I can't sign in.** Verify your credentials in MyPepsiCo or reset your password.\n\n**My request wasn't approved in the expected timeframe.** Approvals pending for more than three business days are automatically escalated to the next level.\n\n**I need to change a submitted request.** Open the original case and use the *Edit* option. If it's already been processed, contact the responsible team."}

## ${L.needHelp}

${L.getHelp}

---

**${L.lastUpdated}:** ${today}
**${L.owner}:** ${L.ownerPlaceholder}
**${L.nextReview}:** TBD`;
  }

  // ── FAQ ─────────────────────────────────────────────────────────────
  if (contentType === "FAQ") {
    const questions = source
      ? extractFaqQuestions(source, isSpanish, title)
      : defaultFaqQuestions(title, summaryText, isSpanish);

    return `${questions}

---

**${L.lastUpdated}:** ${today}
**${L.owner}:** ${L.ownerPlaceholder}`;
  }

  // ── Policy ───────────────────────────────────────────────────────────
  if (contentType === "Policy") {
    return `# ${title}

## ${L.summary}

${summaryText}

## ${L.whoApplies}

${audienceText}

## ${L.whatChanging}

${isSpanish
  ? "Esta política establece las expectativas y obligaciones aplicables a la situación descrita arriba. Incluye:\n\n- Definiciones clave y alcance.\n- Procedimientos paso a paso.\n- Roles y responsabilidades.\n- Excepciones permitidas y proceso de aprobación.\n- Consecuencias por incumplimiento."
  : "This policy sets the expectations and obligations that apply to the situation described above. It includes:\n\n- Key definitions and scope.\n- Step-by-step procedures.\n- Roles and responsibilities.\n- Permitted exceptions and the approval process.\n- Consequences for non-compliance."}

${source ? `### ${isSpanish ? "Detalles específicos" : "Specific details"}\n\n${source}\n\n` : ""}## ${L.whatExpected}

${isSpanish
  ? "1. Lea esta política en su totalidad y consulte cualquier sección que no esté clara.\n2. Aplique los procedimientos descritos a las situaciones que correspondan.\n3. Documente las excepciones según el proceso de aprobación indicado.\n4. Complete el reconocimiento anual en MyPepsiCo."
  : "1. Read this policy in full and clarify anything that isn't clear.\n2. Apply the described procedures to situations that correspond.\n3. Document exceptions via the indicated approval process.\n4. Complete the annual acknowledgment in MyPepsiCo."}

## ${L.exceptions}

${isSpanish
  ? "Las excepciones se evalúan caso por caso y requieren la aprobación documentada del equipo responsable. Para solicitar una excepción, abra un caso en MyPepsiCo con la justificación, contexto, y mitigaciones propuestas."
  : "Exceptions are evaluated case by case and require documented approval from the responsible team. To request an exception, open a case in MyPepsiCo with the justification, context, and proposed mitigations."}

## ${L.compliance}

${isSpanish
  ? "El incumplimiento de esta política puede resultar en medidas correctivas conforme al Código de Conducta de PepsiCo. Reporte cualquier preocupación a través de los canales habituales o la línea Speak Up."
  : "Non-compliance with this policy may result in corrective action under PepsiCo's Code of Conduct. Report concerns through the usual channels or the Speak Up hotline."}

---

**${L.lastUpdated}:** ${today}
**${L.owner}:** ${L.ownerPlaceholder}
**${L.effective}:** ${L.immediate}
**${L.nextReview}:** TBD`;
  }

  // ── Topic Page ───────────────────────────────────────────────────────
  return `# ${title}

## ${L.summary}

${summaryText}

## ${L.whoApplies}

${audienceText}

## ${isSpanish ? "Qué encontrará aquí" : "What you'll find here"}

${L.topicIntro} ${title.toLowerCase()}. ${source ? `\n\n${source}` : ""}

${isSpanish
  ? "### Recursos clave\n\n- Artículos relacionados sobre este tema.\n- Procedimientos y formularios necesarios.\n- Contactos para preguntas específicas.\n\n### Tareas comunes\n\n- Iniciar un proceso desde MyPepsiCo.\n- Consultar el estado de una solicitud abierta.\n- Acceder a documentación de respaldo."
  : "### Key resources\n\n- Related articles on this topic.\n- Required procedures and forms.\n- Contacts for specific questions.\n\n### Common tasks\n\n- Start a process from MyPepsiCo.\n- Check the status of an open request.\n- Access supporting documentation."}

## ${L.needHelp}

${L.topicFooter}

---

**${L.lastUpdated}:** ${today}
**${L.owner}:** ${L.ownerPlaceholder}
**${L.nextReview}:** TBD`;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(d: Date, fmt: string): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  if (fmt.startsWith("DD")) return `${dd}/${mm}/${yyyy}`;
  return `${mm}/${dd}/${yyyy}`;
}

function formatSourceAsSteps(source: string, isSpanish: boolean): string {
  // Try to detect existing numbered/bulleted steps. Otherwise split on sentences.
  const lines = source
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Already structured as a list?
  if (lines.every((l) => /^(\d+\.|-|\*)\s+/.test(l))) {
    return lines
      .map((l, i) => `${i + 1}. ${l.replace(/^(\d+\.|-|\*)\s+/, "")}`)
      .join("\n");
  }

  // Single block with periods → split into sentence-steps
  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  if (sentences.length >= 2) {
    return sentences.slice(0, 8).map((s, i) => `${i + 1}. ${s}`).join("\n");
  }

  // Fallback
  return isSpanish
    ? `1. Revise la información de origen.\n2. Aplique los pasos correspondientes.\n3. Confirme el resultado.`
    : `1. Review the source information.\n2. Apply the relevant steps.\n3. Confirm the result.`;
}

function extractFaqQuestions(source: string, isSpanish: boolean, title: string): string {
  const lines = source.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const qLines = lines.filter((l) => l.includes("?") || /^Q[:\.]/.test(l));

  if (qLines.length >= 2) {
    return qLines
      .slice(0, 8)
      .map((q) => {
        const clean = q.replace(/^Q[:\.\s]*/i, "");
        const placeholder = isSpanish
          ? "Respuesta detallada para esta pregunta, basada en las políticas y procedimientos de PepsiCo."
          : "A detailed answer to this question, grounded in PepsiCo's policies and procedures.";
        return `## ${clean}\n\n${placeholder}`;
      })
      .join("\n\n");
  }

  return defaultFaqQuestions(title, source, isSpanish);
}

function defaultFaqQuestions(title: string, summary: string, isSpanish: boolean): string {
  if (isSpanish) {
    return `## ¿De qué se trata "${title}"?

${summary}

## ¿A quién aplica?

Aplica a todos los colaboradores en el alcance descrito. Consulte con su gerente o Recursos Humanos si tiene dudas sobre su elegibilidad.

## ¿Cuándo entra en vigor?

Esta información está vigente desde la fecha de última actualización indicada al final del documento.

## ¿Dónde puedo obtener más información?

Abra un caso en MyPepsiCo en *Contactar a RH*, o consulte la sección correspondiente del portal del colaborador.

## ¿Qué hago si necesito una excepción?

Las excepciones se gestionan caso por caso. Comuníquese con su gerente directo y con el equipo responsable del tema.`;
  }
  return `## What is "${title}" about?

${summary}

## Who does this apply to?

It applies to all employees within the described scope. Check with your manager or HR if you have questions about your eligibility.

## When does it take effect?

This information is effective from the last-updated date shown at the bottom of this document.

## Where can I get more details?

Open a case in MyPepsiCo at *Get Help*, or visit the relevant section of the employee portal.

## What do I do if I need an exception?

Exceptions are handled case by case. Contact your direct manager and the responsible team listed below.`;
}

// ----------------------------------------------------------------------------

export async function runMarketAgent(args: {
  parsed: {
    title: string;
    contentType: string;
    summary: string;
    audience: string;
    sourceText: string;
    // Phase A — passed through from intake; safe to omit on legacy callers.
    countries?: string[];
    seo?: ArticleSEO;
  };
  profile: MarketProfile;
  /** Sector profile that owns this country. Composed above the country
   *  profile in the system prompt (corporate → locale). May be null when
   *  the country has no sector assigned (older data). */
  sector?: SectorProfile | null;
}): Promise<MarketDraft> {
  const { parsed, profile, sector } = args;

  // Phase A: weave SEO + country context into the user prompt so the draft
  // already targets the right search intent and the right audience scope.
  // The richer market-profile SEO context comes in Phase D.
  const seoLines: string[] = [];
  if (parsed.seo?.title) {
    seoLines.push(`SEO title (target search snippet): ${parsed.seo.title}`);
  }
  if (parsed.seo?.metaDescription) {
    seoLines.push(`Meta description: ${parsed.seo.metaDescription}`);
  }
  if (parsed.seo?.keywords && parsed.seo.keywords.length > 0) {
    seoLines.push(
      `Keywords to weave in naturally (do not stuff): ${parsed.seo.keywords.join(", ")}`,
    );
  }
  if (parsed.countries && parsed.countries.length > 0) {
    seoLines.push(`Applies to countries: ${parsed.countries.join(", ")}`);
  }
  const seoBlock = seoLines.length > 0 ? `\n\n${seoLines.join("\n")}` : "";

  const userMsg = `Draft a ${parsed.contentType} for the ${profile.name} country.

Title: ${parsed.title}
Audience: ${parsed.audience}
Summary: ${parsed.summary}${seoBlock}

Source material (use this as your factual basis — don't invent policy details):
${parsed.sourceText || "(none provided — use the summary as your guide)"}

Draft the full article now.`;

  const isSpanish = profile.languageCode === "es-MX";
  const contentType = (parsed.contentType as ContentType) || inferContentType(parsed.title, parsed.summary);

  const mockBody = buildMockBody({
    title: parsed.title || (isSpanish ? "Artículo sin título" : "Untitled article"),
    summary: parsed.summary,
    audience: parsed.audience,
    sourceText: parsed.sourceText,
    contentType,
    isSpanish,
    dateFormat: profile.dateFormat,
    languageCode: profile.languageCode,
  });

  const text = await callClaude({
    system: [{ text: SYSTEM_TEMPLATE(profile, sector ?? null), cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse: mockBody,
    maxTokens: 3500,
  });

  const lines = text.trim().split("\n");
  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : parsed.title;

  return { title, body: text.trim() };
}

export async function runMarketRevisionAgent(args: {
  originalDraft: string;
  complianceIssues: { severity: string; category: string; message: string }[];
  profile: MarketProfile;
  /** Sector profile that owns this country. Same composition rules as
   *  runMarketAgent — corporate framing above locale execution. */
  sector?: SectorProfile | null;
}): Promise<MarketDraft> {
  const { originalDraft, complianceIssues, profile, sector } = args;

  const userMsg = `The compliance agent flagged the following issues with your draft. Revise the article
to address them while keeping the same structure and intent.

Issues:
${complianceIssues.map((i, idx) => `${idx + 1}. [${i.severity.toUpperCase()} - ${i.category}] ${i.message}`).join("\n")}

Original draft:
---
${originalDraft}
---

Return the revised article in Markdown. Start with the H1 title.`;

  const mockRevised = `${originalDraft}\n\n<!-- Revised to address ${complianceIssues.length} compliance issue(s). -->`;

  const text = await callClaude({
    system: [{ text: SYSTEM_TEMPLATE(profile, sector ?? null), cache: true }],
    messages: [{ role: "user", content: userMsg }],
    mockResponse: mockRevised,
    maxTokens: 3500,
  });

  const lines = text.trim().split("\n");
  const titleLine = lines.find((l) => l.startsWith("# "));
  const title = titleLine ? titleLine.replace(/^#\s+/, "").trim() : "Revised draft";

  return { title, body: text.trim() };
}
