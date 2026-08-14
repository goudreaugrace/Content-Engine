import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  LinearProgress,
  TextField,
  Avatar,
  useTheme,
  alpha,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HistoryToggleOffIcon from "@mui/icons-material/HistoryToggleOff";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  api,
  type Article,
  type AttentionItem,
  type PublishedArticle,
} from "../lib/api";
import { localeFor } from "../lib/market";
import EditableArticle from "../components/editable-article";
import ApprovalChecklist from "../components/approval-checklist";
import ArticleDocument from "../components/article-document";
import ArticleReviewFrame from "../components/article-review-frame";

type PendingAction = null | "reject" | "needs-info";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysAgo(iso: string) {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

/**
 * Per-item cached payload — the attention feed only carries summary info,
 * so we lazy-load the full article (draft or published) when the user lands
 * on each row.
 */
type LoadedItem = {
  item: AttentionItem;
  draft?: Article;
  published?: PublishedArticle;
};

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export default function ReviewQueue() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [queue, setQueue] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [reviewedCount, setReviewedCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [note, setNote] = useState("");
  const [loadKey, setLoadKey] = useState(0);

  // Cache of fully-loaded items keyed by `${kind}-${id}`.
  const [loaded, setLoaded] = useState<Record<string, LoadedItem>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ── Load queue (attention items, severity=high, drafts + published only) ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listAttention()
      .then((items) => {
        if (cancelled) return;
        const reviewable = items.filter(
          (i) =>
            i.severity === "high" &&
            (i.kind === "draft" || i.kind === "published"),
        );
        setQueue(reviewable);
        setIndex(0);
        setSkipped(new Set());
        setReviewedCount(0);
        setLoaded({});
      })
      .catch((e) => !cancelled && setError(e?.message ?? String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loadKey]);

  const current = queue[index];
  const total = queue.length;
  const done = !loading && total > 0 && index >= total;
  const empty = !loading && total === 0;
  const progressPct = total === 0 ? 0 : Math.min(100, (index / total) * 100);

  // ── Lazy-load detail for the current item ──
  useEffect(() => {
    if (!current) return;
    const key = `${current.kind}-${current.id}`;
    if (loaded[key]) return;
    let cancelled = false;
    setLoadingDetail(true);
    const fetcher =
      current.kind === "draft"
        ? api.getArticle(current.id).then((draft) => ({ item: current, draft }))
        : api
            .getPublishedArticle(current.id)
            .then((published) => ({ item: current, published }));
    fetcher
      .then((rec) => {
        if (cancelled) return;
        setLoaded((m) => ({ ...m, [key]: rec }));
      })
      .catch((e) => !cancelled && setError(e?.message ?? String(e)))
      .finally(() => !cancelled && setLoadingDetail(false));
    return () => {
      cancelled = true;
    };
  }, [current, loaded]);

  // ── Actions ──
  const advance = () => {
    setIndex((i) => i + 1);
    setPendingAction(null);
    setNote("");
  };

  const approveDraft = async () => {
    if (!current || current.kind !== "draft") return;
    setProcessing(true);
    try {
      await api.reviewArticle(current.id, {
        status: "approved",
        reviewer: "Demo Reviewer",
      });
      setReviewedCount((n) => n + 1);
      advance();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setProcessing(false);
    }
  };

  const submitReject = async () => {
    if (!current || current.kind !== "draft" || !note.trim()) return;
    setProcessing(true);
    try {
      await api.reviewArticle(current.id, {
        status: "rejected",
        reviewer: "Demo Reviewer",
        rejectionReason: note.trim(),
      });
      setReviewedCount((n) => n + 1);
      advance();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setProcessing(false);
    }
  };

  const submitNeedsInfo = async () => {
    if (!current || current.kind !== "draft" || !note.trim()) return;
    setProcessing(true);
    try {
      await api.reviewArticle(current.id, {
        status: "needs-info",
        reviewer: "Demo Reviewer",
        note: note.trim(),
      });
      setReviewedCount((n) => n + 1);
      advance();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setProcessing(false);
    }
  };

  const markPublishedReviewed = async () => {
    if (!current || current.kind !== "published") return;
    setProcessing(true);
    try {
      await api.markPublishedReviewed(current.id, {});
      setReviewedCount((n) => n + 1);
      advance();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setProcessing(false);
    }
  };

  const skip = () => {
    if (!current) return;
    setSkipped((s) => new Set(s).add(current.id));
    advance();
  };

  const reviewSkippedAgain = () => {
    if (skipped.size === 0) return;
    setQueue((q) => q.filter((a) => skipped.has(a.id)));
    setIndex(0);
    setSkipped(new Set());
  };

  // ── Render branches ──
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 8 }}>
        <CircularProgress size={28} sx={{ color: t.slate }} />
      </Box>
    );
  }

  if (error) {
    return (
    <Box sx={{ maxWidth: 960, mx: "auto" }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (empty) {
    return (
      <DoneScreen
        title="Nothing needs your review right now."
        sub="High-priority drafts and stale published articles will appear here when they're ready."
        onBack={() => navigate("/")}
      />
    );
  }

  if (done) {
    return (
      <DoneScreen
        title={
          reviewedCount > 0
            ? `Reviewed ${reviewedCount} ${reviewedCount === 1 ? "item" : "items"}.`
            : "Queue cleared."
        }
        sub={
          skipped.size > 0
            ? `${skipped.size} ${skipped.size === 1 ? "item" : "items"} skipped. You can revisit them now or come back later.`
            : "You're all caught up."
        }
        onBack={() => navigate("/")}
        skippedCount={skipped.size}
        onReviewSkipped={reviewSkippedAgain}
      />
    );
  }

  if (!current) return null;
  const key = `${current.kind}-${current.id}`;
  const rec = loaded[key];

  // Phase P3.1 — bulk approve handler. Fetches every draft in the queue,
  // filters to those flagged autoApproveCandidate by the rules engine, and
  // approves them in parallel. Useful when reviewers have a stack of clean
  // drafts and don't want to walk through each one.
  const bulkApproveSafeDrafts = async () => {
    setProcessing(true);
    try {
      const draftItems = queue.filter((q) => q.kind === "draft");
      const drafts = await Promise.all(
        draftItems.map((it) => api.getArticle(it.id).catch(() => null)),
      );
      const safe = drafts.filter(
        (a): a is Article => !!a && !!a.autoApproveCandidate,
      );
      if (safe.length === 0) {
        setError("No auto-approve candidates in the current queue.");
        return;
      }
      await Promise.all(
        safe.map((a) =>
          api.reviewArticle(a.id, {
            status: "approved",
            reviewer: "Demo Reviewer",
          }),
        ),
      );
      setReviewedCount((n) => n + safe.length);
      // Bump the load key so the queue re-fetches and the approved drafts
      // drop out.
      setLoadKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setProcessing(false);
    }
  };

  const safeDraftCount = queue.filter(
    (q) =>
      q.kind === "draft" && q.reason === "Ready to approve — all checks passed",
  ).length;

  return (
    <Box sx={{ maxWidth: 1520, mx: "auto" }}>
      {/* ─── Top bar ─── */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Button
          startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
          onClick={() => navigate("/")}
          size="small"
        >
          All Articles
        </Button>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Phase P3.1 — bulk approve. Visible only when safe drafts exist
              in the queue; one click approves all of them. */}
          {safeDraftCount > 0 && (
            <Button
              size="small"
              variant="tonal"
              onClick={bulkApproveSafeDrafts}
              disabled={processing}
              startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
              sx={{ fontSize: "0.75rem" }}
            >
              {processing
                ? "Approving…"
                : `Approve ${safeDraftCount} safe ${safeDraftCount === 1 ? "draft" : "drafts"}`}
            </Button>
          )}
          <Typography sx={{ fontSize: "0.875rem", color: t.slate }}>
            Reviewing{" "}
            <Box component="span" sx={{ color: t.ink, fontWeight: 500 }}>
              {index + 1}
            </Box>{" "}
            of {total}
          </Typography>
        </Stack>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progressPct}
        sx={{
          height: 3,
          borderRadius: 2,
          mb: 4,
          bgcolor: t.mist,
          "& .MuiLinearProgress-bar": { bgcolor: t.pepsiBlue },
        }}
      />

      {/* ─── Reason chip + meta ─── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
        {/* Queue is filtered to draft|published above, but the type system
            still sees the wider AttentionKind. Cast is safe here. */}
        <ReasonPill
          reason={current.reason}
          kind={current.kind as "draft" | "published"}
        />
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.granite,
          }}
        >
          {current.id}
        </Box>
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.slate,
          }}
        >
          {localeFor(current.market)}
        </Box>
        <Typography variant="body2" sx={{ color: t.slate }}>
          {current.contentType}
        </Typography>
      </Stack>

      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {current.title}
      </Typography>

      <Stack
        direction="row"
        spacing={3}
        flexWrap="wrap"
        rowGap={1.5}
        sx={{ mb: 3 }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar
            sx={{
              width: 24,
              height: 24,
              fontSize: 11,
              bgcolor: t.borderStrong,
              color: t.ink,
            }}
          >
            {initials(current.who)}
          </Avatar>
          <Typography sx={{ fontSize: "0.875rem" }}>{current.who}</Typography>
        </Stack>
        <Typography sx={{ fontSize: "0.875rem", color: t.slate }}>
          {current.kind === "published" ? "Last reviewed " : "Submitted "}
          {daysAgo(current.asOf)}
          <Box component="span" sx={{ color: t.granite, ml: 1 }}>
            · {formatDate(current.asOf)}
          </Box>
        </Typography>
      </Stack>

      {/* ─── Action row ───
          Mirrors article-detail's pattern: action buttons live above the
          body, not in a sticky bottom footer. Even in a flow, the user said
          they want decisions visible at the top so they can act without
          scrolling back. Same M3 hierarchy as article-detail: Skip on the
          left (low-emphasis utility action), constructive cluster on the
          right with Reject (text-destructive) → Needs info (text) →
          Approve & continue (filled). When Reject or Needs info is in
          progress, the row expands in-place with a note input — keeps the
          reviewer in keyboard context, no modal context-switch. */}
      <Box sx={{ mb: 4, pb: 3, borderBottom: `1px solid ${t.border}` }}>
        {current.kind === "draft" ? (
          <DraftActions
            pendingAction={pendingAction}
            processing={processing}
            note={note}
            setNote={setNote}
            onApprove={approveDraft}
            onSkip={skip}
            onStartReject={() => {
              setPendingAction("reject");
              setNote("");
            }}
            onStartNeedsInfo={() => {
              setPendingAction("needs-info");
              setNote("");
            }}
            onCancelPending={() => {
              setPendingAction(null);
              setNote("");
            }}
            onSubmitReject={submitReject}
            onSubmitNeedsInfo={submitNeedsInfo}
          />
        ) : (
          <PublishedActions
            article={rec?.published}
            processing={processing}
            onMarkReviewed={markPublishedReviewed}
            onOpenInLibrary={() => navigate(current.linkTo)}
            onSkip={skip}
          />
        )}
      </Box>

      {/* ─── Body — kind-specific ─── */}
      {loadingDetail || !rec ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress size={20} sx={{ color: t.slate }} />
        </Box>
      ) : rec.draft ? (
        <DraftBody
          draft={rec.draft}
          onApprove={approveDraft}
          processing={processing}
          onBodyChanged={(newBody) =>
            setLoaded((m) => ({
              ...m,
              [key]: { ...rec, draft: { ...rec.draft!, body: newBody } },
            }))
          }
        />
      ) : rec.published ? (
        <PublishedBody published={rec.published} />
      ) : null}

      {/* Sticky bottom footer removed — actions now live inline at the top
          of each item (above the body), so the reviewer can act without
          scrolling back. */}
    </Box>
  );
}

