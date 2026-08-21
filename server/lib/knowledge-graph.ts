import type { PublishedArticle } from "./types";

export type KnowledgeGraphNode = {
  id: string;
  type:
    | "Article"
    | "Topic"
    | "Policy"
    | "Process"
    | "System"
    | "Audience"
    | "Country"
    | "Sector"
    | "Knowledge Base"
    | "Source Document"
    | "Owner"
    | "Approver";
  label: string;
  articleId?: string;
};

export type KnowledgeGraphEdge = {
  source: string;
  target: string;
  type:
    | "belongsTo"
    | "appliesTo"
    | "appliesIn"
    | "covers"
    | "explains"
    | "references"
    | "replaces"
    | "duplicates"
    | "relatesTo"
    | "requires"
    | "hasTranslation";
  confidence?: number;
  reason?: string;
};

export type KnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
};

export function buildKnowledgeGraph(articles: PublishedArticle[]): KnowledgeGraph {
  const nodes = new Map<string, KnowledgeGraphNode>();
  const edges: KnowledgeGraphEdge[] = [];

  const addNode = (node: KnowledgeGraphNode) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
  };
  const connect = (edge: KnowledgeGraphEdge) => edges.push(edge);

  for (const article of articles) {
    const articleNodeId = `article:${article.id}`;
    addNode({
      id: articleNodeId,
      type: article.contentType === "Policy" ? "Policy" : "Article",
      label: article.title,
      articleId: article.id,
    });

    if (article.knowledgeBase || article.taxonomy?.knowledgeBaseId) {
      const kb = article.taxonomy?.knowledgeBaseId ?? article.knowledgeBase!;
      const kbNodeId = `knowledge-base:${kb}`;
      addNode({ id: kbNodeId, type: "Knowledge Base", label: kb });
      connect({ source: articleNodeId, target: kbNodeId, type: "belongsTo" });
    }

    if (article.sector || article.taxonomy?.sector) {
      const sector = article.taxonomy?.sector ?? article.sector!;
      const sectorNodeId = `sector:${sector}`;
      addNode({ id: sectorNodeId, type: "Sector", label: sector });
      connect({ source: articleNodeId, target: sectorNodeId, type: "belongsTo" });
    }

    for (const country of article.taxonomy?.countries ?? article.countries ?? []) {
      const countryNodeId = `country:${country}`;
      addNode({ id: countryNodeId, type: "Country", label: country });
      connect({ source: articleNodeId, target: countryNodeId, type: "appliesIn" });
    }

    for (const audience of article.taxonomy?.audiences ?? article.visibility?.audiences ?? []) {
      const audienceNodeId = `audience:${slug(audience)}`;
      addNode({ id: audienceNodeId, type: "Audience", label: audience });
      connect({ source: articleNodeId, target: audienceNodeId, type: "appliesTo" });
    }

    for (const topic of article.taxonomy?.topics ?? article.topics ?? []) {
      const topicNodeId = `topic:${slug(topic)}`;
      addNode({ id: topicNodeId, type: "Topic", label: topic });
      connect({ source: articleNodeId, target: topicNodeId, type: "covers" });
    }

    for (const system of article.taxonomy?.systems ?? []) {
      const systemNodeId = `system:${slug(system)}`;
      addNode({ id: systemNodeId, type: "System", label: system });
      connect({ source: articleNodeId, target: systemNodeId, type: "covers" });
    }

    for (const process of article.taxonomy?.processes ?? []) {
      const processNodeId = `process:${slug(process)}`;
      addNode({ id: processNodeId, type: "Process", label: process });
      connect({ source: articleNodeId, target: processNodeId, type: "explains" });
    }

    for (const ref of article.references ?? []) {
      const refNodeId = `source:${ref.id}`;
      addNode({ id: refNodeId, type: "Source Document", label: ref.title });
      connect({ source: articleNodeId, target: refNodeId, type: "references" });
    }

    if (article.owner) {
      const ownerNodeId = `owner:${slug(article.owner)}`;
      addNode({ id: ownerNodeId, type: "Owner", label: article.owner });
      connect({ source: articleNodeId, target: ownerNodeId, type: "belongsTo" });
    }

    if (article.approvedBy) {
      const approverNodeId = `approver:${slug(article.approvedBy)}`;
      addNode({ id: approverNodeId, type: "Approver", label: article.approvedBy });
      connect({ source: articleNodeId, target: approverNodeId, type: "references" });
    }

    for (const [locale] of Object.entries(article.translations ?? {})) {
      const localeNodeId = `translation:${locale}`;
      addNode({ id: localeNodeId, type: "Topic", label: locale });
      connect({ source: articleNodeId, target: localeNodeId, type: "hasTranslation" });
    }

    for (const relationship of article.relationships ?? []) {
      const type = relationship.relationshipType === "duplicateOf"
        ? "duplicates"
        : relationship.relationshipType === "replaces"
          ? "replaces"
          : relationship.relationshipType === "requires"
            ? "requires"
            : "relatesTo";
      connect({
        source: articleNodeId,
        target: `article:${relationship.targetArticleId}`,
        type,
        confidence: relationship.confidence,
        reason: relationship.reason,
      });
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
