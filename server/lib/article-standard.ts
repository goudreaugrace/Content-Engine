import { randomUUID } from "node:crypto";
import type {
  Article,
  ArticleFeedback,
  ArticleReference,
  ArticleRevision,
  ArticleTranslation,
  ArticleTranslations,
  JobInput,
  ProfileSource,
  PublishedArticle,
} from "./types";

type StandardContext = {
  input?: JobInput;
  marketSources?: ProfileSource[];
  sectorSources?: ProfileSource[];
  now?: string;
  actor?: string;
};

const FOOTER_LABELS = [
  "Last updated",
  "Última actualización",
  "Owner",
  "Propietario",
  "Next review",
  "Próxima revisión",
  "Effective",
  "Vigencia",
  "Approved by",
  "Aprobado por",
];

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function translationBody(value: string | ArticleTranslation | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.body;
}

export function defaultFeedback(): ArticleFeedback {
  return { helpful: 0, notHelpful: 0, shares: 0, comments: [] };
}

export function normalizeArticleStandard<T extends Article | PublishedArticle>(
  article: T,
  context: StandardContext = {},
): T {
  const at = context.now ?? new Date().toISOString();
  const footer = parseFooterMetadata(article.body);
  const cleanBody = stripFooterMetadata(article.body);
  const lead = article.lead?.trim() || article.seo?.summary?.trim() || extractLead(cleanBody);
  const owner = article.owner?.trim() || footer.owner || fallbackOwner(article, context);
  const nextReviewAt = article.nextReviewAt ?? normalizeDateLike(footer.nextReview);
  const effectiveAt = article.effectiveAt ?? normalizeDateLike(footer.effective);
  const approvedBy = article.approvedBy ?? footer.approvedBy;
  const references = ensureReferences(article.references, context, at);
  const topics = unique([
    ...(article.topics ?? []),
    article.contentType,
    ...(article.seo?.entities ?? []),
    ...(article.seo?.keywords ?? []),
  ]).slice(0, 12);
  const aliases = unique([
    ...(article.aliases ?? []),
    ...(article.seo?.keywords ?? []),
    ...(article.seo?.keyQuestions ?? []).map((q) => q.replace(/\?$/, "")),
  ]).slice(0, 12);
  const inputMarkets = context.input?.markets?.length
    ? context.input.markets
    : [article.market.toLowerCase()];
  const replacesArticleId = "replacesArticleId" in article
    ? article.replacesArticleId
    : undefined;

  return {
    ...article,
    body: cleanBody,
    lead,
    canonicalSlug: article.canonicalSlug || slugifyTitle(article.title),
    aliases,
    topics,
    references,
    relatedArticleIds: article.relatedArticleIds ?? [],
    taxonomy: article.taxonomy ?? {
      knowledgeBaseId: article.knowledgeBase ?? context.input?.knowledgeBase ?? "mypepsico-general",
      sector: article.sector ?? context.input?.sectors?.[0] ?? "global",
      countries: article.countries ?? context.input?.countries ?? [],
      writtenLanguage: context.input?.taxonomy?.writtenLanguage,
      languagesRequired: inferLanguageRequirements(context.input?.countries ?? article.countries ?? []),
      audiences: context.input?.audience ? [context.input.audience] : article.visibility?.audiences ?? ["All employees"],
      contentType: article.contentType,
      topics,
      businessTerms: inferBusinessTerms(article.title, cleanBody, topics),
      systems: inferSystems(cleanBody),
      processes: inferProcesses(article.title, cleanBody),
    },
    relationships: uniqueRelationships([
      ...(article.relationships ?? []),
      ...(replacesArticleId
        ? [{
            targetArticleId: replacesArticleId,
            relationshipType: "replaces" as const,
            confidence: 1,
            reason: "Author marked this article as a replacement during creation.",
          }]
        : []),
      ...(article.relatedArticleIds ?? []).map((targetArticleId) => ({
        targetArticleId,
        relationshipType: "relatedTo" as const,
        confidence: 0.7,
        reason: "Related article link.",
      })),
    ]),
    visibility: article.visibility ?? context.input?.visibility ?? {
      audiences: context.input?.audience ? [context.input.audience] : ["All employees"],
      markets: inputMarkets,
      countries: article.countries ?? [],
      security: "all-employees",
      notes: "Visible to employees in the selected audience, market, and country scope.",
    },
    owner,
    effectiveAt,
    nextReviewAt,
    approvedBy,
  };
}

export function makeRevision(
  article: PublishedArticle,
  by: string,
  summary: string,
): ArticleRevision {
  return {
    version: article.version,
    at: new Date().toISOString(),
    by,
    summary,
    title: article.title,
    body: article.body,
  };
}

export function markTranslationsStale(
  translations: ArticleTranslations | undefined,
): ArticleTranslations | undefined {
  if (!translations) return translations;
  return Object.fromEntries(
    Object.entries(translations).map(([locale, value]) => {
      if (typeof value === "string") return [locale, value];
      return [locale, { ...value, status: "stale" }];
    }),
  );
}

