import type { ArticleSEO, ContentType, MarketProfile, SectorProfile } from "../lib/types";

export type MigrationStandardizationDraft = {
  title: string;
  body: string;
  seo: ArticleSEO;
  traceSummary: string[];
};

function cleanTitle(raw: string, fallback: string): string {
  const firstLine = raw
    .split(/\n+/)
    .map((s) => s.replace(/^#+\s*/, "").trim())
    .find(Boolean);
  return (fallback || firstLine || "Standardized knowledge article").slice(0, 90);
}

function excerpt(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 650);
}

function requiredSections(type: ContentType): string[] {
  return {
    FAQ: ["Question", "Answer", "Related"],
    Policy: ["Overview", "Policy", "Effective date", "Contact"],
    "Knowledge Article": ["Overview", "Steps", "Troubleshooting"],
    "Topic Page": ["Overview", "Details", "Resources"],
  }[type];
}

export async function runMigrationStandardizationAgent(args: {
  sourceTitle: string;
  sourceContent: string;
  contentType: ContentType;
  market: MarketProfile | null;
  sector: SectorProfile | null;
  countries: string[];
}): Promise<MigrationStandardizationDraft> {
  const title = cleanTitle(args.sourceTitle, args.sourceTitle);
  const sections = requiredSections(args.contentType);
  const marketName = args.market?.name ?? "selected country";
  const sectorName = args.sector?.name ?? "selected sector";
  const sourceExcerpt = excerpt(args.sourceContent);

  const body = `# ${title}

## Overview

This article has been standardized from migrated source content for ${marketName} in ${sectorName}. It is condensed into the DEEx article structure, with metadata and review fields ready for governance review.

## ${sections[0]}

${sourceExcerpt || "Source content was provided without a clear opening summary. Reviewer should add the business-specific summary before publishing."}

## ${sections[1] ?? "Details"}

- Use the guidance from the migrated source as the authoritative baseline.
- Keep the article focused on employee action, not repository history.
- Remove duplicate context and long-form background that does not help the reader complete the task.

## ${sections[2] ?? "Steps"}

1. Confirm the policy, process, or support path applies to your country and role.
2. Follow the relevant steps or contact path from the source guidance.
3. Open a MyPepsiCo case if the standard path does not resolve the issue.

## ${sections[3] ?? "Need help?"}

Contact the owning team listed in the migrated source. If ownership is unclear, route to the portal governance team before publishing.

---

**Migrated from:** SharePoint / source repository
**Countries:** ${args.countries.join(", ") || "To be confirmed"}
**Owner:** [Owner to be confirmed]
**Last updated:** ${new Date().toLocaleDateString("en-US")}
**Next review:** TBD`;

  const seoTitle = title.length >= 30 ? title.slice(0, 60) : `${title} - DEEx standard article`.slice(0, 60);
  const metaDescription = `Standardized DEEx article for ${marketName}: ${title}. Condensed from migrated source content with governance metadata ready for review.`;

  return {
    title,
    body,
    seo: {
      title: seoTitle,
      metaDescription: metaDescription.slice(0, 155),
      keywords: Array.from(new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3))).slice(0, 6),
      summary: `Standardized DEEx article created from migrated source content for ${marketName}.`,
      keyQuestions: [
        `What does ${title} require?`,
        "Who owns this migrated content?",
        "What should employees do next?",
      ],
      entities: [title, marketName, sectorName],
    },
    traceSummary: [
      "Condensed source content into a DEEx article template.",
      "Applied required sections for the selected content type.",
      "Added governance metadata for owner, countries, last updated, and next review.",
    ],
  };
}