// ────────────────────────────────────────────────────────────
// Body renderers
// ────────────────────────────────────────────────────────────
function DraftBody({
  draft,
  onApprove,
  processing,
  onBodyChanged,
}: {
  draft: Article;
  onApprove: () => void;
  processing: boolean;
  onBodyChanged: (newBody: string) => void;
}) {
  return (
    <>
      <ApprovalChecklist
        results={draft.approvalResults}
        autoApproveCandidate={draft.autoApproveCandidate}
        onApprove={onApprove}
        approving={processing}
      />
      {/* Review queue defaults edit mode ON — reviewers are here specifically
          to take action on each article, so the Edit affordances and AI fix
          cards should be visible from the start (no extra toggle to find). */}
      <ArticleReviewFrame
        eyebrow="Article preview"
        helper="Review and edit the article in the same format employees will see."
        article={
          <EditableArticle
            articleId={draft.id}
            body={draft.body}
            market={draft.market}
            title={draft.title}
            lead={draft.lead}
            contentType={draft.contentType}
            canonicalSlug={draft.canonicalSlug}
            complianceIssues={draft.complianceIssues}
            editMode
            onUpdated={onBodyChanged}
          />
        }
        details={[
          {
            title: "Article details",
            rows: [
              { label: "Status", value: "In review" },
              { label: "Type", value: draft.contentType },
              { label: "Knowledge base", value: draft.knowledgeBase ?? "myPepsiCo KB" },
              { label: "Country", value: draft.countries?.join(", ") || draft.market },
              { label: "Owner", value: draft.owner ?? draft.submittedBy.name },
              { label: "Submitted", value: formatDate(draft.submittedAt) },
              { label: "Version", value: `Version ${draft.version ?? 1}` },
            ],
          },
        ]}
      />
    </>
  );
}

