import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  MenuItem,
  useTheme,
  alpha,
  InputBase,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HistoryIcon from "@mui/icons-material/History";
import ReplayIcon from "@mui/icons-material/Replay";
import { api, type Article, type ArticleSEO, type MarketProfile } from "../lib/api";
import { localeFor } from "../lib/market";
import { sectorShortLabel, sectorFullLabel } from "../lib/sector";
import ArticleDocument from "../components/article-document";
import EditableArticle from "../components/editable-article";
import ArticleReviewFrame from "../components/article-review-frame";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
// ArticleEditor was the old whole-article markdown/AI chat editor. Option A
// consolidated all editing under the page-level Edit toggle + per-section
// affordances, so the standalone editor is no longer reachable. File kept on
// disk in case we want it back for a future "rewrite whole article" feature.
import ApprovalChecklist from "../components/approval-checklist";
import { usePersonaMode } from "../lib/persona";
import { getPOCReviewMessage } from "../lib/poc-review-messages";
import { getViewingContentOwner, sectorsForContentOwner } from "../lib/content-owner-view";

const MARKET_ID_BY_NAME: Record<Article["market"], string | null> = {
  US: "us",
  MX: "mx",
  BR: "br",
  UK: "uk",
  IN: "in",
  Global: null,
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "long" });
}

function translationBody(value: NonNullable<Article["translations"]>[string] | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.body;
}

// Source articles do not yet persist a KB destination. Until the KB-access
// model is added, MyPepsiCo is the explicit prototype default rather than a
// hidden assumption in the review flow.
function knowledgeBaseLabel(article: Article): string {
  return article.knowledgeBase ?? "myPepsiCo KB";
}

const statusMeta: Record<
  Article["status"],
  { label: string; color: "warning" | "success" | "error" | "info"; icon: React.ReactNode }
