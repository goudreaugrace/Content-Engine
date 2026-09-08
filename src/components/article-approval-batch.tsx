import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Checkbox,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ArticleDocument, { articleAnchorId } from "./article-document";
import ApprovalChecklist from "./approval-checklist";
import ArticleMetadataReview from "./article-metadata-review";
import { api, type Article } from "../lib/api";

type DecisionKind = "approve" | "changes" | "decline";
type Decision = { kind: DecisionKind; note: string; selectedFindingIds: string[] };

type Props = {
  articles: Article[];
  loading: boolean;
  loadError?: string | null;
  reviewerName: string;
  onSubmitted: () => Promise<void> | void;
};

const decisionLabels: Record<DecisionKind, string> = {
  approve: "Approve",
  changes: "Request changes",
  decline: "Decline publishing",
};

type AIReviewFinding = {
  id: string;
  title: string;
  detail: string;
  severity: "warning" | "error";
  section?: string;
};

function matchingSection(article: Article, phrase: string): string | undefined {
  const needle = phrase.toLowerCase();
  return article.sections?.find((section) =>
    JSON.stringify(section).toLowerCase().includes(needle),
  )?.title;
}

function aiReviewFindings(article: Article): AIReviewFinding[] {
  const findings: AIReviewFinding[] = [];

  for (const result of article.approvalResults ?? []) {
    if (result.severity === "ok") continue;
    findings.push({
      id: `rule-${result.id}`,
      title: result.label,
      detail: result.reason ?? "This automated governance check needs reviewer attention.",
      severity: result.severity,
    });
  }

  for (const [issueIndex, issue] of (article.complianceIssues ?? []).entries()) {
    if (issue.dismissed || issue.severity === "info") continue;
    findings.push({
      id: `compliance-${issueIndex}`,
      title: issue.category,
      detail: issue.message,
      severity: issue.severity,
      section: issue.section,
    });
  }

  if (/^#{1,6}\s/m.test(article.lead ?? "") || /^#{1,6}\s/m.test(article.seo?.metaDescription ?? "")) {
    findings.push({
      id: "metadata-markdown",
      title: "Remove formatting from summary metadata",
      detail: "The imported summary contains a Markdown heading. Summary metadata should be plain, concise text for clean search and AI retrieval.",
      severity: "warning",
    });
  }

  const searchableContent = [article.body, JSON.stringify(article.sections ?? [])].join("\n");
  if (/\bclick here\b/i.test(searchableContent)) {
    findings.push({
      id: "generic-link-label",
      title: "Replace generic link language",
      detail: "The article uses “click here.” Replace it with descriptive action text so employees, screen readers, search, and Ask Pep understand the destination.",
      severity: "warning",
      section: matchingSection(article, "click here"),
    });
  }

  if (/\baskpep\b/.test(searchableContent)) {
    findings.push({
      id: "ask-pep-name",
      title: "Use the approved Ask Pep name",
      detail: "One or more references use “askpep.” Update them to “Ask Pep” for consistent product naming and stronger entity recognition.",
      severity: "warning",
      section: matchingSection(article, "askpep"),
    });
  }

  for (const section of article.sections ?? []) {
    if (section.type !== "text") continue;
    const denseParagraph = section.body
      .split(/\n\s*\n/)
      .find((paragraph) => paragraph.trim().length > 700);
    if (!denseParagraph) continue;
    findings.push({
      id: `dense-${section.id}`,
      title: "Break up dense content",
      detail: "This section contains a paragraph longer than 700 characters. Add shorter paragraphs, bullets, or subheadings to improve scanning and answer extraction.",
      severity: "warning",
      section: section.title,
    });
    break;
  }

  return findings.slice(0, 6);
}

function requiresFirstMetadataReview(article: Article) {
  return (article.version ?? 1) === 1 && !(article.rejections?.length) && !article.reviewedAt;
}