function PublishedBody({ published }: { published: PublishedArticle }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <>
      {/* Staleness banner — quick context on why this one's in the queue. */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          border: `1px solid ${t.ember}`,
          borderRadius: 1.5,
          bgcolor: "rgba(213, 110, 12, 0.08)",
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
          <HistoryToggleOffIcon sx={{ fontSize: 18, color: t.emberStrong }} />
          <Typography
            sx={{ fontSize: "0.875rem", fontWeight: 600, color: t.ink }}
          >
            {published.staleness.level === "stale"
              ? "Stale — review overdue"
              : published.staleness.level === "archived"
                ? "Archived"
                : "Aging — review soon"}
            {published.archivedAt && (
              <Box component="span" sx={{ color: t.slate, fontWeight: 400 }}>
                {" · out of rotation"}
              </Box>
            )}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Chip
            label={`Score ${published.staleness.score}/100`}
            size="small"
            sx={{
              bgcolor: t.paper,
              color: t.emberStrong,
              fontWeight: 600,
              fontSize: "0.6875rem",
              height: 22,
            }}
          />
        </Stack>
        <Stack spacing={0.25}>
          {published.staleness.reasons.map((r, i) => (
            <Typography
              key={i}
              sx={{ fontSize: "0.8125rem", color: t.slate, lineHeight: 1.45 }}
            >
              • {r}
            </Typography>
          ))}
        </Stack>
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: t.granite,
            mt: 1.25,
            lineHeight: 1.5,
          }}
        >
          Mark as reviewed to reset the cadence clock, or open in the library to
          set a lifecycle action (review & consolidate, convert, archive, or
          delete & redirect).
        </Typography>
      </Box>

      <ArticleReviewFrame
        eyebrow="Published article"
        helper="Review the article in the same format employees see."
        article={
          <ArticleDocument
            body={published.body}
            market={published.market}
            title={published.title}
            lead={published.lead}
            contentType={published.contentType}
            canonicalSlug={published.canonicalSlug}
            presentation="immersive"
            showMasthead={false}
          />
        }
        details={[
          {
            title: "Article details",
            rows: [
              { label: "Type", value: published.contentType },
              { label: "Knowledge base", value: published.knowledgeBase ?? "myPepsiCo KB" },
              { label: "Country", value: published.countries?.join(", ") || published.market },
              { label: "Owner", value: published.owner ?? published.originalSubmittedBy.name },
              { label: "Published", value: formatDate(published.publishedAt) },
              { label: "Version", value: `Version ${published.version}` },
            ],
          },
        ]}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Action panels