> = {
  "needs-review": {
    label: "In Review",
    color: "warning",
    icon: <RateReviewOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  "needs-info": {
    label: "Changes Requested",
    color: "info",
    icon: <HelpOutlineIcon sx={{ fontSize: 13 }} />,
  },
  published: {
    label: "Published",
    color: "success",
    icon: <CheckOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  rejected: {
    label: "Rejected",
    color: "error",
    icon: <CloseOutlinedIcon sx={{ fontSize: 13 }} />,
  },
};

const SUBMISSION_STAGES = [
  "Create / Edit Article",
  "Submit for Review",
  "Under Review",
  "Published",
];

function SubmissionProgress({ currentStage }: { currentStage: number }) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  return (
    <Box sx={{ overflowX: "auto", pb: 0.5 }}>
      <Stack direction="row" alignItems="flex-start" sx={{ minWidth: 520 }}>
        {SUBMISSION_STAGES.map((stage, index) => {
          const isComplete = index < currentStage;
          const isCurrent = index === currentStage;
          const dotColor = isComplete ? t.successInk : isCurrent ? t.pepsiBlue : t.borderStrong;
          return (
            <Stack key={stage} direction="row" alignItems="flex-start" sx={{ flex: index === SUBMISSION_STAGES.length - 1 ? 0 : 1 }}>
              <Stack alignItems="center" spacing={0.75} sx={{ width: 86, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    bgcolor: dotColor,
                    color: t.paper,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    boxShadow: isCurrent ? `0 0 0 4px ${alpha(t.pepsiBlue, 0.16)}` : "none",
                  }}
                >
                  {isComplete ? "✓" : ""}
                </Box>
                <Typography
                  sx={{
                    fontSize: "0.6875rem",
                    lineHeight: 1.2,
                    color: isCurrent ? t.ink : t.slate,
                    fontWeight: isCurrent ? 700 : 500,
                    textAlign: "center",
                  }}
                >
                  {stage}
                </Typography>
              </Stack>
              {index < SUBMISSION_STAGES.length - 1 && (
                <Box
                  sx={{
                    height: 2,
                    flex: 1,
                    minWidth: 20,
                    mt: 1,
                    bgcolor: index < currentStage ? t.successInk : t.borderStrong,
                  }}
                />
              )}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [personaMode] = usePersonaMode();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoNote, setInfoNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  /** Page-level edit toggle. Off = clean reading view. On = every editable
   *  surface (sections, SEO, title) exposes its affordance + save bar shows. */
  const [editMode, setEditMode] = useState(false);
  /**
   * In-session undo stack. Every successful save snapshots the BEFORE state
   * here; the save bar's Undo button pops the most recent snapshot and
   * PATCHes it back to the server. Cleared on edit-mode exit.
   */
  const [undoStack, setUndoStack] = useState<Article[]>([]);
  /** Timestamp of last successful save in this edit session. Drives the
   *  "Saved 12s ago" label in the save bar. */
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [undoing, setUndoing] = useState(false);
  /**
   * Conversational agent: when the dock is in edit mode, the user can type
   * a free-form instruction (e.g. "make the intro more direct") and the
   * revision-instruction-agent rewrites the article body. The dock owns the
   * input field; this page owns the busy/error state because they bind to
   * the same article-level snapshot/undo pipeline as section edits and SEO
   * saves.
   */
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [historyOpenIdx, setHistoryOpenIdx] = useState<number | null>(null);
  const [marketProfile, setMarketProfile] = useState<MarketProfile | null>(null);
  // Currently displayed locale code. Defaults to the market's primary at load.
  const [viewLocale, setViewLocale] = useState<string | null>(null);
  // Cached translation bodies keyed by locale code.
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const a = await api.getArticle(id);
      setArticle(a);
      const marketId = MARKET_ID_BY_NAME[a.market];
      if (marketId) {
        api
          .getMarket(marketId)
          .then(setMarketProfile)
          .catch(() => setMarketProfile(null));
      } else {
        setMarketProfile(null);
      }
      // Default to the article's primary locale on first load
      setViewLocale((prev) =>
        prev ?? (marketId ? null /* set after profile loads */ : null),
      );
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Once the profile arrives, lock in the primary locale as the default view
  useEffect(() => {
    if (marketProfile && viewLocale === null) {
      setViewLocale(marketProfile.languageCode);
    }
  }, [marketProfile, viewLocale]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!article)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress size={24} sx={{ color: t.slate }} />
      </Box>
    );

  const meta = statusMeta[article.status];
  const isContentOwner = personaMode === "non-admin";
  const isOwnerReviewLocked = isContentOwner && article.status === "needs-review";
  const reviewContext = (article.approvalResults ?? [])
    .filter((result) => result.severity !== "ok")
    .slice(0, 2);
  const ownerProgress = {
    "needs-review": {
      stage: 2,
      message: "Your article is with the review team. Editing is paused until they request changes or move it forward.",
    },
    "needs-info": {
      stage: 0,
      message: "Changes have been requested. Review the feedback, update the article, and submit it again when it is ready.",
    },
    rejected: {
      stage: 0,
      message: "This submission was not approved. Review the feedback before deciding whether to revise and resubmit it.",
    },
    published: {
      stage: 4,
      message: `Your article is live in ${knowledgeBaseLabel(article)} and available to its intended audience.`,
    },
  }[article.status];
  const reviewMessage = getPOCReviewMessage(article.id);

  const submitReject = async () => {
    setBusy(true);
    try {
      setArticle(
        await api.reviewArticle(article.id, {
          status: "rejected",
          reviewer: "Demo Reviewer",
          rejectionReason: rejectReason,
        }),
      );
      setRejectOpen(false);
      setRejectReason("");
    } finally {
      setBusy(false);
    }
  };
  const resubmit = async () => {
    setBusy(true);
    try {
      setArticle(await api.resubmitArticle(article.id));
    } finally {
      setBusy(false);
    }
  };
  /**
   * Approve = publish, atomically. The server creates the PublishedArticle
   * and bumps the source article's status to "published" in one transaction.
   * We use the returned source article's `publishedArticleId` to route the
   * reviewer to the live entry.
   */
  const approveAndPublish = async () => {
    setBusy(true);
    try {
      const updated = await api.reviewArticle(article.id, {
        status: "approved",
        reviewer: "Demo Reviewer",
      });
      if (updated.publishedArticleId) {
        navigate(`/library/${updated.publishedArticleId}`);
      } else {
        // Defensive fallback — the source should always have the id set
        // after a successful approve, but if not, just refresh state.
        setArticle(updated);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setBusy(false);
    }
  };

  /**
   * Called by every editable child after a successful PATCH. We snapshot the
   * BEFORE state here so the save-bar's Undo button can revert one step at
   * a time. Also records the timestamp for the "Saved Ns ago" indicator.
   */
  const recordSave = (snapshotBeforeSave: Article) => {
    setUndoStack((s) => [...s, snapshotBeforeSave]);
    setLastSavedAt(Date.now());
  };

  /**
   * Conversational edit: send a free-form instruction to the
   * revision-instruction-agent, swap the returned body into the article,
   * snapshot the previous state so Undo can revert. Same pipeline used by
   * per-section edits — the agent operates on the whole body, but the
   * persistence + undo plumbing is identical.
   */
  const submitChat = async (instruction: string): Promise<void> => {
    const trimmed = instruction.trim();
    if (!article || !trimmed) return;
    setChatBusy(true);
    setChatError(null);
    try {
      const before = article;
      const { revisedBody } = await api.reviseArticle(article.id, {
        instruction: trimmed,
      });
      const updated = await api.updateArticle(article.id, {
        body: revisedBody,
      });
      setArticle(updated);
      recordSave(before);
    } catch (e: any) {
      setChatError(e?.message ?? String(e));
    } finally {
      setChatBusy(false);
    }
  };

  /**
   * Undo: pop the most recent BEFORE snapshot and PATCH it back. We send
   * body + title + seo so any of the three (or any combination) can be
   * reverted. Doesn't clear the stack on failure so the user can retry.
   */
  const undo = async () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoing(true);
    try {
      const reverted = await api.updateArticle(article.id, {
        body: previous.body,
        title: previous.title,
        seo: previous.seo,
      });
      setArticle(reverted);
      setUndoStack((s) => s.slice(0, -1));
      setLastSavedAt(Date.now());
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setUndoing(false);
    }
  };

  /**
   * Toggles edit mode. Entering: clean slate (no undo, fresh timestamp).
   * Exiting: clear the session stack — the changes are persisted so there's
   * no longer a meaningful in-session "before".
   */
  const toggleEditMode = () => {
    setEditMode((m) => {
      const next = !m;
      if (next) {
        setUndoStack([]);
        setLastSavedAt(null);
      } else {
        setUndoStack([]);
        setLastSavedAt(null);
      }
      return next;
    });
  };
  const submitNeedsInfo = async () => {
    setBusy(true);
    try {
      setArticle(
        await api.reviewArticle(article.id, {
          status: "needs-info",
          reviewer: "Demo Reviewer",
          note: infoNote,
        }),
      );
      setInfoOpen(false);
      setInfoNote("");
    } finally {
      setBusy(false);
    }
  };

  const primaryLocale = marketProfile?.languageCode;
  const availableLocales =
    marketProfile?.availableLanguages?.length
      ? marketProfile.availableLanguages
      : marketProfile
        ? [marketProfile.languageCode]
        : [];

  const handleSwitchLocale = async (next: string) => {
    setTranslateError(null);
    setViewLocale(next);
    if (next === primaryLocale) return; // showing the original

    if (translations[next]) return; // already loaded this session

    // Server may already have it cached on the article (pre-baked or prior fetch)
    const base = next.split("-")[0];
    const onArticle =
      translationBody(article.translations?.[next]) ??
      translationBody(article.translations?.[base]);
    if (onArticle) {
      setTranslations((m) => ({ ...m, [next]: onArticle }));
      return;
    }

    setTranslating(next);
    try {
      const result = await api.translateArticle(article.id, { target: next });
      setTranslations((m) => ({ ...m, [next]: result.body }));
    } catch (e: any) {
      setTranslateError(e?.message ?? String(e));
      setViewLocale(primaryLocale ?? next);
    } finally {
      setTranslating(null);
    }
  };

  const displayedBody =
    viewLocale && viewLocale !== primaryLocale
      ? (translations[viewLocale] ?? article.body)
      : article.body;

  const downloadPdf = async () => {
    if (!documentRef.current) return;
    setDownloading(true);
    try {
      // Lazy-load html2pdf so it doesn't bloat the initial bundle.
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `${article.id}-${slugify(article.title)}.pdf`;
      // The bundled types omit `pagebreak`; the library accepts it at runtime.
      const opts = {
        margin: [0.4, 0.4, 0.4, 0.4],
        filename,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#FFFFFF",
          scrollY: 0,
        },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      } as const;
      await html2pdf().from(documentRef.current).set(opts as any).save();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1520, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
        onClick={() => navigate("/")}
        sx={{ mb: 3, ml: -1 }}
      >
        {isContentOwner ? "My Articles" : "All Articles"}
      </Button>

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <Chip
          icon={meta.icon as React.ReactElement}
          label={meta.label}
          color={meta.color}
          size="small"
        />
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.granite,
          }}
        >
          {article.id}
        </Box>
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.slate,
          }}
        >
          {localeFor(article.market)}
        </Box>
        {article.sector && (
          <Box
            component="span"
            title={sectorFullLabel(article.sector)}
            sx={{
              fontFamily: theme.palette.fonts.mono,
              fontSize: "0.6875rem",
              color: t.slate,
            }}
          >
            {sectorShortLabel(article.sector)}
          </Box>
        )}
        <Typography variant="body2" sx={{ color: t.slate }}>
          {article.contentType}
        </Typography>
      </Stack>

      {/* ─────────── Title (alone on its own line) ─────────── */}
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        {article.title}
      </Typography>

      {/* ─────────── Meta strip ───────────
          Submitted-by / submitted / reviewed / countries. The bottom border
          previously closed out the header block; now it visually separates
          the meta from the action row that follows, so the actions read as
          a distinct decision row rather than spillover from the meta. */}
      <Stack
        direction="row"
        spacing={4}
        rowGap={2}
        flexWrap="wrap"
        sx={{ mb: 3, pb: 3, borderBottom: `1px solid ${t.border}` }}
      >
        {article.sector && (
          <Meta label="Sector" value={sectorFullLabel(article.sector)} />
        )}
        <Meta label="Content owner & author" value={article.submittedBy.name} />
        <Meta label="Knowledge base" value={knowledgeBaseLabel(article)} />
        <Meta label="Submitted" value={formatDate(article.submittedAt)} />
        {article.reviewedAt && (
          <Meta
            label="Reviewed"
            value={`${formatDate(article.reviewedAt)} · ${article.reviewer}`}
          />
        )}
        {article.countries && article.countries.length > 0 && (
          <Meta
            label="Countries"
            value={
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {article.countries.map((code) => (
                  <Chip
                    key={code}
                    label={code}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: "0.6875rem" }}
                  />
                ))}
              </Stack>
            }
          />
        )}
      </Stack>

      {isContentOwner && article.status !== "needs-info" && (
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              display: "block",
              color: t.ink,
              fontSize: "0.9375rem",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              mb: 1.5,
            }}
          >
            Article progress
          </Typography>
          <SubmissionProgress currentStage={ownerProgress.stage} />
          <Typography sx={{ mt: 1.5, fontSize: "0.875rem", color: t.slate, lineHeight: 1.5 }}>
            {ownerProgress.message}
          </Typography>
        </Box>
      )}

      {isOwnerReviewLocked && reviewContext.length > 0 && (
        <Box
          sx={{
            mb: 4,
            p: 2.25,
            borderRadius: 2,
            bgcolor: t.pepsiBlueSubtle,
            border: `1px solid ${alpha(t.pepsiBlue, 0.2)}`,
          }}
        >
          <Stack spacing={1}>
            <Typography sx={{ fontSize: "0.8125rem", color: t.ink, fontWeight: 700 }}>
              Review context
            </Typography>
            <Stack spacing={0.5}>
              {reviewContext.map((item) => (
                <Typography key={item.id} sx={{ fontSize: "0.8125rem", color: t.ink }}>
                  • {item.label}{item.reason ? ` — ${item.reason}` : ""}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Box>
      )}

      {/* ─────────── Action row ───────────
          Right-aligned decision cluster. The editing affordance lives in
          the persistent EditDock at the bottom of the viewport, not here,
          so this row stays focused on terminal decisions about the article
          (Reject / Needs info / Approve & publish / Resubmit / Open live).
          Renders only when there's at least one decision to make. */}
      {((!isContentOwner && article.status === "needs-review") ||
        (isContentOwner && article.status === "needs-info") ||
        article.status === "rejected" ||
        article.status === "published") && (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={0.5}
          sx={{ mb: 4 }}
        >
            {article.status === "needs-review" && (
              <>
                {/* Destructive — quiet text button in error color, separated
                    from the constructive cluster by a wider right margin so
                    it reads as a different intent class. */}
                <Button
                  size="small"
                  onClick={() => setRejectOpen(true)}
                  disabled={busy}
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

                {/* Constructive cluster: text → filled.
                    Approve & publish is one atomic action — the server
                    creates the PublishedArticle and bumps this source's
                    status to "published" in the same transaction. */}
                <Button
                  size="small"
                  onClick={() => setInfoOpen(true)}
                  disabled={busy}
                >
                  Request Changes
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={approveAndPublish}
                  disabled={busy}
                >
                  {busy ? "Publishing…" : "Approve & publish"}
                </Button>
              </>
            )}

            {article.status === "rejected" && (
              <Button
                size="small"
                variant="contained"
                startIcon={<ReplayIcon sx={{ fontSize: 16 }} />}
                onClick={resubmit}
                disabled={busy}
              >
                Resubmit for review
              </Button>
            )}

            {article.status === "needs-info" && isContentOwner && (
              <Button
                size="small"
                variant="contained"
                startIcon={<ReplayIcon sx={{ fontSize: 16 }} />}
                onClick={resubmit}
                disabled={busy}
              >
                Submit for Review
              </Button>
            )}

            {/* Source articles at status="published" are audit history —
                live content lives on the PublishedArticle. Link out so the
                reviewer can jump to the editable copy. */}
            {article.status === "published" && article.publishedArticleId && (
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate(`/library/${article.publishedArticleId}`)}
              >
                Open live article
              </Button>
            )}
        </Stack>
      )}

      {/* SEO block — editable. Edit toggles the panel into a form with all
          three fields (title, meta description, keywords). Saving PATCHes
          the article's `seo` field via api.updateArticle. */}
      {isContentOwner && article.status === "needs-info" ? (
        <ContentOwnerRevisionDetails
          article={article}
          onUpdated={(updated) => {
            const before = article;
            setArticle(updated);
            recordSave(before);
          }}
        />
      ) : article.seo && !isOwnerReviewLocked ? (
        <EditableSeoPanel
          key={`discovery-${editMode ? "editing" : "reading"}`}
          articleId={article.id}
          seo={article.seo}
          editMode={editMode}
          editableOnExpand={isContentOwner && article.status === "needs-info"}
          onUpdated={(nextSeo) => {
            const before = article;
            setArticle((a) => (a ? { ...a, seo: nextSeo } : a));
            recordSave(before);
          }}
        />
      ) : null}

      {/* Phase C — rules-engine status banner + collapsible pass/fail checklist.
          Renders nothing for articles created before Phase C (no approvalResults). */}
      {article.status === "needs-review" && !isContentOwner && (
        <ApprovalChecklist
          results={article.approvalResults}
          autoApproveCandidate={article.autoApproveCandidate}
          onApprove={approveAndPublish}
          approving={busy}
        />
      )}

      {article.rejectionReason && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Box component="span" sx={{ fontWeight: 600 }}>
            Rejected:{" "}
          </Box>
          {article.rejectionReason}
        </Alert>
      )}

      {article.rejections && article.rejections.length > 0 && (
        <Box
          sx={{
            mb: 3,
            borderRadius: 2,
            // M3 tinted container — same surface family as the SEO panel.
            bgcolor: t.surfaceContainerLow,
            p: 2.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <HistoryIcon sx={{ fontSize: 16, color: t.slate }} />
            <Typography
              variant="overline"
              sx={{ color: t.slate, letterSpacing: "0.08em" }}
            >
              Rejection history · {article.rejections.length} prior version
              {article.rejections.length === 1 ? "" : "s"}
            </Typography>
          </Stack>
          <Stack spacing={1.25}>
            {article.rejections.map((r, i) => {
              const isOpen = historyOpenIdx === i;
              return (
                <Box
                  key={`${r.at}-${i}`}
                  sx={{
                    // Inner item sits on pure paper inside the tinted parent —
                    // creates a 2-level surface hierarchy without strokes.
                    borderRadius: 1.5,
                    bgcolor: t.paper,
                    overflow: "hidden",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ px: 1.5, py: 1 }}
                  >
                    <Box
                      sx={{
                        fontFamily: theme.palette.fonts.mono,
                        fontSize: "0.6875rem",
                        color: t.granite,
                        bgcolor: t.mist,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 0.5,
                      }}
                    >
                      v{r.version}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontSize: "0.8125rem",
                          color: t.ink,
                          fontWeight: 500,
                          lineHeight: 1.4,
                        }}
                      >
                        {r.reason || "(no reason given)"}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.6875rem",
                          color: t.granite,
                          mt: 0.25,
                        }}
                      >
                        Rejected by {r.by} · {formatDate(r.at)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      sx={{ color: t.slate, flexShrink: 0 }}
                      onClick={() =>
                        setHistoryOpenIdx(isOpen ? null : i)
                      }
                    >
                      {isOpen ? "Hide snapshot" : "View snapshot"}
                    </Button>
                  </Stack>
                  {isOpen && (
                    <Box
                      sx={{
                        borderTop: `1px solid ${t.border}`,
                        bgcolor: t.surface,
                        p: 2,
                      }}
                    >
                      <ArticleDocument
                        body={r.body}
                        market={article.market}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}

      {article.status === "needs-info" && article.infoNeeded && (
        <Box
          sx={{
            mb: 3,
            p: 2.25,
            borderRadius: 2,
            bgcolor: t.pepsiBlueSubtle,
            border: `1px solid ${alpha(t.pepsiBlue, 0.2)}`,
          }}
        >
          <Stack spacing={1.25} alignItems="flex-start">
            <Box>
              <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: t.ink }}>
                {reviewMessage?.subject ?? "Changes requested"}
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: "0.75rem", color: t.granite }}>
                From {reviewMessage?.sender ?? article.reviewer ?? "your reviewer"}
              </Typography>
              <Typography sx={{ mt: 0.75, fontSize: "0.875rem", color: t.slate, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {reviewMessage?.body ?? article.infoNeeded}
              </Typography>
            </Box>
            <Button size="small" variant="outlined" onClick={() => navigate("/messages")}>
              View Message
            </Button>
          </Stack>
        </Box>
      )}



      {article.complianceIssues?.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="overline" sx={{ display: "block", mb: 1.5 }}>
            Compliance feedback
          </Typography>
          <Stack spacing={1}>
            {article.complianceIssues.map((iss, i) => (
              <Box
                key={i}
                sx={{
                  fontSize: "0.875rem",
                  color: t.slate,
                  pl: 1.5,
                  borderLeft: `2px solid ${
                    iss.severity === "error"
                      ? t.errorInk
                      : iss.severity === "warning"
                        ? t.ember
                        : t.border
                  }`,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontFamily: theme.palette.fonts.mono,
                    fontSize: "0.6875rem",
                    color:
                      iss.severity === "error"
                        ? t.errorInk
                        : iss.severity === "warning"
                          ? t.emberStrong
                          : t.slate,
                    mr: 1,
                  }}
                >
                  {iss.severity}/{iss.category}
                </Box>
                {iss.message}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {/* Phase 4 (Option A): one page-level edit toggle replaces the previous
          per-section hover-Edit + whole-article ArticleEditor combo. While off,
          page reads cleanly. While on, every editable surface (sections + SEO)
          exposes its affordance and a sticky save bar at the bottom of the
          viewport shows undo + done-editing controls. */}
      <>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          flexWrap="wrap"
          sx={{ maxWidth: 1040, mb: 1.5 }}
        >
          {availableLocales.length > 1 ? (
            <ToggleButtonGroup
              value={viewLocale ?? primaryLocale ?? ""}
              exclusive
              size="small"
              onChange={(_, v) => v && handleSwitchLocale(v)}
            >
              {availableLocales.map((code) => {
                const isPrimary = code === primaryLocale;
                const isLoading = translating === code;
                const pill = (
                  <ToggleButton
                    key={code}
                    value={code}
                    sx={{ px: 1.5, fontSize: "0.75rem" }}
                  >
                    {isLoading ? (
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <CircularProgress
                          size={11}
                          thickness={6}
                          color="inherit"
                        />
                        <span>{code}</span>
                      </Stack>
                    ) : (
                      code
                    )}
                  </ToggleButton>
                );
                return isPrimary ? (
                  pill
                ) : (
                  <Tooltip
                    key={code}
                    title="Translation provided for review. The primary language remains the source of truth."
                  >
                    {pill}
                  </Tooltip>
                );
              })}
            </ToggleButtonGroup>
          ) : (
            <Box />
          )}
          <Stack direction="row" spacing={0.5} alignItems="center">
            {/* Edit moved to the page-level action row under the title +
                meta strip. Download PDF stays here because it's contextually
                an "export this view" action tied to the current language. */}
            <Button size="small" onClick={downloadPdf} disabled={downloading}>
              {downloading ? "Generating…" : "Download PDF"}
            </Button>
          </Stack>
        </Stack>

          {translateError && (
            <Alert severity="warning" sx={{ maxWidth: 1040, mb: 1.5 }}>
              {translateError}
            </Alert>
          )}

        <Box ref={documentRef}>
          <ArticleReviewFrame
            eyebrow={article.status === "published" ? "Published article" : "Article preview"}
            helper="Review the article in the same format employees see."
            article={
              article.status !== "published" &&
              (!viewLocale || viewLocale === primaryLocale) ? (
                // EditableArticle owns the per-section UI. It honors `editMode`
                // — when off it reads as a clean document with no edit chrome;
                // when on, every section surfaces its Edit affordance. Compliance
                // badges + AI fix cards still show regardless (they're guided
                // actions, not edits the reviewer initiated themselves).
                <EditableArticle
                  articleId={article.id}
                  body={article.body}
                  market={article.market}
                  title={article.title}
                  lead={article.lead}
                  contentType={article.contentType}
                  canonicalSlug={article.canonicalSlug}
                  complianceIssues={article.complianceIssues}
                  editMode={editMode}
                  onUpdated={(newBody) => {
                    const before = article;
                    setArticle((a) => (a ? { ...a, body: newBody } : a));
                    recordSave(before);
                  }}
                />
              ) : (
                <ArticleDocument
                  body={displayedBody}
                  market={article.market}
                  title={article.title}
                  lead={article.lead}
                  contentType={article.contentType}
                  canonicalSlug={article.canonicalSlug}
                  presentation="immersive"
                  showMasthead={false}
                />
              )
            }
            details={[
              {
                title: "Article details",
                rows: [
                  { label: "Status", value: statusMeta[article.status].label },
                  { label: "Type", value: article.contentType },
                  { label: "Knowledge base", value: knowledgeBaseLabel(article) },
                  { label: "Country", value: article.countries?.join(", ") || article.market },
                  { label: "Owner", value: article.owner ?? article.submittedBy.name },
                  { label: "Submitted", value: formatDate(article.submittedAt) },
                  { label: "Version", value: `Version ${article.version ?? 1}` },
                ],
              },
              {
                title: "Available translations",
                rows: availableLocales.map((code) => ({
                  label: code === primaryLocale ? "Primary" : "Translation",
                  value: code,
                })),
              },
            ]}
          />
        </Box>
      </>

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reject article</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2, fontSize: "0.875rem" }}>
            Provide a brief reason. The author will see this.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="e.g. Missing regulatory references."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!rejectReason.trim() || busy}
            onClick={submitReject}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={infoOpen} onClose={() => setInfoOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request Changes</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2, fontSize: "0.875rem" }}>
            What's missing? The author will see this and can resubmit with the details.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            placeholder="e.g. Need the effective date and the approver for this policy."
            value={infoNote}
            onChange={(e) => setInfoNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)}>Cancel</Button>
          <Button
            color="primary"
            variant="contained"
            disabled={!infoNote.trim() || busy}
            onClick={submitNeedsInfo}
          >
            Request Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Persistent EditDock — visible at all times for any article that
          can still be edited (everything except finalized approved
          articles). Idle state is the editing entry point: shows the count
          of open AI-flagged suggestions and an "Edit article" / "Review &
          edit" CTA. Active state (editMode=true) shows the session controls
          (Editing label, Saved-ago, Undo, Done editing).

          Published articles are frozen at publish time on the source side,
          so we hide the dock entirely — edits on live content happen on
          the PublishedArticle copy via the Library detail page. */}
      {article.status !== "published" && !isOwnerReviewLocked && (
        <EditDock
          editMode={editMode}
          onEnterEdit={toggleEditMode}
          onDone={toggleEditMode}
          lastSavedAt={lastSavedAt}
          canUndo={undoStack.length > 0}
          undoing={undoing}
          onUndo={undo}
          suggestionCount={
            (article.complianceIssues ?? []).filter((i) => !i.dismissed).length
          }
          onChatSubmit={submitChat}
          chatBusy={chatBusy}
          chatError={chatError}
          onChatErrorDismiss={() => setChatError(null)}
        />
      )}
    </Box>
  );
}

/**
 * EditDock — persistent sticky bar at the bottom of the viewport that owns
 * the editing workflow end-to-end.
 *
 * Two visual states, same dock chrome (dark pill, soft shadow, centered):
 *
 *   IDLE (editMode = false)
 *   ─────────────────────────────────────────────────────────────
 *   When there are open AI-flagged suggestions, the dock leads with an
 *   ember count badge and reads as "N suggestions ready · Review & edit".
 *   When the article is clean, it quietly reads "Make changes · Edit".
 *   Either way, the CTA on the right is the single entry point into edit
 *   mode — replaces the old page-level Edit button entirely.
 *
 *   ACTIVE (editMode = true)
 *   ─────────────────────────────────────────────────────────────
 *   "Editing" status indicator, last-saved-ago, Undo, Done editing.
 *   Identical to the prior EditSaveBar so muscle memory carries over.
 */
function EditDock({
  editMode,
  onEnterEdit,
  onDone,
  lastSavedAt,
  canUndo,
  undoing,
  onUndo,
  suggestionCount,
  onChatSubmit,
  chatBusy,
  chatError,
  onChatErrorDismiss,
}: {
  editMode: boolean;
  onEnterEdit: () => void;
  onDone: () => void;
  lastSavedAt: number | null;
  canUndo: boolean;
  undoing: boolean;
  onUndo: () => void;
  suggestionCount: number;
  /** Send a free-form revision instruction to the article-level agent. */
  onChatSubmit: (instruction: string) => Promise<void>;
  chatBusy: boolean;
  chatError: string | null;
  onChatErrorDismiss: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  // Live-updating "Saved N seconds ago" string. Re-renders every 10s so the
  // label feels accurate without spinning a per-second timer.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!editMode) return;
    const id = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, [editMode]);
  // Suppress unused warning — `tick` is only read indirectly via Date.now() below.
  void tick;

  // Local chat input value. Lives inside the dock so the parent doesn't
  // have to re-render on every keystroke; on submit we hand the trimmed
  // value to the parent's onChatSubmit handler.
  const [chatValue, setChatValue] = useState("");
  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatValue.trim() || chatBusy) return;
    const value = chatValue;
    setChatValue(""); // optimistic clear — the field is ready for the next instruction
    try {
      await onChatSubmit(value);
    } catch {
      // Errors surface via chatError prop; restore the value so the user can retry/edit.
      setChatValue(value);
    }
  };

  // Idle dock keeps the pill shape; active dock grows into a rounded rect
  // to make room for the chat input row underneath the session controls.
  //
  // The dock is viewport-fixed. To keep it centered on the main content
  // column regardless of whether the collapsible sidebar is at its rail
  // width (72) or its expanded width (272), the left edge binds to the
  // live `--drawer-width` CSS variable set by AppLayout, plus the
  // matching content padding. Right edge mirrors the padding so
  // mx:"auto" + maxWidth:720 centers the dock inside that band.
  const baseSx = {
    position: "fixed" as const,
    bottom: { xs: 16, md: 24 },
    left: {
      xs: 24,
      md: "calc(var(--drawer-width, 272px) + 48px)",
      lg: "calc(var(--drawer-width, 272px) + 64px)",
    },
    right: { xs: 24, md: 48, lg: 64 },
    maxWidth: 720,
    mx: "auto",
    zIndex: 20,
    bgcolor: t.ink,
    color: t.paper,
    boxShadow:
      "0 4px 12px rgba(60,64,67,0.18), 0 1px 3px rgba(60,64,67,0.12)",
  };
  const idleSx = {
    ...baseSx,
    borderRadius: 999,
    px: 2,
    py: 1,
    display: "flex",
    alignItems: "center",
    gap: 1.5,
  };
  const activeSx = {
    ...baseSx,
    borderRadius: 3,
    px: 1.75,
    py: 1.25,
  };

  // ── IDLE — entry point into edit mode ──
  if (!editMode) {
    const hasSuggestions = suggestionCount > 0;
    return (
      <Box sx={idleSx}>
        {hasSuggestions ? (
          <>
            {/* Ember count badge — the only place ember appears in the
                idle dock. It carries the "this needs your attention" load
                so the rest of the bar stays calm. */}
            <Box
              sx={{
                minWidth: 22,
                height: 22,
                px: 0.75,
                borderRadius: 999,
                bgcolor: t.ember,
                color: t.paper,
                fontSize: "0.75rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {suggestionCount}
            </Box>
            <Typography
              sx={{ fontSize: "0.8125rem", fontWeight: 500, color: t.paper, flex: 1 }}
            >
              {suggestionCount === 1
                ? "1 suggestion ready"
                : `${suggestionCount} suggestions ready`}
            </Typography>
          </>
        ) : (
          <>
            {/* Quiet edit icon so the dock still reads as "editor entry
                point" without leaning on color when there's nothing to
                flag. */}
            <EditOutlinedIcon
              sx={{ fontSize: 16, color: "rgba(255,255,255,0.75)", flexShrink: 0 }}
            />
            <Typography
              sx={{ fontSize: "0.8125rem", fontWeight: 500, color: t.paper, flex: 1 }}
            >
              Make changes to this article
            </Typography>
          </>
        )}
        <Button
          size="small"
          variant="contained"
          onClick={onEnterEdit}
          sx={{
            bgcolor: t.paper,
            color: t.ink,
            fontSize: "0.75rem",
            "&:hover": { bgcolor: t.mist },
          }}
        >
          {hasSuggestions ? "Review & edit" : "Edit article"}
        </Button>
      </Box>
    );
  }

  // ── ACTIVE — editing controls + conversational agent input ──
  const savedLabel = lastSavedAt
    ? `Saved ${humanAgo(lastSavedAt)}`
    : "No changes yet";

  return (
    <Box sx={activeSx}>
      {/* Row 1 — session status + Undo/Done controls. */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ mb: 1 }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: t.ember,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{ fontSize: "0.8125rem", fontWeight: 500, color: t.paper }}
        >
          Editing
        </Typography>
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.7)",
            flex: 1,
          }}
        >
          {savedLabel}
        </Typography>
        <Button
          size="small"
          onClick={onUndo}
          disabled={!canUndo || undoing}
          sx={{
            color: t.paper,
            fontSize: "0.75rem",
            "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
            "&.Mui-disabled": { color: "rgba(255,255,255,0.35)" },
          }}
        >
          {undoing ? "Undoing…" : "Undo"}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={onDone}
          sx={{
            bgcolor: t.paper,
            color: t.ink,
            fontSize: "0.75rem",
            "&:hover": { bgcolor: t.mist },
          }}
        >
          Save edits
        </Button>
      </Stack>

      {/* Row 2 — conversational agent input. The user types a free-form
          instruction ("make the introduction more direct", "use bullet
          points in the steps section") and the agent rewrites the body.
          Same undo pipeline as section edits, so Undo above reverts the
          last agent revision too. */}
      <Box
        component="form"
        onSubmit={handleChatSubmit}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          bgcolor: "rgba(255,255,255,0.08)",
          borderRadius: 999,
          pl: 1.5,
          pr: 0.5,
          py: 0.25,
        }}
      >
        <AutoAwesomeOutlinedIcon
          sx={{
            fontSize: 16,
            color: "rgba(255,255,255,0.6)",
            flexShrink: 0,
          }}
        />
        <InputBase
          value={chatValue}
          onChange={(e) => setChatValue(e.target.value)}
          placeholder="Tell the agent what to change…"
          disabled={chatBusy}
          inputProps={{ "aria-label": "Agent edit instruction" }}
          sx={{
            flex: 1,
            color: t.paper,
            fontSize: "0.8125rem",
            "& input": { py: 0.5 },
            "& input::placeholder": {
              color: "rgba(255,255,255,0.5)",
              opacity: 1,
            },
          }}
        />
        {chatBusy && (
          <CircularProgress
            size={14}
            thickness={5}
            sx={{ color: "rgba(255,255,255,0.7)", mr: 0.5 }}
          />
        )}
        <Button
          type="submit"
          size="small"
          disabled={!chatValue.trim() || chatBusy}
          endIcon={
            !chatBusy ? <SendOutlinedIcon sx={{ fontSize: 14 }} /> : undefined
          }
          sx={{
            color: t.paper,
            fontSize: "0.75rem",
            minWidth: 60,
            "&:hover": { bgcolor: "rgba(255,255,255,0.10)" },
            "&.Mui-disabled": { color: "rgba(255,255,255,0.35)" },
          }}
        >
          {chatBusy ? "Working" : "Send"}
        </Button>
      </Box>

      {/* Inline error — dismissible. Sits under the input so the failing
          instruction stays in context for the user to revise. */}
      {chatError && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mt: 0.75, px: 1.5 }}
        >
          <Typography
            sx={{
              fontSize: "0.6875rem",
              color: "#ffb4ad",
              lineHeight: 1.4,
              flex: 1,
            }}
          >
            {chatError}
          </Typography>
          <Button
            size="small"
            onClick={onChatErrorDismiss}
            sx={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.6875rem",
              minWidth: 0,
              p: 0.5,
              "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
            }}
          >
            Dismiss
          </Button>
        </Stack>
      )}
    </Box>
  );
}

