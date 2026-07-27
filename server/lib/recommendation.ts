import type { PublishedArticle, Staleness } from "./types";
import type { SimilarityMatch } from "./similarity";

export type RecommendationSeverity = "high" | "medium" | "low";
export type RecommendationKind =
  | "consolidate"
  | "standardize"
  | "replace"
  | "archive"
  | "mark-reviewed"
  | "noop";

export type RecommendationEvidence = {
  signal: string;
  label: string;
  detail: string;
  severity: RecommendationSeverity;
};

export type ApplyOperation =
  | { kind: "generate-draft"; draftKind: "consolidation" | "standardization"; candidateIds?: string[] }
  | { kind: "archive" }
  | { kind: "mark-reviewed" }
  | { kind: "noop" };

export type Recommendation = {
  kind: RecommendationKind;
  title: string;
  reason: string;
  severity: RecommendationSeverity;
  evidence: RecommendationEvidence[];
  actionLabel?: string;
  apply: ApplyOperation;
  similarRef?: {
    id: string;
    title: string;
  };
};

const LOW_VIEWS_THRESHOLD = 5;

export function recommend(
  article: PublishedArticle,
  staleness: Staleness,
  similars: SimilarityMatch[],
): Recommendation {
  if (staleness.level === "archived") {
    return {
      kind: "noop",
      title: "Archived",
      reason: "This article is out of rotation. No action is needed unless it should come back into search.",
      severity: "low",
      evidence: [
        {
          signal: "lifecycle",
          label: "Archived",
          detail: article.archivedReason ?? "The article has been removed from active search results.",
          severity: "low",
        },
      ],
      apply: { kind: "noop" },
    };
  }

  const topSimilar = similars[0];
  const strongSimilar = topSimilar && topSimilar.score >= 0.3;
  const candidateIds = similars
    .filter((m) => m.score >= 0.3)
    .slice(0, 4)
    .map((m) => m.item.id);

  if ((staleness.level === "stale" || staleness.level === "aging") && strongSimilar) {
    return {
      kind: "consolidate",
      title: `Generate one master article from ${candidateIds.length + 1} overlapping articles`,
      reason: `"${truncate(topSimilar.item.title, 60)}" overlaps strongly with this article. Generate a consolidated draft and keep the source audit trail.`,
      severity: staleness.level === "stale" ? "high" : "medium",
      evidence: [
        {
          signal: "similarity",
          label: `${Math.round(topSimilar.score * 100)}% overlap`,
          detail: `Strongest match: ${topSimilar.item.title}`,
          severity: "high",
        },
        {
          signal: "staleness",
          label: `${capitalize(staleness.level)} - ${staleness.score}/100`,
          detail: staleness.reasons[0] ?? "Lifecycle review signal detected.",
          severity: staleness.level === "stale" ? "high" : "medium",
        },
        {
          signal: "traffic",
          label: `${article.metrics.views30d} views in 30d`,
          detail: "Traffic indicates whether consolidation will affect active employee journeys.",
          severity: article.metrics.views30d > LOW_VIEWS_THRESHOLD ? "medium" : "low",
        },
      ],
      actionLabel: "Generate master draft",
      apply: { kind: "generate-draft", draftKind: "consolidation", candidateIds },
      similarRef: { id: topSimilar.item.id, title: topSimilar.item.title },
    };
  }

  if (staleness.level === "stale" && article.metrics.views30d <= LOW_VIEWS_THRESHOLD) {
    return {
      kind: "archive",
      title: "Archive low-engagement stale article",
      reason: `Only ${article.metrics.views30d} views in the last 30 days and the review score is ${staleness.score}/100.`,
      severity: "high",
      evidence: [
        {
          signal: "traffic",
          label: "Low engagement",
          detail: `${article.metrics.views30d} views in the last 30 days.`,
          severity: "high",
        },
        {
          signal: "staleness",
          label: `Stale - ${staleness.score}/100`,
          detail: staleness.reasons.join(" "),
          severity: "high",
        },
      ],
      actionLabel: "Archive",
      apply: { kind: "archive" },
    };
  }

  if (needsStandardization(article)) {
    return {
      kind: "standardize",
      title: "Standardize this article for DEEx",
      reason: "The article appears migrated or under-structured. Generate a DEEx-compliant draft with required sections, metadata, and owner fields.",
      severity: staleness.level === "fresh" ? "medium" : "high",
      evidence: standardizationEvidence(article),
      actionLabel: "Standardize for DEEx",
      apply: { kind: "generate-draft", draftKind: "standardization" },
    };
  }

  if (staleness.level === "stale" || staleness.level === "aging") {
    return {
      kind: "mark-reviewed",
      title: staleness.level === "stale" ? "Refresh and mark reviewed" : "Review soon to reset cadence",
      reason: `This article is ${staleness.level} but no strong consolidation opportunity was found.`,
      severity: staleness.level === "stale" ? "high" : "medium",
      evidence: [
        {
          signal: "staleness",
          label: `${capitalize(staleness.level)} - ${staleness.score}/100`,
          detail: staleness.reasons.join(" "),
          severity: staleness.level === "stale" ? "high" : "medium",
        },
      ],
      actionLabel: "Mark as reviewed",
      apply: { kind: "mark-reviewed" },
    };
  }

  return {
    kind: "noop",
    title: "No action needed",
    reason: `Fresh (score ${staleness.score}/100), recent review, and no strong consolidation or standardization signals.`,
    severity: "low",
    evidence: [
      {
        signal: "health",
        label: "Fresh",
        detail: "No lifecycle action is recommended right now.",
        severity: "low",
      },
    ],
    apply: { kind: "noop" },
  };
}

function needsStandardization(article: PublishedArticle): boolean {
  const body = article.body.toLowerCase();
  return (
    !article.body.trim().startsWith("#") ||
    body.includes("owner - to be confirmed") ||
    body.includes("owner to be confirmed") ||
    body.includes("replace this placeholder") ||
    body.includes("migrated from") ||
    (article.seo?.summary ?? "").trim().length === 0
  );
}

function standardizationEvidence(article: PublishedArticle): RecommendationEvidence[] {
  const out: RecommendationEvidence[] = [];
  if (!article.body.trim().startsWith("#")) {
    out.push({
      signal: "structure",
      label: "Missing H1",
      detail: "The body does not start with a canonical article title.",
      severity: "medium",
    });
  }
  if (article.body.toLowerCase().includes("owner")) {
    out.push({
      signal: "governance",
      label: "Owner metadata needs review",
      detail: "Owner fields appear incomplete or migrated from source.",
      severity: "high",
    });
  }
  if ((article.seo?.summary ?? "").trim().length === 0) {
    out.push({
      signal: "metadata",
      label: "AI discovery summary missing",
      detail: "GEO metadata helps Now Assist and other copilots cite the right article.",
      severity: "medium",
    });
  }
  return out.length ? out : [{
    signal: "format",
    label: "Structure review",
    detail: "Article should be checked against DEEx template and length guidance.",
    severity: "medium",
  }];
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "..." : s;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