// ────────────────────────────────────────────────────────────
function DraftActions({
  pendingAction,
  processing,
  note,
  setNote,
  onApprove,
  onSkip,
  onStartReject,
  onStartNeedsInfo,
  onCancelPending,
  onSubmitReject,
  onSubmitNeedsInfo,
}: {
  pendingAction: PendingAction;
  processing: boolean;
  note: string;
  setNote: (s: string) => void;
  onApprove: () => void;
  onSkip: () => void;
  onStartReject: () => void;
  onStartNeedsInfo: () => void;
  onCancelPending: () => void;
  onSubmitReject: () => void;
  onSubmitNeedsInfo: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  /**
   * Idle state — M3 hierarchical action group, mirroring article-detail.
   *
   *   Skip (text, granite)         ← left, low-emphasis utility action
   *   Reject (text, error color)   ← destructive, separated by extra spacing
   *   Needs info (text)            ← tertiary
   *   Approve & continue (filled)  ← primary, happy path
   *
   * Reject lives just before the constructive cluster with extra margin so
   * it reads as a different intent class. Eye lands on the filled button
   * first; everything else recedes.
   */
  if (pendingAction === null) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
      >
        {/* Left — Skip, the only non-decision action. */}
        <Button
          size="small"
          onClick={onSkip}
          disabled={processing}
          startIcon={<SkipNextIcon sx={{ fontSize: 16 }} />}
          sx={{
            color: t.slate,
            textTransform: "none",
            "&:hover": { bgcolor: t.mist, color: t.ink },
          }}
        >
          Skip
        </Button>

        {/* Right — decision cluster. Destructive on the left of the cluster,
            separated from the constructive buttons by extra spacing. */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Button
            size="small"
            onClick={onStartReject}
            disabled={processing}
            sx={{
              color: t.errorInk,
              mr: 1.5,
              "&:hover": {
                bgcolor: alpha(t.errorInk, 0.06),
                color: t.errorInk,
              },
            }}
          >
            Reject
          </Button>
          <Button
            size="small"
            onClick={onStartNeedsInfo}
            disabled={processing}
          >
            Request Changes
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={onApprove}
            disabled={processing}
            startIcon={
              processing ? (
                <CircularProgress size={14} thickness={5} color="inherit" />
              ) : (
                <CheckIcon sx={{ fontSize: 16 }} />
              )
            }
          >
            {processing ? "Working" : "Approve & continue"}
          </Button>
        </Stack>
      </Stack>
    );
  }

  /**
   * Note-entry state — the action row collapses into an inline form so the
   * reviewer can describe the rejection / needs-info in keyboard context
   * (Enter submits, Esc cancels). Kept inline instead of using a Dialog
   * like article-detail does, because in a queue every modal context-switch
   * adds friction across N items. The visual treatment of the row above
   * stays consistent — same position, just different contents.
   */
  const isReject = pendingAction === "reject";
  return (
    <Stack direction="column" spacing={1.25}>
      <Typography
        sx={{
          fontSize: "0.75rem",
          color: t.slate,
          fontWeight: 500,
          letterSpacing: "0.02em",
        }}
      >
        {isReject
          ? "Reject this draft"
          : "Send back to the author for more info"}
      </Typography>
      <Stack direction="row" alignItems="flex-start" spacing={1.5}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          multiline
          minRows={1}
          maxRows={3}
          placeholder={
            isReject
              ? "Why are you rejecting this? The author will see this."
              : "What information do you need? The author will see this."
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              note.trim() &&
              !processing
            ) {
              e.preventDefault();
              isReject ? onSubmitReject() : onSubmitNeedsInfo();
            } else if (e.key === "Escape") {
              onCancelPending();
            }
          }}
        />
        <Button size="small" onClick={onCancelPending} disabled={processing}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          color={isReject ? "error" : "primary"}
          onClick={isReject ? onSubmitReject : onSubmitNeedsInfo}
          disabled={!note.trim() || processing}
          startIcon={
            processing ? (
              <CircularProgress size={14} thickness={5} color="inherit" />
            ) : undefined
          }
        >
          {isReject ? "Reject" : "Send to author"}
        </Button>
      </Stack>
    </Stack>
  );
}