/** "12s ago" / "3m ago" style formatter. Coarse on purpose; not a real clock. */
function humanAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ display: "block", lineHeight: 1, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.9375rem" }}>{value}</Typography>
    </Box>
  );
}

function ContentOwnerRevisionDetails({ article, onUpdated }: { article: Article; onUpdated: (article: Article) => void }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(article.title);
  const [knowledgeBase, setKnowledgeBase] = useState(knowledgeBaseLabel(article));
  const [sector, setSector] = useState(article.sector ?? "");
  const [globalJustification, setGlobalJustification] = useState(article.globalJustification ?? "");
  const [countries, setCountries] = useState(article.countries.join(", "));
  const [metaDescription, setMetaDescription] = useState(article.seo.metaDescription);
  const [keywords, setKeywords] = useState(article.seo.keywords.join(", "));
  const [summary, setSummary] = useState(article.seo.summary ?? "");
  const [questions, setQuestions] = useState((article.seo.keyQuestions ?? []).join("\n"));
  const [entities, setEntities] = useState((article.seo.entities ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(article.title); setKnowledgeBase(knowledgeBaseLabel(article)); setSector(article.sector ?? ""); setGlobalJustification(article.globalJustification ?? ""); setCountries(article.countries.join(", "));
    setMetaDescription(article.seo.metaDescription); setKeywords(article.seo.keywords.join(", "));
    setSummary(article.seo.summary ?? ""); setQuestions((article.seo.keyQuestions ?? []).join("\n")); setEntities((article.seo.entities ?? []).join(", "));
  }, [article]);

  const split = (value: string, separator = ",") => value.split(separator).map((item) => item.trim()).filter(Boolean);
  const allowedSectors = sectorsForContentOwner(getViewingContentOwner());
  const canSave = Boolean(title.trim() && knowledgeBase && sector && split(countries).length) &&
    (sector !== "global" || globalJustification.trim().length >= 10);
  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      onUpdated(await api.updateArticle(article.id, {
        title: title.trim(), knowledgeBase: knowledgeBase as Article["knowledgeBase"], sector, globalJustification: sector === "global" ? globalJustification.trim() : undefined, countries: split(countries),
        seo: {
          title: title.trim(), metaDescription: metaDescription.trim(), keywords: split(keywords),
          summary: summary.trim() || undefined, keyQuestions: split(questions, "\n"), entities: split(entities),
        },
      }));
    } finally { setSaving(false); }
  };

  return (
    <Accordion expanded={expanded} onChange={(_, next) => setExpanded(next)} disableGutters elevation={0} sx={{ mb: 4, bgcolor: t.surfaceContainerLow, borderRadius: 2, "&:before": { display: "none" }, "&.Mui-expanded": { mb: 4 } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: t.slate }} />} sx={{ px: 2.5, minHeight: 60, "& .MuiAccordionSummary-content": { my: 1.5, alignItems: "center", justifyContent: "space-between" } }}>
        <Box>
          <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: t.ink }}>Article Details & Discovery</Typography>
          <Typography sx={{ mt: 0.25, fontSize: "0.75rem", color: t.granite }}>Publishing details, search metadata, and AI-readiness information</Typography>
        </Box>
        <Tooltip title="Editable details">
          <Box sx={{ color: t.pepsiBlueStrong, display: "flex", alignItems: "center" }}>
            <EditOutlinedIcon sx={{ fontSize: 18 }} />
          </Box>
        </Tooltip>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
        <Stack spacing={2.25}>
          <Typography variant="overline" sx={{ color: t.granite, letterSpacing: "0.08em", fontSize: "0.625rem", mb: -1 }}>Publishing details</Typography>
          <TextField required label="Article title" value={title} onChange={(event) => setTitle(event.target.value)} size="small" fullWidth helperText="This is also used as the search and AI discovery title." sx={{ "& .MuiFormLabel-asterisk": { color: "#C62828", fontSize: "1rem", fontWeight: 800 } }} />
          <TextField required select label="Knowledge base" value={knowledgeBase} onChange={(event) => setKnowledgeBase(event.target.value)} size="small" fullWidth helperText="Choose from the knowledge bases you are approved to publish into." sx={{ "& .MuiFormLabel-asterisk": { color: "#C62828", fontSize: "1rem", fontWeight: 800 } }}>
            <MenuItem value="myPepsiCo KB">myPepsiCo KB</MenuItem><MenuItem value="PFP KB">PFP KB</MenuItem><MenuItem value="PepKM KB">PepKM KB</MenuItem>
          </TextField>
          <TextField required label="Countries / regions" value={countries} onChange={(event) => setCountries(event.target.value)} size="small" fullWidth helperText="Use comma-separated country codes, for example: US, CA, MX." sx={{ "& .MuiFormLabel-asterisk": { color: "#C62828", fontSize: "1rem", fontWeight: 800 } }} />
          <TextField required select label="Sector" value={sector} onChange={(event) => setSector(event.target.value)} size="small" fullWidth helperText="Only sectors you are approved to publish into are shown." sx={{ "& .MuiFormLabel-asterisk": { color: "#C62828", fontSize: "1rem", fontWeight: 800 } }}>
            {allowedSectors.map((sectorId) => <MenuItem key={sectorId} value={sectorId}>{sectorFullLabel(sectorId)}</MenuItem>)}
          </TextField>
          {sector === "global" && (
            <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 1.5, p: 2, bgcolor: t.surface }}>
              <Typography sx={{ mb: 1.5, fontSize: "0.75rem", color: t.granite, lineHeight: 1.55 }}>
                Most articles should belong to a specific sector so the right country-specific agents draft locale-tuned versions. The Global sector is reserved for corporate content that applies identically across sectors and triggers an extra human review. Briefly explain why this content really is cross-sector.
              </Typography>
              <TextField
                required
                label="Why is this content cross-sector?"
                value={globalJustification}
                onChange={(event) => setGlobalJustification(event.target.value)}
                size="small"
                fullWidth
                multiline
                minRows={4}
                helperText={`${globalJustification.trim().length} / 10 minimum characters`}
                sx={{ "& .MuiFormLabel-asterisk": { color: "#C62828", fontSize: "1rem", fontWeight: 800 } }}
              />
            </Box>
          )}
          <Box sx={{ borderTop: `1px solid ${t.border}`, pt: 2.25 }}>
            <Typography variant="overline" sx={{ color: t.granite, letterSpacing: "0.08em", fontSize: "0.625rem" }}>Search & AI discovery</Typography>
          </Box>
          <TextField label="Meta description" value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} size="small" fullWidth multiline minRows={2} helperText={`${metaDescription.trim().length} / 160 characters · Aim for 140–160.`} />
          <TextField label="Keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} size="small" fullWidth helperText="Separate keywords with commas." />
          <TextField label="AI summary" value={summary} onChange={(event) => setSummary(event.target.value)} size="small" fullWidth multiline minRows={3} helperText="A factual summary that an AI assistant can use when answering questions." />
          <TextField label="Key questions answered" value={questions} onChange={(event) => setQuestions(event.target.value)} size="small" fullWidth multiline minRows={3} helperText="Add one natural-language question per line." />
          <TextField label="Entity anchors" value={entities} onChange={(event) => setEntities(event.target.value)} size="small" fullWidth helperText="Separate important people, systems, policies, or products with commas." />
          <Stack direction="row" justifyContent="flex-end"><Button size="small" variant="contained" onClick={save} disabled={saving || !canSave}>{saving ? "Saving…" : "Save Details"}</Button></Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

