import type { ArticleSEO, PublishedArticle } from "../lib/types";

export type ConsolidationDraft = {
  title: string;
  body: string;
  seo: ArticleSEO;
  coverage: string[];
  conflicts: string[];
};

function stripMarkdownTitle(body: string): string {
  return body.replace(/^#\s+.+\n+/, "").trim();
}

function firstParagraph(body: string): string {
  const cleaned = stripMarkdownTitle(body)
    .split(/\n{2,}/)
    .map((s) => s.replace(/^#+\s+/gm, "").trim())
    .find((s) => s.length > 40);
  return cleaned ?? stripMarkdownTitle(body).slice(0, 240);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function titleFrom(articles: PublishedArticle[]): string {
  const base = articles[0]?.title?.replace(/^how to\s+/i, "") ?? "Knowledge article";
  return `Master guide: ${base}`.slice(0, 80);
}

function metaDescription(title: string, articles: PublishedArticle[]): string {
  const markets = unique(articles.map((a) => a.market)).join(", ");
  const desc = `Consolidated DEEx knowledge article for ${markets} covering ${articles.length} related source articles: ${title}.`;
  return desc.length >= 50 ? desc.slice(0, 155) : `${desc} Includes steps, exceptions, and support paths.`;
}

export async function runConsolidationAgent(args: {
  primary: PublishedArticle;
  sources: PublishedArticle[];
}): Promise<ConsolidationDraft> {
  const sources = unique([args.primary, ...args.sources]);
  const title = titleFrom(sources);
  const countries = unique(sources.flatMap((a) => a.countries ?? []));
  const owners = unique(sources.map((a) => a.originalSubmittedBy?.name).filter(Boolean));
  const keywords = unique(
    sources.flatMap((a) => [
      ...(a.seo?.keywords ?? []),
      ...a.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4),
    ]),
  ).slice(0, 8);

  const sourceSummaries = sources
    .map((a, i) => `${i + 1}. ${a.title} (${a.id}) - ${firstParagraph(a.body)}`)
    .join("\n");

  const coverage = sources.map((a) => `${a.id}: ${a.title}`);
  const contentTypes = unique(sources.map((a) => a.contentType));
  const conflicts: string[] = [];
  if (contentTypes.length > 1) {
    conflicts.push(`Source articles use different content types: ${contentTypes.join(", ")}.`);
  }
  if (unique(sources.map((a) => a.market)).length > 1) {
    conflicts.push("Sources span multiple markets; reviewer should confirm country-specific exceptions before publishing.");
  }

  const body = `# ${title}

## Overview

This master article consolidates ${sources.length} overlapping knowledge articles into one governed entry. It keeps the reusable guidance, removes duplicate setup steps, and gives employees one place to resolve the topic.

## Who this applies to

Employees in ${countries.length ? countries.join(", ") : "the selected countrys"} who need the guidance covered by the source articles.

## What changed

- Combined repeated instructions from ${sources.length} related articles.
- Preserved country and review metadata for governance traceability.
- Flagged conflicts for reviewer confirmation before publish.

## Steps

1. Review the overview to confirm this master article covers your situation.
2. Follow the applicable steps from the consolidated guidance below.
3. Use the support path if the standard process does not resolve your issue.

## Consolidated guidance

${sourceSummaries}

## Exceptions and country notes

${conflicts.length ? conflicts.map((c) => `- ${c}`).join("\n") : "- No major conflicts detected across the selected source articles."}

## Need help?

Open a case in MyPepsiCo or contact the owning team listed in the source article history.

---

**Source articles:** ${coverage.join("; ")}
**Original owners:** ${owners.join(", ") || "To be confirmed"}
**Last updated:** ${new Date().toLocaleDateString("en-US")}
**Next review:** TBD`;

  return {
    title,
    body,
    seo: {
      title: title.length >= 30 ? title.slice(0, 60) : `${title} - consolidated guide`.slice(0, 60),
      metaDescription: metaDescription(title, sources),
      keywords,
      summary: `One master article consolidating ${sources.length} overlapping knowledge articles for ${countries.join(", ") || "the selected audience"}.`,
      keyQuestions: [
        `What changed in ${title}?`,
        "Which source articles were combined?",
        "What should I do if my situation is an exception?",
      ],
      entities: unique(sources.flatMap((a) => [a.title, ...(a.seo?.entities ?? [])])).slice(0, 8),
    },
    coverage,
    conflicts,
  };
}