/**
 * Published-item action row. Same shape as DraftActions but with a smaller
 * set of decisions appropriate to an already-live article:
 *
 *   Skip (text, granite)            ← left, low-emphasis utility action
 *   Open in library (text)          ← navigate-out, secondary
 *   Mark as reviewed (filled)       ← primary, the action that advances
 *
 * No destructive action — published articles aren't rejected from this
 * queue; they're managed via the Library detail page.
 */
function PublishedActions({
  article,
  processing,
  onMarkReviewed,
  onOpenInLibrary,
  onSkip,
}: {
  article: PublishedArticle | undefined;
  processing: boolean;
  onMarkReviewed: () => void;
  onOpenInLibrary: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
    >
      {/* Left — Skip, low-emphasis utility, parallel to DraftActions. */}
      <Button
        size="small"
        onClick={onSkip}
        disabled={processing}
        startIcon={<SkipNextIcon sx={{ fontSize: 16 }} />}
        sx={{
          color: t.slate,
          textTransform: "none",
          "&:hover": { bgcolor: t.mist, color: t.ink },
        }}
      >
        Skip
      </Button>

      {/* Right — Open-in-library (text, secondary navigation) then Mark
          as reviewed (filled, primary advance). */}
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Button
          size="small"
          onClick={onOpenInLibrary}
          startIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
        >
          Open in library
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={onMarkReviewed}
          disabled={processing || !article}
          startIcon={
            processing ? (
              <CircularProgress size={14} thickness={5} color="inherit" />
            ) : (
              <CheckIcon sx={{ fontSize: 16 }} />
            )
          }
        >
          {processing ? "Working" : "Mark as reviewed"}
        </Button>
      </Stack>
    </Stack>
  );
}