function PublishingDetailsPanel({ article, editMode, editableOnExpand = false, onUpdated }: { article: Article; editMode: boolean; editableOnExpand?: boolean; onUpdated: (article: Article) => void }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [title, setTitle] = useState(article.title);
  const [knowledgeBase, setKnowledgeBase] = useState(knowledgeBaseLabel(article));
  const [countries, setCountries] = useState(article.countries.join(", "));
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(editMode);
  const [sectionEditing, setSectionEditing] = useState(editMode);
  const isEditing = editMode || sectionEditing;

  useEffect(() => {
    if (editMode) {
      setExpanded(true);
      setSectionEditing(true);
    }
  }, [editMode]);

  useEffect(() => {
    setTitle(article.title);
    setKnowledgeBase(knowledgeBaseLabel(article));
    setCountries(article.countries.join(", "));
  }, [article]);

  const save = async () => {
    const nextCountries = countries.split(",").map((country) => country.trim().toUpperCase()).filter(Boolean);
    const changed = title.trim() !== article.title || knowledgeBase !== knowledgeBaseLabel(article) || nextCountries.join(",") !== article.countries.join(",");
    if (!changed) return;
    setSaving(true);
    try {
      onUpdated(await api.updateArticle(article.id, { title: title.trim(), knowledgeBase: knowledgeBase as Article["knowledgeBase"], countries: nextCountries }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Accordion expanded={expanded} onChange={(_, nextExpanded) => { setExpanded(nextExpanded); if (nextExpanded && editableOnExpand) setSectionEditing(true); }} disableGutters elevation={0} sx={{ mb: 4, bgcolor: t.surfaceContainerLow, borderRadius: 2, "&:before": { display: "none" }, "&.Mui-expanded": { mb: 4 } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: t.slate }} />} sx={{ px: 2.5, minHeight: 56, "& .MuiAccordionSummary-content": { my: 1.5, alignItems: "center", justifyContent: "space-between" } }}>
        <Box>
          <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: t.ink }}>Publishing Details</Typography>
          <Typography sx={{ mt: 0.25, fontSize: "0.75rem", color: t.granite }}>Knowledge base, locations, and article title</Typography>
        </Box>
        {!isEditing && <Typography sx={{ fontSize: "0.6875rem", color: t.granite, fontFamily: theme.palette.fonts.mono }}>{knowledgeBaseLabel(article)}</Typography>}
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
        {isEditing ? (
          <Stack spacing={2}>
            <TextField label="Article title" value={title} onChange={(event) => setTitle(event.target.value)} size="small" fullWidth />
            <TextField select label="Knowledge base" value={knowledgeBase} onChange={(event) => setKnowledgeBase(event.target.value)} size="small" fullWidth helperText="Choose from the knowledge bases you are approved to publish into.">
              <MenuItem value="myPepsiCo KB">myPepsiCo KB</MenuItem>
              <MenuItem value="PFP KB">PFP KB</MenuItem>
              <MenuItem value="PepKM KB">PepKM KB</MenuItem>
            </TextField>
            <TextField label="Countries / regions" value={countries} onChange={(event) => setCountries(event.target.value)} size="small" fullWidth helperText="Use comma-separated country codes, for example: US, CA, MX." />
            <Box>
              <Typography sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.25 }}>Sector</Typography>
              <Typography sx={{ fontSize: "0.8125rem", color: t.slate }}>{article.sector ? sectorFullLabel(article.sector) : "Not set"}</Typography>
              <Typography sx={{ mt: 0.25, fontSize: "0.6875rem", color: t.granite }}>Sector changes are managed by your Team Admin because they affect team-level publishing ownership.</Typography>
            </Box>
            <Stack direction="row" justifyContent="flex-end"><Button size="small" variant="contained" onClick={save} disabled={saving || !title.trim()}>{saving ? "Saving…" : "Save Publishing Details"}</Button></Stack>
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            <Meta label="Knowledge base" value={knowledgeBaseLabel(article)} />
            <Meta label="Countries / regions" value={article.countries.length ? article.countries.join(", ") : "Not set"} />
            <Meta label="Sector" value={article.sector ? sectorFullLabel(article.sector) : "Not set"} />
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

// ════════════════════════════════════════════════════════════
// EditableSeoPanel — read-mode card / inline form, no in-panel commit chrome
// ════════════════════════════════════════════════════════════
function EditableSeoPanel({
  articleId,
  seo,
  onUpdated,
  editMode = false,
  editableOnExpand = false,
}: {
  articleId: string;
  seo: ArticleSEO;
  /** Called with the persisted SEO after the server accepts the patch. */
  onUpdated: (next: ArticleSEO) => void;
  /**
   * Page-level edit mode. OFF → read mode (quiet card). ON → inline form.
   * No in-panel Edit / Save / Cancel buttons: the EditDock at the bottom
   * owns the editing lifecycle. Saves happen automatically when a field
   * blurs (title, meta description) or a chip is added/removed (keywords),
   * so the user never has to commit SEO changes explicitly.
   */
  editMode?: boolean;
  /** Content Owner revision mode: expanding this section reveals editable fields. */
  editableOnExpand?: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [draftTitle, setDraftTitle] = useState(seo.title);
  const [draftMeta, setDraftMeta] = useState(seo.metaDescription);
  const [draftKeywords, setDraftKeywords] = useState<string[]>(seo.keywords);
  const [keywordInput, setKeywordInput] = useState("");
  // GEO drafts. All optional on the persisted SEO; default to empty so
  // older articles read cleanly without a migration.
  const [draftSummary, setDraftSummary] = useState(seo.summary ?? "");
  const [draftQuestions, setDraftQuestions] = useState<string[]>(
    seo.keyQuestions ?? [],
  );
  const [questionInput, setQuestionInput] = useState("");
  const [draftEntities, setDraftEntities] = useState<string[]>(
    seo.entities ?? [],
  );
  const [entityInput, setEntityInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(editMode);
  const [sectionEditing, setSectionEditing] = useState(editMode);
  const isEditing = editMode || sectionEditing;
  const [error, setError] = useState<string | null>(null);

  // When entering edit mode, refresh drafts from the persisted SEO so the
  // form opens against the current truth (in case Undo or a body-revision
  // changed things while the panel was in read mode).
  useEffect(() => {
    if (editMode) {
      setDraftTitle(seo.title);
      setDraftMeta(seo.metaDescription);
      setDraftKeywords(seo.keywords);
      setKeywordInput("");
      setDraftSummary(seo.summary ?? "");
      setDraftQuestions(seo.keyQuestions ?? []);
      setQuestionInput("");
      setDraftEntities(seo.entities ?? []);
      setEntityInput("");
      setError(null);
      setExpanded(true);
      setSectionEditing(true);
    }
    // We intentionally drive this off editMode only — the SEO prop changing
    // mid-edit is handled by the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  // Sync drafts whenever the parent's seo prop changes (e.g. after Undo or
  // an agent-driven revision). Skip while we're actively editing so we
  // don't trample the user's input mid-typing.
  useEffect(() => {
    if (isEditing) return;
    setDraftTitle(seo.title);
    setDraftMeta(seo.metaDescription);
    setDraftKeywords(seo.keywords);
    setDraftSummary(seo.summary ?? "");
    setDraftQuestions(seo.keyQuestions ?? []);
    setDraftEntities(seo.entities ?? []);
  }, [seo, isEditing]);


  const hasAnyValue =
    seo.title ||
    seo.metaDescription ||
    seo.keywords.length > 0 ||
    (seo.summary ?? "").length > 0 ||
    (seo.keyQuestions ?? []).length > 0 ||
    (seo.entities ?? []).length > 0;

  /**
   * Commit the current draft to the server IF it differs from the persisted
   * seo prop. Idempotent and silent on no-op so we can call it freely from
   * every blur / chip-change handler. Compares all six fields (the three
   * SEO + three GEO).
   */
  const commitIfChanged = async (override?: Partial<ArticleSEO>) => {
    const candidate: ArticleSEO = {
      title: (override?.title ?? draftTitle).trim(),
      metaDescription: (override?.metaDescription ?? draftMeta).trim(),
      keywords: override?.keywords ?? draftKeywords,
      summary: (override?.summary ?? draftSummary).trim() || undefined,
      keyQuestions: override?.keyQuestions ?? draftQuestions,
      entities: override?.entities ?? draftEntities,
    };
    const arraysEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((x, i) => x === b[i]);
    const unchanged =
      candidate.title === (seo.title ?? "").trim() &&
      candidate.metaDescription === (seo.metaDescription ?? "").trim() &&
      arraysEqual(candidate.keywords, seo.keywords) &&
      (candidate.summary ?? "") === (seo.summary ?? "").trim() &&
      arraysEqual(candidate.keyQuestions ?? [], seo.keyQuestions ?? []) &&
      arraysEqual(candidate.entities ?? [], seo.entities ?? []);
    if (unchanged) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateArticle(articleId, { seo: candidate });
      onUpdated(updated.seo);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    const k = keywordInput.trim();
    if (!k) return;
    if (draftKeywords.includes(k)) {
      setKeywordInput("");
      return;
    }
    const next = [...draftKeywords, k];
    setDraftKeywords(next);
    setKeywordInput("");
    // Commit immediately on chip add — no blur event to ride on.
    void commitIfChanged({ keywords: next });
  };
  const removeKeyword = (k: string) => {
    const next = draftKeywords.filter((x) => x !== k);
    setDraftKeywords(next);
    void commitIfChanged({ keywords: next });
  };
  // Mirror addKeyword/removeKeyword for the two new array fields. Same
  // commit-on-change pattern: no Save button, no in-panel ceremony.
  const addQuestion = () => {
    const q = questionInput.trim();
    if (!q) return;
    if (draftQuestions.includes(q)) {
      setQuestionInput("");
      return;
    }
    const next = [...draftQuestions, q];
    setDraftQuestions(next);
    setQuestionInput("");
    void commitIfChanged({ keyQuestions: next });
  };
  const removeQuestion = (q: string) => {
    const next = draftQuestions.filter((x) => x !== q);
    setDraftQuestions(next);
    void commitIfChanged({ keyQuestions: next });
  };
  const addEntity = () => {
    const e = entityInput.trim();
    if (!e) return;
    if (draftEntities.includes(e)) {
      setEntityInput("");
      return;
    }
    const next = [...draftEntities, e];
    setDraftEntities(next);
    setEntityInput("");
    void commitIfChanged({ entities: next });
  };
  const removeEntity = (e: string) => {
    const next = draftEntities.filter((x) => x !== e);
    setDraftEntities(next);
    void commitIfChanged({ entities: next });
  };

  // Live char counts that mirror new-request's hints.
  const titleLen = draftTitle.trim().length;
  const metaLen = draftMeta.trim().length;
  const titleStatus: "empty" | "short" | "good" | "long" =
    titleLen === 0
      ? "empty"
      : titleLen < 30
        ? "short"
        : titleLen > 60
          ? "long"
          : "good";
  const metaStatus: "empty" | "short" | "good" | "long" =
    metaLen === 0
      ? "empty"
      : metaLen < 140
        ? "short"
        : metaLen > 160
          ? "long"
          : "good";

  // Filled-field count for the collapsed accordion summary. Gives the user
  // a "5 / 6 fields filled" glance without having to expand.
  const filledFields = [
    seo.title.trim(),
    seo.metaDescription.trim(),
    seo.keywords.length > 0 ? "x" : "",
    (seo.summary ?? "").trim(),
    (seo.keyQuestions ?? []).length > 0 ? "x" : "",
    (seo.entities ?? []).length > 0 ? "x" : "",
  ].filter(Boolean).length;
  const TOTAL_FIELDS = 6;

  return (
    <Accordion
      // Default closed — the panel was taking too much vertical space when
      // always expanded. Auth and review flows don't need to see search/GEO
      // unless the user is intentionally inspecting it.
      expanded={expanded}
      onChange={(_, nextExpanded) => {
        setExpanded(nextExpanded);
        if (nextExpanded && editableOnExpand) setSectionEditing(true);
      }}
      disableGutters
      elevation={0}
      sx={{
        mb: 4,
        bgcolor: t.surfaceContainerLow,
        borderRadius: 2,
        // MUI's default Accordion has a top border before the first item
        // and `before` pseudo line — kill both since we own the surface.
        "&:before": { display: "none" },
        "&.Mui-expanded": { mb: 4 },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: t.slate }} />}
        sx={{
          px: 2.5,
          minHeight: 56,
          "& .MuiAccordionSummary-content": {
            my: 1.5,
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{ display: "block", color: t.slate, letterSpacing: "0.08em" }}
        >
          Search & AI discovery
        </Typography>
        <Stack direction="row" spacing={1.25} alignItems="center">
          {saving && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <CircularProgress size={11} thickness={6} sx={{ color: t.slate }} />
              <Typography
                sx={{
                  fontSize: "0.6875rem",
                  color: t.slate,
                  letterSpacing: "0.04em",
                }}
              >
                Saving…
              </Typography>
            </Stack>
          )}
          {/* Filled-count chip. Reads like "5 / 6 fields" at a glance —
              tells the user the agent has done its work without forcing
              them to expand. */}
          <Box
            sx={{
              fontSize: "0.6875rem",
              color: t.granite,
              fontFamily: theme.palette.fonts.mono,
              letterSpacing: "0.02em",
            }}
          >
            {filledFields} / {TOTAL_FIELDS} fields
          </Box>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Read-mode body — quiet, paragraph-style. Splits into two visual
          subsections (Search · AI discovery) only when AT LEAST one GEO
          field has content; otherwise the SEO trio reads as a flat list
          to avoid the noise of an empty "AI discovery" subhead. */}
      {!isEditing && hasAnyValue && (
        <Stack spacing={2}>
          {/* ── Search subsection ── */}
          {(seo.title || seo.metaDescription || seo.keywords.length > 0) && (
            <Stack spacing={1.25}>
              {seo.metaDescription && (
                <Box>
                  <Typography sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.25 }}>
                    Meta description
                  </Typography>
                  <Typography sx={{ fontSize: "0.8125rem", color: t.slate, lineHeight: 1.5 }}>
                    {seo.metaDescription}
                  </Typography>
                </Box>
              )}
              {seo.keywords.length > 0 && (
                <Box>
                  <Typography sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.5 }}>
                    Keywords
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {seo.keywords.map((k) => (
                      <Chip
                        key={k}
                        label={k}
                        size="small"
                        sx={{ height: 22, fontSize: "0.6875rem" }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}

          {/* ── AI discovery subsection ── */}
          {(seo.summary ||
            (seo.keyQuestions?.length ?? 0) > 0 ||
            (seo.entities?.length ?? 0) > 0) && (
            <Box
              sx={{
                pt: 2,
                borderTop: `1px solid ${t.border}`,
              }}
            >
              <Typography
                variant="overline"
                sx={{
                  display: "block",
                  color: t.granite,
                  letterSpacing: "0.08em",
                  fontSize: "0.625rem",
                  mb: 1.25,
                }}
              >
                AI discovery
              </Typography>
              <Stack spacing={1.25}>
                {seo.summary && (
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.25 }}
                    >
                      Quotable summary
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "0.8125rem",
                        color: t.slate,
                        lineHeight: 1.5,
                      }}
                    >
                      {seo.summary}
                    </Typography>
                  </Box>
                )}
                {(seo.keyQuestions?.length ?? 0) > 0 && (
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.5 }}
                    >
                      Key questions answered
                    </Typography>
                    <Stack spacing={0.5}>
                      {seo.keyQuestions!.map((q) => (
                        <Typography
                          key={q}
                          sx={{
                            fontSize: "0.8125rem",
                            color: t.ink,
                            lineHeight: 1.4,
                            pl: 1.25,
                            position: "relative",
                            "&::before": {
                              content: '"\\2022"',
                              position: "absolute",
                              left: 0,
                              color: t.granite,
                            },
                          }}
                        >
                          {q}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
                {(seo.entities?.length ?? 0) > 0 && (
                  <Box>
                    <Typography
                      sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.5 }}
                    >
                      Entity anchors
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {seo.entities!.map((e) => (
                        <Chip
                          key={e}
                          label={e}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: "0.6875rem" }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
      {!isEditing && !hasAnyValue && (
        <Typography sx={{ fontSize: "0.8125rem", color: t.granite }}>
          No search or AI-discovery metadata yet. Turn on edit mode to add a
          title, meta description, keywords, a quotable summary, key
          questions, and entity anchors.
        </Typography>
      )}

      {/* Edit-mode form — Search (title/meta/keywords) on top, AI discovery
          (summary/key questions/entities) below. All fields auto-save on
          blur; arrays save on chip add/remove. No in-panel Save button —
          the EditDock at the bottom owns the session. */}
      {isEditing && (
        <Stack spacing={2.5}>
          {/* ── Search ── */}
          <Typography
            variant="overline"
            sx={{
              color: t.granite,
              letterSpacing: "0.08em",
              fontSize: "0.625rem",
              mb: -1,
            }}
          >
            Search
          </Typography>
          <TextField label="SEO title" fullWidth size="small" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} onBlur={() => commitIfChanged()} />
          <TextField
            label="Meta description"
            fullWidth
            size="small"
            multiline
            minRows={2}
            value={draftMeta}
            onChange={(e) => setDraftMeta(e.target.value)}
            onBlur={() => commitIfChanged()}
            helperText={
              <Box
                component="span"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.6875rem",
                }}
              >
                <Box
                  component="span"
                  sx={{
                    color:
                      metaStatus === "good"
                        ? t.successInk
                        : metaStatus === "empty"
                          ? t.granite
                          : t.errorInk,
                  }}
                >
                  {metaStatus === "empty" && "Aim for 140–160 characters"}
                  {metaStatus === "short" && "Add a bit more detail (140+)"}
                  {metaStatus === "good" && "Looks good"}
                  {metaStatus === "long" && "Trim to 160 or fewer"}
                </Box>
                <Box component="span" sx={{ color: t.granite }}>
                  {metaLen} / 160
                </Box>
              </Box>
            }
          />
          <Box>
            <TextField
              label="Keywords"
              fullWidth
              size="small"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="Type a keyword and press Enter…"
              helperText="Terms people search to find this article."
            />
            {draftKeywords.length > 0 && (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ mt: 1.25, flexWrap: "wrap" }}
                useFlexGap
              >
                {draftKeywords.map((k) => (
                  <Chip
                    key={k}
                    label={k}
                    size="small"
                    onDelete={() => removeKeyword(k)}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {/* ── AI discovery ──
              Visual divider + subhead so the form reads as two coherent
              concerns (search vs LLM retrieval) inside one panel + one
              save flow. Same auto-save mechanics as the SEO fields. */}
          <Box
            sx={{
              pt: 2,
              borderTop: `1px solid ${t.border}`,
            }}
          >
            <Stack
              direction="row"
              alignItems="baseline"
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <Typography
                variant="overline"
                sx={{
                  color: t.granite,
                  letterSpacing: "0.08em",
                  fontSize: "0.625rem",
                }}
              >
                AI discovery
              </Typography>
              <Typography
                sx={{ fontSize: "0.6875rem", color: t.granite }}
              >
                For RAG and enterprise copilots
              </Typography>
            </Stack>
            <Stack spacing={2.5}>
              <TextField
                label="Quotable summary"
                fullWidth
                size="small"
                multiline
                minRows={2}
                maxRows={4}
                value={draftSummary}
                onChange={(e) => setDraftSummary(e.target.value)}
                onBlur={() => commitIfChanged()}
                placeholder="2-3 factual sentences a RAG system can lift verbatim and cite."
                helperText={
                  <Box
                    component="span"
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.6875rem",
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        color:
                          draftSummary.trim().length === 0
                            ? t.granite
                            : draftSummary.trim().length < 200
                              ? t.granite
                              : draftSummary.trim().length > 400
                                ? t.errorInk
                                : t.successInk,
                      }}
                    >
                      {draftSummary.trim().length === 0 &&
                        "Aim for 200–400 characters of factual extract"}
                      {draftSummary.trim().length > 0 &&
                        draftSummary.trim().length < 200 &&
                        "A little short — aim for 200+"}
                      {draftSummary.trim().length >= 200 &&
                        draftSummary.trim().length <= 400 &&
                        "Looks good"}
                      {draftSummary.trim().length > 400 &&
                        "Trim to 400 or fewer"}
                    </Box>
                    <Box component="span" sx={{ color: t.granite }}>
                      {draftSummary.trim().length} / 400
                    </Box>
                  </Box>
                }
              />
              <Box>
                <TextField
                  label="Key questions answered"
                  fullWidth
                  size="small"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addQuestion();
                    }
                  }}
                  placeholder="Type a question and press Enter… (e.g. How long is maternity leave?)"
                  helperText="Natural-language questions this article answers. Each adds a retrievable Q&A anchor for LLMs."
                />
                {draftQuestions.length > 0 && (
                  <Stack
                    spacing={0.75}
                    sx={{ mt: 1.25 }}
                  >
                    {draftQuestions.map((q) => (
                      <Chip
                        key={q}
                        label={q}
                        size="small"
                        onDelete={() => removeQuestion(q)}
                        sx={{
                          height: "auto",
                          py: 0.5,
                          alignSelf: "flex-start",
                          maxWidth: "100%",
                          "& .MuiChip-label": {
                            whiteSpace: "normal",
                            lineHeight: 1.4,
                          },
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
              <Box>
                <TextField
                  label="Entity anchors"
                  fullWidth
                  size="small"
                  value={entityInput}
                  onChange={(e) => setEntityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEntity();
                    }
                  }}
                  placeholder="Type an entity and press Enter… (e.g. Workday Leave Portal)"
                  helperText="Named programs, policies, systems, or products the article authoritatively covers."
                />
                {draftEntities.length > 0 && (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ mt: 1.25, flexWrap: "wrap" }}
                    useFlexGap
                  >
                    {draftEntities.map((e) => (
                      <Chip
                        key={e}
                        label={e}
                        size="small"
                        variant="outlined"
                        onDelete={() => removeEntity(e)}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>
        </Stack>
      )}
      </AccordionDetails>
    </Accordion>
  );
}
