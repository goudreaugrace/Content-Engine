import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import HistoryIcon from "@mui/icons-material/History";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import LinkIcon from "@mui/icons-material/Link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  api,
  type PublishedArticle,
  type PublishedRecommendation,
  type PublishedSimilarMatch,
} from "../lib/api";
import { localeFor } from "../lib/market";
import { sectorShortLabel, sectorFullLabel } from "../lib/sector";
import ArticleDocument from "../components/article-document";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysAgo(iso: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "today";
  if (diff === 1) return "1d ago";
  if (diff < 30) return `${diff}d ago`;
  if (diff < 365) return `${Math.round(diff / 30)}mo ago`;
  return `${Math.round(diff / 365)}y ago`;
}

export default function PublishedArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [article, setArticle] = useState<PublishedArticle | null>(null);
  const [library, setLibrary] = useState<PublishedArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [a, lib] = await Promise.all([
        api.getPublishedArticle(id),
        api.listPublishedArticles(),
      ]);
      setArticle(a);
      setLibrary(lib);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!article)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress size={24} sx={{ color: t.slate }} />
      </Box>
    );

  /**
   * Archive / unarchive toggle. Replaces the prior 4-button lifecycle
   * decision matrix (review-and-consolidate / convert / archive /
   * delete-and-redirect). In practice only "archive" was being used, so
   * the concept collapsed to a single toggle. The article moves to the
   * "archived" staleness level on success.
   */
  const toggleArchive = async () => {
    setBusy(true);
    try {
      setArticle(
        await api.setPublishedArchived(article.id, {
          archived: !article.archivedAt,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const markReviewed = async () => {
    setBusy(true);
    try {
      setArticle(await api.markPublishedReviewed(article.id, {}));
    } finally {
      setBusy(false);
    }
  };

  /**
   * Applies the server-provided recommendation. Dispatches to the right
   * mutation based on the `apply.kind` discriminator.
   */
  const applyRecommendation = async () => {
    if (!article.recommendation) return;
    const op = article.recommendation.apply;
    if (op.kind === "noop") return;
    if (op.kind === "mark-reviewed") return markReviewed();
    if (op.kind === "archive") {
      setBusy(true);
      try {
        setArticle(
          await api.setPublishedArchived(article.id, { archived: true }),
        );
      } finally {
        setBusy(false);
      }
    }
  };

  const stalenessConfig = {
    fresh: { label: "Fresh", color: t.successInk, bg: t.successBg },
    aging: { label: "Aging", color: t.ember, bg: "rgba(213, 110, 12, 0.10)" },
    stale: { label: "Stale", color: t.errorInk, bg: "rgba(217, 48, 37, 0.10)" },
    archived: { label: "Archived", color: t.slate, bg: t.mist },
  }[article.staleness.level];

  const otherArticles = library.filter((a) => a.id !== article.id);

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
        onClick={() => navigate("/?tab=published")}
        sx={{ mb: 3, ml: -1 }}
      >
        Published
      </Button>

      {/* ─── Header ─── */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
        <Chip
          label="Published"
          size="small"
          sx={{ bgcolor: t.successBg, color: t.successInk, fontWeight: 600 }}
        />
        <Chip
          label={stalenessConfig.label}
          size="small"
          sx={{
            bgcolor: stalenessConfig.bg,
            color: stalenessConfig.color,
            fontWeight: 600,
          }}
        />
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.granite,
          }}
        >
          {article.id} · v{article.version}
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

      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        {article.title}
      </Typography>

      {/* ─── Metrics + staleness card ─── */}
      <Box
        sx={{
          mb: 4,
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
        }}
      >
        {/* Engagement panel — neutral, lives on a tinted surface. */}
        <Box
          sx={{
            borderRadius: 2,
            p: 2.5,
            bgcolor: t.surfaceContainerLow,
          }}
        >
          <Typography variant="overline" sx={{ color: t.slate, mb: 1.5, display: "block" }}>
            Engagement
          </Typography>
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            <Stat label="Views (30d)" value={article.metrics.views30d.toLocaleString()}>
              <TrendIcon trend={article.metrics.trend} />
            </Stat>
            <Stat label="All-time views" value={article.metrics.viewsAllTime.toLocaleString()} />
            {article.metrics.lastViewedAt && (
              <Stat label="Last viewed" value={daysAgo(article.metrics.lastViewedAt)} />
            )}
          </Stack>
        </Box>
        {/* Staleness panel — keeps its colored stroke. The border carries
            semantic meaning (severity of the staleness state), so the M3
            outlined-error/warning container pattern applies. */}
        <Box
          sx={{
            border: `1px solid ${stalenessConfig.color}`,
            borderRadius: 2,
            p: 2.5,
            bgcolor: stalenessConfig.bg,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
            <Typography
              variant="overline"
              sx={{ color: stalenessConfig.color, fontWeight: 600 }}
            >
              {stalenessConfig.label} · {article.staleness.score}/100
            </Typography>
          </Stack>
          <Stack spacing={0.5}>
            {article.staleness.reasons.map((r, i) => (
              <Typography
                key={i}
                sx={{ fontSize: "0.8125rem", color: t.ink, lineHeight: 1.45 }}
              >
                • {r}
              </Typography>
            ))}
          </Stack>
          {/* Phase P3.2 — fast-path "still accurate" action right on the
              staleness panel. The recommendation card below offers the same
              underlying mark-reviewed call, but reviewers shouldn't have to
              scroll past the panel to find the action it's prompting them to
              take. Only renders for aging/stale (no point on fresh). */}
          {article.staleness.level !== "fresh" && (
            <Box sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant="contained"
                onClick={markReviewed}
                disabled={busy}
                startIcon={
                  busy ? (
                    <CircularProgress size={12} color="inherit" />
                  ) : undefined
                }
                sx={{
                  bgcolor: stalenessConfig.color,
                  color: t.paper,
                  "&:hover": { bgcolor: stalenessConfig.color, opacity: 0.9 },
                }}
              >
                Mark still accurate
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {/* ─── Recommendation card ─── */}
      {/* Server-side rule picks one suggested next action based on staleness +
          metrics + similar-article matches. Severity drives the color, and the
          "Apply" button dispatches to the right mutation (mark reviewed, set
          lifecycle, etc.). For "noop" recommendations the button is hidden. */}
      {article.recommendation && (
        <RecommendationCard
          recommendation={article.recommendation}
          busy={busy}
          onApply={applyRecommendation}
          onOpenSimilar={(id) => navigate(`/library/${id}`)}
        />
      )}

      {/* ─── Submission history block ─── */}
      <Box
        sx={{
          mb: 4,
          p: 2.5,
          borderRadius: 2,
          bgcolor: t.surfaceContainerLow,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <HistoryIcon sx={{ fontSize: 16, color: t.slate }} />
          <Typography variant="overline" sx={{ color: t.slate, letterSpacing: "0.08em" }}>
            History
          </Typography>
        </Stack>
        <Stack spacing={0.75}>
          <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
            Originally submitted by{" "}
            <Box component="strong">{article.originalSubmittedBy.name}</Box> on{" "}
            {formatDate(article.originalSubmittedAt)}
          </Typography>
          {article.reviewedAt && (
            <Typography sx={{ fontSize: "0.875rem", color: t.slate }}>
              Reviewed by {article.reviewer} on {formatDate(article.reviewedAt)}
            </Typography>
          )}
          <Typography sx={{ fontSize: "0.875rem", color: t.slate }}>
            Published by {article.publishedBy} on {formatDate(article.publishedAt)}
          </Typography>
          {article.lastReviewedAt && article.lastReviewedAt !== article.reviewedAt && (
            <Typography sx={{ fontSize: "0.875rem", color: t.slate }}>
              Last reviewed by {article.lastReviewer ?? "—"} on{" "}
              {formatDate(article.lastReviewedAt)}
            </Typography>
          )}
          {article.rejections && article.rejections.length > 0 && (
            <Typography sx={{ fontSize: "0.8125rem", color: t.granite, mt: 0.5 }}>
              {article.rejections.length} prior rejection
              {article.rejections.length === 1 ? "" : "s"} before this version
              shipped.
            </Typography>
          )}
        </Stack>
      </Box>

      {/* ─── Lifecycle action ───
          Replaces the prior 4-button decision matrix (review-and-consolidate
          / convert / archive / delete-and-redirect). In practice only
          "archive" was being used, so the panel collapsed to two actions:
          Archive (or Unarchive when already out of rotation) + Mark as
          reviewed (resets the cadence clock without changing the body). */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ color: t.slate, letterSpacing: "0.08em" }}>
            Lifecycle
          </Typography>
          {article.archivedAt && (
            <Chip
              size="small"
              label="Archived"
              icon={<ArchiveOutlinedIcon sx={{ fontSize: 14 }} />}
              sx={{
                height: 22,
                fontSize: "0.6875rem",
                bgcolor: t.mist,
                color: t.slate,
              }}
            />
          )}
        </Stack>
        <Typography sx={{ fontSize: "0.875rem", color: t.slate, mb: 2 }}>
          {article.archivedAt
            ? "This article is out of rotation. Unarchive to bring it back into search."
            : "Reset the review cadence, or archive the article when it's no longer relevant."}
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {article.archivedAt ? (
            <Button
              variant="contained"
              onClick={toggleArchive}
              disabled={busy}
              startIcon={<UnarchiveOutlinedIcon sx={{ fontSize: 18 }} />}
            >
              Unarchive
            </Button>
          ) : (
            <Button
              variant="outlined"
              onClick={toggleArchive}
              disabled={busy}
              startIcon={<ArchiveOutlinedIcon sx={{ fontSize: 18 }} />}
            >
              Archive
            </Button>
          )}
          <Button
            variant={article.archivedAt ? "text" : "outlined"}
            onClick={markReviewed}
            disabled={busy || !!article.archivedAt}
            startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 18 }} />}
          >
            Mark as reviewed
          </Button>
        </Stack>
        {article.archivedAt && article.archivedBy && (
          <Typography sx={{ fontSize: "0.75rem", color: t.granite, mt: 1.5 }}>
            Archived by {article.archivedBy} on {formatDate(article.archivedAt)}.
          </Typography>
        )}
      </Box>

      {/* ─── Similar published articles ─── */}
      {/* Shows up to 5 published articles that overlap with this one by
          content + country. Useful for spotting duplicates and deciding
          whether to refresh, consolidate manually, or archive. The two
          "consolidate" / "redirect" actions that used to live here were
          part of the removed lifecycle matrix; the list now just deep-links
          to the comparables. */}
      {article.similar && article.similar.length > 0 && (
        <SimilarPublishedList
          similar={article.similar}
          onOpen={(id) => navigate(`/library/${id}`)}
          busy={busy}
        />
      )}

      {/* ─── Article body ─── */}
      <Box sx={{ mb: 6 }}>
        <ArticleDocument body={article.body} market={article.market} />
      </Box>

      {/* Convert / Delete-and-redirect dialogs removed — both were part of
          the dropped lifecycle decision matrix. Archive/unarchive is the
          single remaining action and runs inline (no dialog needed). */}
    </Box>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box>
      <Typography variant="overline" sx={{ display: "block", lineHeight: 1, mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.75} alignItems="center">
        {children}
        <Typography
          sx={{ fontSize: "1.125rem", fontWeight: 600, color: t.ink, lineHeight: 1.2 }}
        >
          {value}
        </Typography>
      </Stack>
    </Box>
  );
}

// LifecycleButton removed — it powered the 4-tile decision matrix that is
// no longer rendered. Archive/Unarchive use plain MUI Buttons inline.

function TrendIcon({ trend }: { trend: "up" | "flat" | "down" }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const Icon =
    trend === "up" ? ArrowUpwardIcon : trend === "down" ? ArrowDownwardIcon : RemoveIcon;
  const color = trend === "up" ? t.successInk : trend === "down" ? t.errorInk : t.granite;
  return <Icon sx={{ fontSize: 16, color }} />;
}

// ════════════════════════════════════════════════════════════
// RecommendationCard — the AI-style suggestion at the top of the page
// ════════════════════════════════════════════════════════════
function RecommendationCard({
  recommendation,
  busy,
  onApply,
  onOpenSimilar,
}: {
  recommendation: PublishedRecommendation;
  busy: boolean;
  onApply: () => void;
  onOpenSimilar: (id: string) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const { severity, apply } = recommendation;

  // Color scheme keyed to severity. M3 surface tint + matching accent stroke.
  const palette = {
    high: { fg: t.emberStrong, bg: "rgba(213, 110, 12, 0.10)", border: t.ember },
    medium: { fg: t.pepsiBlueStrong, bg: t.pepsiBlueSubtle, border: t.pepsiBlue },
    low: { fg: t.successInk, bg: t.successBg, border: t.successInk },
  }[severity];

  const buttonLabel =
    apply.kind === "mark-reviewed"
      ? "Mark as reviewed"
      : apply.kind === "archive"
        ? "Archive"
        : "";

  return (
    <Box
      sx={{
        mb: 4,
        borderRadius: 2,
        border: `1px solid ${palette.border}`,
        bgcolor: palette.bg,
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ sm: "flex-start" }}
        sx={{ p: 2.5 }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: t.paper,
            color: palette.fg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="baseline"
            sx={{ mb: 0.5 }}
          >
            <Typography
              variant="overline"
              sx={{ color: palette.fg, letterSpacing: "0.08em", fontWeight: 600 }}
            >
              Recommendation
            </Typography>
          </Stack>
          <Typography
            sx={{ fontSize: "0.9375rem", fontWeight: 600, color: t.ink, mb: 0.5 }}
          >
            {recommendation.title}
          </Typography>
          <Typography
            sx={{ fontSize: "0.8125rem", color: t.slate, lineHeight: 1.55 }}
          >
            {recommendation.reason}
          </Typography>
          {recommendation.similarRef && (
            <Button
              size="small"
              onClick={() => onOpenSimilar(recommendation.similarRef!.id)}
              startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              sx={{ mt: 1, ml: -1, fontSize: "0.75rem", color: palette.fg }}
            >
              View "{truncateInline(recommendation.similarRef.title, 50)}"
            </Button>
          )}
        </Box>
        {apply.kind !== "noop" && (
          <Button
            variant="contained"
            disabled={busy}
            onClick={onApply}
            sx={{
              flexShrink: 0,
              bgcolor: palette.fg,
              "&:hover": { bgcolor: palette.fg, opacity: 0.9 },
            }}
          >
            {buttonLabel}
          </Button>
        )}
      </Stack>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// SimilarPublishedList — overlap surface for consolidation decisions
// ════════════════════════════════════════════════════════════
function SimilarPublishedList({
  similar,
  busy,
  onOpen,
}: {
  similar: PublishedSimilarMatch[];
  /** Kept for API symmetry with the prior consolidate/redirect actions
   *  even though only the View button currently uses busy state. */
  busy: boolean;
  onOpen: (id: string) => void;
}) {
  void busy;
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box sx={{ mb: 6 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <LinkIcon sx={{ fontSize: 16, color: t.slate }} />
        <Typography
          variant="overline"
          sx={{ color: t.slate, letterSpacing: "0.08em" }}
        >
          Similar published articles · {similar.length}
        </Typography>
      </Stack>
      <Typography
        sx={{ fontSize: "0.8125rem", color: t.slate, mb: 2, lineHeight: 1.55 }}
      >
        Other live articles overlap with this one. If two cover the same ground,
        consider consolidating into a single entry — search ranks one strong
        article higher than two split ones.
      </Typography>
      <Stack spacing={1}>
        {similar.map((s) => (
          <Box
            key={s.id}
            sx={{
              p: 1.75,
              borderRadius: 2,
              bgcolor: t.surfaceContainerLow,
              transition: "background-color 120ms ease",
              "&:hover": { bgcolor: t.surfaceContainer },
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ md: "center" }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: t.ink,
                    lineHeight: 1.4,
                  }}
                >
                  {s.title}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{ mt: 0.5 }}
                >
                  <Typography
                    sx={{
                      fontFamily: theme.palette.fonts.mono,
                      fontSize: "0.6875rem",
                      color: t.granite,
                    }}
                  >
                    {s.id}
                  </Typography>
                  <Typography sx={{ fontSize: "0.6875rem", color: t.slate }}>
                    {s.market} · {s.contentType}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${Math.round(s.score * 100)}% match`}
                    sx={{
                      height: 20,
                      fontSize: "0.625rem",
                      bgcolor:
                        s.score > 0.4
                          ? "rgba(213, 110, 12, 0.14)"
                          : t.mist,
                      color: s.score > 0.4 ? t.emberStrong : t.slate,
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    size="small"
                    label={s.stalenessLevel}
                    sx={{
                      height: 20,
                      fontSize: "0.625rem",
                      bgcolor:
                        s.stalenessLevel === "stale"
                          ? "rgba(217, 48, 37, 0.10)"
                          : s.stalenessLevel === "aging"
                            ? "rgba(213, 110, 12, 0.10)"
                            : t.successBg,
                      color:
                        s.stalenessLevel === "stale"
                          ? t.errorInk
                          : s.stalenessLevel === "aging"
                            ? t.emberStrong
                            : t.successInk,
                      textTransform: "capitalize",
                      fontWeight: 600,
                    }}
                  />
                  <Typography sx={{ fontSize: "0.6875rem", color: t.granite }}>
                    {s.views30d.toLocaleString()} views/30d
                  </Typography>
                </Stack>
              </Box>
              <Stack direction="row" spacing={0.5} flexShrink={0}>
                {/* Consolidate / Redirect buttons removed with the
                    lifecycle decision matrix. The single remaining action
                    is deep-linking to the comparable article so the
                    reviewer can decide manually. */}
                <Button
                  size="small"
                  onClick={() => onOpen(s.id)}
                  startIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                  sx={{ fontSize: "0.75rem" }}
                >
                  View
                </Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function truncateInline(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}