function ReasonPill({ reason, kind }: { reason: string; kind: "draft" | "published" }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const color =
    kind === "published"
      ? t.emberStrong
      : reason.startsWith("Ready to approve")
        ? t.successInk
        : reason.startsWith("Approved")
          ? t.successInk
          : t.emberStrong;
  const bg =
    kind === "published"
      ? "rgba(213, 110, 12, 0.10)"
      : reason.startsWith("Ready to approve") || reason.startsWith("Approved")
        ? t.successBg
        : "rgba(213, 110, 12, 0.10)";
  return (
    <Chip
      label={reason}
      size="small"
      sx={{
        bgcolor: bg,
        color,
        fontWeight: 600,
        fontSize: "0.6875rem",
        height: 22,
        maxWidth: 320,
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────
function DoneScreen({
  title,
  sub,
  onBack,
  skippedCount,
  onReviewSkipped,
}: {
  title: string;
  sub: string;
  onBack: () => void;
  skippedCount?: number;
  onReviewSkipped?: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box sx={{ maxWidth: 560, mx: "auto", textAlign: "center", py: 10 }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          bgcolor: t.successBg,
          color: t.successInk,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 3,
        }}
      >
        <CheckCircleOutlineIcon sx={{ fontSize: 32 }} />
      </Box>
      <Typography variant="h4" component="h1" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4, maxWidth: "48ch", mx: "auto" }}>
        {sub}
      </Typography>
      <Stack direction="row" spacing={1.5} justifyContent="center">
        {skippedCount && skippedCount > 0 && onReviewSkipped ? (
          <Button variant="outlined" onClick={onReviewSkipped}>
            Review {skippedCount} skipped
          </Button>
        ) : null}
        <Button variant="contained" onClick={onBack}>
          Back to attention
        </Button>
      </Stack>
    </Box>
  );
}