function AIReviewCallouts({ article }: { article: Article }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const findings = aiReviewFindings(article);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [article.id]);

  if (findings.length === 0) return null;

  const jumpTo = (section?: string) => {
    const target = document.getElementById(section ? articleAnchorId(section) : "top");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, next) => setExpanded(next)}
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid " + t.ember,
        borderRadius: "8px !important",
        bgcolor: "rgba(213, 110, 12, 0.06)",
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 2 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: "100%", pr: 1 }}>
          <AutoAwesomeOutlinedIcon sx={{ color: t.ember }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>AI review callouts</Typography>
            <Typography variant="caption">
              {findings.length} potential {findings.length === 1 ? "issue" : "issues"} found. Expand to inspect the flags before deciding.
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Divider />
        <Stack divider={<Divider flexItem />}>
        {findings.map((finding) => (
          <Stack
            key={finding.id}
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ sm: "center" }}
            sx={{ px: 2, py: 1.5, bgcolor: t.paper }}
          >
            <WarningAmberRoundedIcon
              sx={{ color: finding.severity === "error" ? t.errorInk : t.ember, flexShrink: 0 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>{finding.title}</Typography>
              <Typography variant="body2" sx={{ mt: 0.25, color: t.slate }}>{finding.detail}</Typography>
            </Box>
            <Button size="small" variant="outlined" onClick={() => jumpTo(finding.section)}>
              {finding.section ? `Review ${finding.section}` : "Review metadata"}
            </Button>
          </Stack>
        ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export default function ArticleApprovalBatch({
  articles,
  loading,
  loadError,
  reviewerName,
  onSubmitted,
}: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [metadataReviewed, setMetadataReviewed] = useState<Record<string, boolean>>({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);

  useEffect(() => {
    setIndex((current) => Math.min(current, Math.max(0, articles.length - 1)));
  }, [articles.length]);

  const current = articles[index];
  const decidedCount = useMemo(
    () => articles.filter((article) => decisions[article.id]).length,
    [articles, decisions],
  );
  const choose = (kind: DecisionKind) => {
    if (!current) return;
    setDecisions((existing) => ({
      ...existing,
      [current.id]: {
        kind,
        note: existing[current.id]?.note ?? "",
        selectedFindingIds: existing[current.id]?.selectedFindingIds ?? [],
      },
    }));
  };

  const updateNote = (note: string) => {
    if (!current) return;
    setDecisions((existing) => ({
      ...existing,
      [current.id]: {
        kind: existing[current.id]?.kind ?? "changes",
        note,
        selectedFindingIds: existing[current.id]?.selectedFindingIds ?? [],
      },
    }));
  };

  const toggleFinding = (findingId: string) => {
    if (!current) return;
    setDecisions((existing) => {
      const prior = existing[current.id];
      const selected = new Set(prior?.selectedFindingIds ?? []);
      if (selected.has(findingId)) selected.delete(findingId);
      else selected.add(findingId);
      return {
        ...existing,
        [current.id]: {
          kind: "changes",
          note: prior?.note ?? "",
          selectedFindingIds: Array.from(selected),
        },
      };
    });
  };

  const decisionIsComplete = (article: Article) => {
    if (requiresFirstMetadataReview(article) && !metadataReviewed[article.id]) return false;
    const decision = decisions[article.id];
    if (!decision) return false;
    if (decision.kind === "approve") return true;
    if (decision.kind === "changes") {
      return decision.selectedFindingIds.length > 0 || decision.note.trim().length > 0;
    }
    return decision.note.trim().length > 0;
  };

  const completeDecisions = articles.filter(decisionIsComplete);
  const readyToSubmit = completeDecisions.length > 0;

  const submitBatch = async () => {
    if (!readyToSubmit) return;
    const submittingArticles = completeDecisions;
    const remainingCount = articles.length - submittingArticles.length;
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(
        submittingArticles.map((article) => {
          const decision = decisions[article.id];
          if (decision.kind === "approve") {
            return api.reviewArticle(article.id, {
              status: "approved",
              reviewer: reviewerName,
              note: decision.note.trim() || undefined,
            });
          }
          if (decision.kind === "changes") {
            const selectedFindings = aiReviewFindings(article).filter((finding) =>
              decision.selectedFindingIds.includes(finding.id),
            );
            const feedbackParts = [
              selectedFindings.length > 0
                ? [
                    "Selected AI review feedback:",
                    ...selectedFindings.map(
                      (finding) => `- ${finding.title}: ${finding.detail}`,
                    ),
                  ].join("\n")
                : "",
              decision.note.trim()
                ? `Additional reviewer notes:\n${decision.note.trim()}`
                : "",
            ].filter(Boolean);
            return api.reviewArticle(article.id, {
              status: "needs-info",
              reviewer: reviewerName,
              note: feedbackParts.join("\n\n"),
            });
          }
          return api.reviewArticle(article.id, {
            status: "rejected",
            reviewer: reviewerName,
            rejectionReason: decision.note.trim(),
          });
        }),
      );
      await onSubmitted();
      const submittedIds = new Set(submittingArticles.map((article) => article.id));
      setDecisions((existing) =>
        Object.fromEntries(
          Object.entries(existing).filter(([articleId]) => !submittedIds.has(articleId)),
        ),
      );
      setMetadataReviewed((existing) =>
        Object.fromEntries(
          Object.entries(existing).filter(([articleId]) => !submittedIds.has(articleId)),
        ),
      );
      setIndex(0);
      setSummaryOpen(false);
      setSubmissionNotice(
        remainingCount > 0
          ? `Submitted ${submittingArticles.length} ${submittingArticles.length === 1 ? "decision" : "decisions"}. ${remainingCount} ${remainingCount === 1 ? "article remains" : "articles remain"} in the queue.`
          : `Submitted all ${submittingArticles.length} ${submittingArticles.length === 1 ? "decision" : "decisions"}.`,
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress size={28} /></Box>;
  }

  if (loadError) {
    return <Alert severity="error">{loadError}</Alert>;
  }

  if (articles.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 5, textAlign: "center" }}>
        <CheckCircleOutlineRoundedIcon sx={{ fontSize: 44, color: t.successInk }} />
        <Typography variant="h5" sx={{ mt: 1.5 }}>No articles need approval</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          {submissionNotice ?? "New submissions from this team will appear here automatically."}
        </Typography>
      </Paper>
    );
  }

  if (summaryOpen) {
    return (
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h5">Review batch decisions</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Nothing is published or returned until you submit this batch.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => setSummaryOpen(false)}>Continue reviewing</Button>
        </Stack>
        {submissionNotice && <Alert severity="success" sx={{ mb: 2 }}>{submissionNotice}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={1.25}>
          {articles.map((article, articleIndex) => {
            const decision = decisions[article.id];
            const selectedFindings = decision
              ? aiReviewFindings(article).filter((finding) =>
                  decision.selectedFindingIds.includes(finding.id),
                )
              : [];
            const missingNote =
              decision?.kind === "decline" && !decision.note.trim() ||
              decision?.kind === "changes" &&
                selectedFindings.length === 0 &&
                !decision.note.trim();
            return (
              <Paper key={article.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{article.title}</Typography>
                    <Typography variant="caption">{article.submittedBy.name} · {article.market}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      color={decision?.kind === "approve" ? "success" : decision?.kind === "decline" ? "error" : decision ? "warning" : "default"}
                      label={decision ? decisionLabels[decision.kind] : "Decision needed"}
                    />
                    {missingNote && <Chip size="small" color="error" variant="outlined" label="Note required" />}
                    {requiresFirstMetadataReview(article) && !metadataReviewed[article.id] && (
                      <Chip size="small" color="warning" variant="outlined" label="Metadata review required" />
                    )}
                    <Tooltip title="Edit decision">
                      <IconButton size="small" onClick={() => { setIndex(articleIndex); setSummaryOpen(false); }}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
                {selectedFindings.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Selected AI feedback</Typography>
                    <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2.5 }}>
                      {selectedFindings.map((finding) => (
                        <Typography component="li" variant="body2" key={finding.id} sx={{ color: t.slate }}>
                          {finding.title}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
                {decision?.note.trim() && (
                  <Typography variant="body2" sx={{ mt: 1, color: t.slate }}>
                    <Box component="span" sx={{ fontWeight: 700 }}>Additional notes: </Box>
                    {decision.note}
                  </Typography>
                )}
              </Paper>
            );
          })}
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2} sx={{ mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {readyToSubmit
              ? `${completeDecisions.length} completed ${completeDecisions.length === 1 ? "decision is" : "decisions are"} ready. Undecided articles will remain in the queue.`
              : "Complete at least one decision. Change requests and declines require notes."}
          </Typography>
          <Button variant="contained" disabled={!readyToSubmit || submitting} onClick={submitBatch}>
            {submitting ? "Submitting…" : `Submit ${completeDecisions.length} ${completeDecisions.length === 1 ? "decision" : "decisions"}`}
          </Button>
        </Stack>
      </Box>
    );
  }

  const decision = decisions[current.id];
  const currentFindings = aiReviewFindings(current);
  const selectedFindingCount = decision?.selectedFindingIds.length ?? 0;
  const noteRequired =
    decision?.kind === "decline" ||
    (decision?.kind === "changes" && selectedFindingCount === 0);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Tooltip title="Previous article">
          <span><IconButton onClick={() => setIndex((value) => value - 1)} disabled={index === 0}><ArrowBackIosNewRoundedIcon /></IconButton></span>
        </Tooltip>
        <Stack alignItems="center" spacing={0.25}>
          <Typography sx={{ fontWeight: 700 }}>{index + 1} of {articles.length}</Typography>
          <Typography variant="caption">{decidedCount} decisions staged</Typography>
        </Stack>
        <Tooltip title="Next article">
          <span><IconButton onClick={() => setIndex((value) => value + 1)} disabled={index === articles.length - 1}><ArrowForwardIosRoundedIcon /></IconButton></span>
        </Tooltip>
      </Stack>

      {submissionNotice && <Alert severity="success" sx={{ mb: 2 }}>{submissionNotice}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5} sx={{ p: 2, bgcolor: t.surfaceContainerLow }}>
          <Box>
            <Typography variant="overline">Submitted by</Typography>
            <Typography sx={{ fontWeight: 700 }}>{current.submittedBy.name}</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={current.knowledgeBase ?? "myPepsiCo KB"} />
            <Chip size="small" label={current.market} />
            <Chip size="small" label={`Version ${current.version ?? 1}`} />
          </Stack>
        </Stack>
        <Divider />
        <Box sx={{ px: { xs: 2, md: 3 }, pt: 2.5 }}>
          <Stack spacing={2.5} sx={{ mb: 2.5, "& > *": { mb: "0 !important" } }}>
            <ArticleMetadataReview
              article={current}
              onSaved={onSubmitted}
              reviewComplete={Boolean(metadataReviewed[current.id])}
              onReviewComplete={(complete) => setMetadataReviewed((existing) => ({ ...existing, [current.id]: complete }))}
            />
            <AIReviewCallouts article={current} />
          </Stack>
          <ApprovalChecklist
            results={current.approvalResults}
            autoApproveCandidate={current.autoApproveCandidate}
          />
        </Box>
        <ArticleDocument
          body={current.body}
          sections={current.sections}
          market={current.market}
          title={current.title}
          lead={current.lead}
          contentType={current.contentType}
          canonicalSlug={current.canonicalSlug}
          updatedLabel={`Submitted ${new Date(current.submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
          showReaderActions={false}
          presentation="immersive"
        />
      </Paper>

      <Paper variant="outlined" sx={{ mt: 2.5, p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <RateReviewOutlinedIcon sx={{ color: t.pepsiBlue }} />
          <Typography variant="h6">Stage a decision</Typography>
        </Stack>
        {requiresFirstMetadataReview(current) && !metadataReviewed[current.id] && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            Metadata review is required for this new article. You may stage a decision now, but it will not be included in the submitted batch until metadata is confirmed.
          </Alert>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          {(["approve", "changes", "decline"] as DecisionKind[]).map((kind) => (
            <Button
              key={kind}
              variant={decision?.kind === kind ? "contained" : "outlined"}
              color={kind === "decline" ? "error" : kind === "changes" ? "warning" : "success"}
              onClick={() => choose(kind)}
            >
              {decisionLabels[kind]}
            </Button>
          ))}
        </Stack>
        {decision?.kind === "changes" && (
          <Box
            sx={{
              mt: 2,
              border: `1px solid ${t.border}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <Box sx={{ px: 2, py: 1.5, bgcolor: t.surfaceContainerLow }}>
              <Typography sx={{ fontWeight: 800 }}>Select AI feedback to include</Typography>
              <Typography variant="caption">
                Choose any suggested findings that should be sent back to {current.submittedBy.name}. You can add your own notes below.
              </Typography>
            </Box>
            {currentFindings.length > 0 ? (
              <Stack divider={<Divider flexItem />}>
                {currentFindings.map((finding) => {
                  const selected = decision.selectedFindingIds.includes(finding.id);
                  return (
                    <Box
                      component="label"
                      key={finding.id}
                      sx={{
                        display: "flex",
                        gap: 1.25,
                        alignItems: "flex-start",
                        px: 1.5,
                        py: 1.25,
                        cursor: "pointer",
                        bgcolor: selected ? t.pepsiBlueSubtle : t.paper,
                        "&:hover": { bgcolor: selected ? t.pepsiBlueSubtle : t.surfaceContainerLow },
                      }}
                    >
                      <Checkbox
                        checked={selected}
                        onChange={() => toggleFinding(finding.id)}
                        inputProps={{ "aria-label": `Include ${finding.title}` }}
                        sx={{ mt: -0.75, ml: -0.75 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700 }}>{finding.title}</Typography>
                          {finding.section && <Chip size="small" variant="outlined" label={finding.section} />}
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 0.25, color: t.slate }}>{finding.detail}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 2 }}>
                No AI findings are available for this article. Add your own change-request notes below.
              </Typography>
            )}
          </Box>
        )}
        {decision && (
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={decision.note}
            onChange={(event) => updateNote(event.target.value)}
            label={
              decision.kind === "changes"
                ? "Additional change-request notes"
                : noteRequired
                  ? "Reason for declining"
                  : "Approval notes (optional)"
            }
            helperText={
              decision.kind === "changes"
                ? selectedFindingCount > 0
                  ? `${selectedFindingCount} AI ${selectedFindingCount === 1 ? "finding" : "findings"} selected. Add more context if needed.`
                  : "Select AI feedback in this request or enter your own change-request notes."
                : undefined
            }
            required={noteRequired}
            error={noteRequired && decision.note.length > 0 && !decision.note.trim()}
            sx={{ mt: 2 }}
          />
        )}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5} sx={{ mt: 2 }}>
          <Typography variant="caption">
            Decisions remain editable and will not take effect until the batch is submitted.
          </Typography>
          <Button variant="contained" onClick={() => setSummaryOpen(true)}>
            Review batch ({decidedCount}/{articles.length})
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