function ensureReferences(
  existing: ArticleReference[] | undefined,
  context: StandardContext,
  at: string,
): ArticleReference[] {
  if (existing?.length) return existing;
  const refs: ArticleReference[] = [];
  const actor = context.actor ?? context.input?.submittedBy?.name ?? "Content Agent";
  const sourceText = context.input?.sourceText?.trim();
  if (sourceText) {
    refs.push({
      id: `ref-${randomUUID().slice(0, 8)}`,
      title: context.input?.title ? `Submitted source: ${context.input.title}` : "Submitted source material",
      kind: "note",
      source: "submission",
      excerpt: sourceText.slice(0, 260),
      addedAt: at,
      addedBy: actor,
    });
  }
  for (const source of [...(context.sectorSources ?? []), ...(context.marketSources ?? [])].slice(0, 6)) {
    refs.push({
      id: source.id || `ref-${randomUUID().slice(0, 8)}`,
      title: source.title,
      kind: source.kind === "url" ? "url" : source.kind === "note" ? "note" : "doc",
      url: source.url,
      filePath: source.filePath,
      excerpt: source.snippet,
      source: "profile",
      addedAt: source.addedAt ?? at,
      addedBy: source.addedBy ?? "Profile admin",
    });
  }
  if (refs.length === 0) {
    refs.push({
      id: `ref-${randomUUID().slice(0, 8)}`,
      title: "Author-provided request summary",
      kind: "note",
      source: "submission",
      excerpt: context.input?.summary || "No explicit source attached. Reviewer should confirm authoritative backing before publish.",
      addedAt: at,
      addedBy: actor,
    });
  }
  return refs;
}

function extractLead(body: string): string {
  const summary = body.match(/^##\s+(Summary|Resumen|Overview|What is .+?)\s*\n+([\s\S]*?)(?=\n##\s+|\n---|$)/im)?.[2];
  const fromSummary = firstParagraph(summary ?? "");
  if (fromSummary) return fromSummary;
  const withoutH1 = body.replace(/^#\s+.+\n+/, "");
  return firstParagraph(withoutH1) || "This article explains the topic, audience, and steps employees need to follow.";
}

function firstParagraph(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/^[-*\d.]+\s+/gm, "").trim())
    .find((p) => p.length > 20 && !p.startsWith("##")) ?? "";
}

function parseFooterMetadata(body: string): {
  owner?: string;
  nextReview?: string;
  effective?: string;
  approvedBy?: string;
} {
  const out: Record<string, string> = {};
  for (const label of FOOTER_LABELS) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = body.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)`, "i"));
    if (match?.[1]) out[label] = match[1].trim();
  }
  return {
    owner: out.Owner ?? out.Propietario,
    nextReview: out["Next review"] ?? out["Próxima revisión"],
    effective: out.Effective ?? out.Vigencia,
    approvedBy: out["Approved by"] ?? out["Aprobado por"],
  };
}

function stripFooterMetadata(body: string): string {
  const footerLine = FOOTER_LABELS.map((label) =>
    label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  return body
    .replace(new RegExp(`\\n---\\n\\n(?:\\*\\*(?:${footerLine}):\\*\\*[^\\n]*\\n?)+\\s*$`, "i"), "")
    .trim();
}

function fallbackOwner(article: Article | PublishedArticle, context: StandardContext): string {
  if ("submittedBy" in article) return article.submittedBy.name;
  return context.input?.submittedBy?.name ?? article.originalSubmittedBy.name;
}

function normalizeDateLike(value: string | undefined): string | undefined {
  if (!value || value.toUpperCase() === "TBD" || value.toLowerCase().includes("pending")) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(+parsed) ? value : parsed.toISOString();
}

function inferLanguageRequirements(countries: string[]): string[] {
  const localeByCountry: Record<string, string[]> = {
    US: ["en-US"],
    CA: ["en-CA", "fr-CA"],
    MX: ["es-MX"],
    BR: ["pt-BR"],
    GB: ["en-GB"],
    IN: ["en-IN", "hi-IN"],
    FR: ["fr-FR"],
    DE: ["de-DE"],
    PH: ["en-PH"],
  };
  return unique(countries.flatMap((country) => localeByCountry[country] ?? []));
}

function inferBusinessTerms(title: string, body: string, topics: string[]): string[] {
  return unique([
    ...topics,
    ...`${title} ${body}`
      .split(/[^A-Za-z0-9&]+/)
      .filter((word) => word.length > 4 && /^[A-Z]/.test(word)),
  ]).slice(0, 14);
}

function inferSystems(body: string): string[] {
  const candidates = ["Workday", "ServiceNow", "SAP", "myPepsiCo", "Speak Up", "AIRLINC", "Image Vision"];
  return candidates.filter((system) => new RegExp(`\\b${system.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(body));
}

function inferProcesses(title: string, body: string): string[] {
  const text = `${title}\n${body}`.toLowerCase();
  const candidates = ["approval", "payroll", "benefits", "reporting", "relocation", "access", "expense", "ethics", "translation", "review"];
  return candidates.filter((process) => text.includes(process));
}

function uniqueRelationships<T extends { targetArticleId: string; relationshipType: string }>(relationships: T[]): T[] {
  const seen = new Set<string>();
  return relationships.filter((relationship) => {
    const key = `${relationship.relationshipType}:${relationship.targetArticleId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
