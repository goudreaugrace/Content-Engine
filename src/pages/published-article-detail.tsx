import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Checkbox,
  IconButton,
  Tooltip,
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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import {
  api,
  type Market,
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

function marketIdFor(market: Market): string {
  return {
    US: "us",
    MX: "mx",
    BR: "br",
    UK: "uk",
    IN: "in",
    Global: "global",
  }[market];
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
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [article, setArticle] = useState<PublishedArticle | null>(null);
  const [library, setLibrary] = useState<PublishedArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedSimilarIds, setSelectedSimilarIds] = useState<string[]>([]);

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

  useEffect(() => {
    if (!article) return;
    const recommended = article.recommendation?.apply.kind === "generate-draft"
      ? article.recommendation.apply.candidateIds ?? []
      : [];
    const fallback = article.similar?.filter((s) => s.score >= 0.3).map((s) => s.id) ?? [];
    setSelectedSimilarIds(recommended.length ? recommended : fallback);
  }, [article?.id]);

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

  const generateConsolidation = async () => {
    if (!article) return;
    setBusy(true);
    try {
      const result = await api.consolidatePublishedArticle(article.id, {
        articleIds: [article.id, ...selectedSimilarIds],
      });
      navigate(`/articles/${result.article.id}`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setBusy(false);
    }
  };

  const generateStandardizedDraft = async () => {
    if (!article) return;
    setBusy(true);
    try {
      const result = await api.standardizeMigration({
        sourceTitle: article.title,
        sourceContent: article.body,
        contentType: article.contentType,
        marketId: marketIdFor(article.market),
        sectorId: article.sector ?? "pfna",
        countries: article.countries,
      });
      navigate(`/articles/${result.article.id}`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setBusy(false);
    }
  };

  /** Applies the server-provided recommendation. */
  const applyRecommendation = async () => {
    if (!article.recommendation) return;
    const op = article.recommendation.apply;
    if (op.kind === "noop") return;
    if (op.kind === "mark-reviewed") return markReviewed();
    if (op.kind === "generate-draft") {
      if (op.draftKind === "consolidation") return generateConsolidation();
      return generateStandardizedDraft();
    }
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
  const fromTeamArticles = searchParams.get("from") === "team-articles";
  const returnPath = fromTeamArticles ? "/?tab=my-articles" : "/?tab=published";
  const returnLabel = fromTeamArticles ? "Team Articles" : "Published Health";

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
        onClick={() => navigate(returnPath)}
        sx={{ mb: 3, ml: -1 }}
      >
        {returnLabel}
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
          onOpenSimilar={(id) => navigate(`/library/${id}?from=${fromTeamArticles ? "team-articles" : "published-health"}`)}
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
          selectedIds={selectedSimilarIds}
          onToggle={(id) =>
            setSelectedSimilarIds((ids) =>
              ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
            )
          }
          onGenerate={generateConsolidation}
          onOpen={(id) => navigate(`/library/${id}?from=${fromTeamArticles ? "team-articles" : "published-health"}`)}
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

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins ? `${mins}m ${secs.toString().padStart(2, "0")}s` : `${secs}s`;
}

const COUNTRY_LABELS: Record<string, string> = {
  US: "United States", CA: "Canada", MX: "Mexico", GB: "United Kingdom",
  IE: "Ireland", SG: "Singapore", BR: "Brazil", IN: "India", DE: "Germany",
  FR: "France", AU: "Australia", PH: "Philippines",
};

function countryLabel(code: string) {
  return COUNTRY_LABELS[code] ?? code;
}

function MetricHelp({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip title={children} arrow enterTouchDelay={0}>
      <IconButton
        aria-label="Learn about this metric"
        size="small"
        sx={{ p: 0.25, color: "text.secondary", verticalAlign: "middle" }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 15 }} />
      </IconButton>
    </Tooltip>
  );
}

export function ArticlePerformance({ article }: { article: PublishedArticle }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const locations = article.metrics.locations ?? [];
  const queries = article.metrics.searchQueries ?? [];
  const totalLocatedViews = locations.reduce((sum, location) => sum + location.views, 0);
  const expectedCodes = new Set(article.countries);
  const unexpectedViews = locations
    .filter((location) => !expectedCodes.has(location.code))
    .reduce((sum, location) => sum + location.views, 0);
  const unexpectedShare = totalLocatedViews ? Math.round((unexpectedViews / totalLocatedViews) * 100) : 0;
  const lowViews = article.metrics.views30d < 30;
  const quickExits = article.metrics.views30d >= 30 && (article.metrics.averageEngagementSeconds ?? 0) < 45;
  const insights = [
    unexpectedShare >= 20
      ? {
          title: "Check regional targeting",
          detail: `${unexpectedShare}% of tracked views came from countries outside this article’s intended audience. Review the audience tags and title before changing the article itself.`,
          tone: "warning" as const,
        }
      : null,
    quickExits
      ? {
          title: "Check audience fit",
          detail: "Many people opened this article, but readers typically leave quickly. Compare the title and search phrases with the article’s intended region and purpose.",
          tone: "info" as const,
        }
      : null,
    lowViews
      ? {
          title: "Check findability",
          detail: "Fewer than 30 people viewed this article in the last 30 days. Consider related links, audience tags, and whether this belongs with a broader article.",
          tone: "info" as const,
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; detail: string; tone: "warning" | "info" }>;

  return (
    <Box sx={{ mb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h6">Article performance</Typography>
        <Chip label="Last 30 days" size="small" sx={{ bgcolor: t.surfaceContainer, color: t.slate }} />
      </Stack>
      <Typography variant="body2" sx={{ color: t.slate, mb: 2.25 }}>
        A quick read on how colleagues find and use this article.
      </Typography>

      <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 2, p: { xs: 2, sm: 2.5 }, bgcolor: t.paper, mb: 2 }}>
          <Typography variant="overline" sx={{ color: t.slate, mb: 1.5, display: "block" }}>Engagement</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
            <PerformanceStat
              icon={<VisibilityOutlinedIcon sx={{ fontSize: 18 }} />}
              label="Views (30d)"
              value={article.metrics.views30d.toLocaleString()}
              help="Every time this article was opened, whether the reader came from intranet search, a link, or navigation. The initial attention threshold is 30 views in 30 days."
            />
            <PerformanceStat
              icon={<AccessTimeOutlinedIcon sx={{ fontSize: 18 }} />}
              label="Active reading time"
              value={formatDuration(article.metrics.averageEngagementSeconds)}
              help="The average time the article was visible and active in a reader’s browser. It is a stronger signal than time between page loads, which can include an inactive tab."
            />
          </Box>
          <Box sx={{ mt: 2, pt: 1.75, borderTop: `1px solid ${t.surfaceContainer}` }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1.25}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="subtitle2">How far readers get</Typography>
                  <MetricHelp>{"The typical percentage of the article a reader reaches. Low depth can suggest that essential information belongs earlier or the article could be shorter."}</MetricHelp>
                </Stack>
                <Typography variant="body2" sx={{ color: t.slate, mt: 0.25 }}>
                  Typical reader reaches <Box component="strong" sx={{ color: t.ink }}>{article.metrics.scrollDepthPercent ?? 0}%</Box> of this article
                </Typography>
              </Box>
              <Box sx={{ width: { xs: "100%", sm: 180 }, height: 8, bgcolor: t.surfaceContainerHigh, borderRadius: 99, overflow: "hidden", flexShrink: 0 }}>
                <Box sx={{ width: `${article.metrics.scrollDepthPercent ?? 0}%`, height: "100%", bgcolor: t.pepsiBlue, borderRadius: 99 }} />
              </Box>
            </Stack>
            {article.metrics.cta && (
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={1} sx={{ mt: 1.75, pt: 1.5, borderTop: `1px solid ${t.surfaceContainer}` }}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="subtitle2">Next step in this article</Typography>
                    <MetricHelp>{"Shown only when this article includes an identifiable next step, such as a form, request, or link. This count measures clicks, not confirmed completion in another system."}</MetricHelp>
                  </Stack>
                  <Typography variant="body2" sx={{ color: t.slate, mt: 0.25 }}>{article.metrics.cta.label}</Typography>
                </Box>
                <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: t.ink, whiteSpace: "nowrap" }}>{article.metrics.cta.clicks} clicks</Typography>
              </Stack>
            )}
          </Box>
      </Box>

      {insights.length > 0 && (
        <Box sx={{ display: "grid", gap: 1.25, mb: 2 }}>
          {insights.map((insight) => {
            const color = insight.tone === "warning" ? t.emberStrong : t.infoInk;
            const bg = insight.tone === "warning" ? "rgba(213, 110, 12, 0.09)" : t.infoBg;
            return (
              <Box key={insight.title} sx={{ borderLeft: `3px solid ${color}`, bgcolor: bg, borderRadius: 1, px: 2, py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="subtitle2" sx={{ color }}>{insight.title}</Typography>
                  <MetricHelp>{"This is a suggested place to investigate, not an automatic diagnosis or change."}</MetricHelp>
                </Stack>
                <Typography variant="body2" sx={{ color: t.ink, mt: 0.35 }}>{insight.detail}</Typography>
              </Box>
            );
          })}
        </Box>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" }, gap: 2 }}>
        <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 2, p: 2.25, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
            <PublicOutlinedIcon sx={{ color: t.pepsiBlue, fontSize: 18 }} />
            <Typography variant="subtitle2">Where this article is read</Typography>
            <MetricHelp>{"Countries are based on aggregated reader activity. Outlined markers are outside the countries tagged as the article’s intended audience."}</MetricHelp>
          </Stack>
          <Stack direction="row" alignItems="baseline" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
            <Typography variant="body2" sx={{ color: t.slate }}>Intended audience</Typography>
            {article.countries.length ? article.countries.map((code) => (
              <Chip key={code} label={countryLabel(code)} size="small" sx={{ bgcolor: t.pepsiBlueSubtle, color: t.pepsiBlueStrong, fontWeight: 600 }} />
            )) : <Typography variant="body2" sx={{ color: t.granite }}>Not specified</Typography>}
          </Stack>
          <ReadershipMap locations={locations} expectedCodes={expectedCodes} />
        </Box>

        <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 2, p: 2.25, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
            <SearchOutlinedIcon sx={{ color: t.pepsiBlue, fontSize: 18 }} />
            <Typography variant="subtitle2">Searches that found this article</Typography>
            <MetricHelp>{"The phrases colleagues typed into the intranet search before opening this article. Small groups should be suppressed in a production analytics connection to protect employee privacy."}</MetricHelp>
          </Stack>
          <Typography variant="body2" sx={{ color: t.slate, mb: 1.25 }}>
            Top phrases by search volume
          </Typography>
          <Box sx={{ maxHeight: 207, overflowY: "auto", pr: 0.5 }}>
            {queries.slice(0, 10).map((query) => (
              <Stack key={query.phrase} direction="row" justifyContent="space-between" spacing={1.5} sx={{ py: 0.9, borderBottom: `1px solid ${t.surfaceContainer}` }}>
                <Typography variant="body2" sx={{ color: t.ink, minWidth: 0 }}>{query.phrase}</Typography>
                <Typography variant="caption" sx={{ color: t.slate, whiteSpace: "nowrap" }}>{query.searches} searches</Typography>
              </Stack>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function PerformanceStat({ icon, label, value, help }: { icon: React.ReactNode; label: string; value: string; help: string }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: t.slate, mb: 0.75 }}>
        {icon}
        <Typography variant="overline">{label}</Typography>
        <MetricHelp>{help}</MetricHelp>
      </Stack>
      <Typography sx={{ fontSize: "1.5rem", fontWeight: 600, color: t.ink, lineHeight: 1.2 }}>{value}</Typography>
    </Box>
  );
}

function ReadershipMap({ locations, expectedCodes }: { locations: NonNullable<PublishedArticle["metrics"]["locations"]>; expectedCodes: Set<string> }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const max = Math.max(...locations.map((location) => location.views), 1);
  const points: Record<string, [number, number]> = {
    US: [106, 88], CA: [101, 57], MX: [104, 117], BR: [161, 169], GB: [288, 76], IE: [278, 80], DE: [305, 86], FR: [293, 99], IN: [380, 126], SG: [412, 157], AU: [455, 187], PH: [437, 139],
  };
  return (
    <Box>
      <Box component="svg" viewBox="0 0 520 250" role="img" aria-label="World map showing article readership by country" sx={{ display: "block", width: "100%", height: "auto", bgcolor: "#EAF4FB", borderRadius: 1.5 }}>
        <defs>
          <pattern id="map-grid" width="52" height="31" patternUnits="userSpaceOnUse"><path d="M 52 0 L 0 0 0 31" fill="none" stroke="rgba(0,75,147,0.10)" strokeWidth="1" /></pattern>
        </defs>
        <rect width="520" height="250" fill="url(#map-grid)" />
        <g fill="#D9E6EF" stroke="#AFC5D4" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M28 52l19-20 38-6 31 15 20 26-11 27-20 5-12 27-29 5-22-20-15-31 12-20z" />
          <path d="M125 121l19 4 23 31 4 34-13 37-21 9-17-28 6-27-14-20z" />
          <path d="M241 46l24-19 44 4 15 18-9 15-19 8-10 16-27-5-20-17z" />
          <path d="M278 87l35 0 32 24 7 33-12 30-24 17-22-14-9-29-20-24z" />
          <path d="M343 96l31-12 34 10 25 17 28 10 11 25-23 17-28-7-13-22-27-6-20 12-19-17z" />
          <path d="M416 183l35 0 34 22-5 22-34 2-28-21z" />
        </g>
        <g fill="#6E8797" fontFamily={theme.palette.fonts.sans} fontSize="8" fontWeight="600" letterSpacing="1.1">
          <text x="62" y="145">AMERICAS</text><text x="266" y="78">EUROPE</text><text x="367" y="178">ASIA–PACIFIC</text>
        </g>
        {locations.map((location) => {
          const point = points[location.code] ?? [260, 130];
          const intensity = 0.28 + 0.72 * (location.views / max);
          const expected = expectedCodes.has(location.code);
          return (
            <g key={location.code}>
              <circle cx={point[0]} cy={point[1]} r={8 + 10 * (location.views / max)} fill={`rgba(0, 75, 147, ${intensity})`} stroke="#FFFFFF" strokeWidth="2" />
              {!expected && <circle cx={point[0]} cy={point[1]} r={12 + 10 * (location.views / max)} fill="none" stroke={t.emberStrong} strokeWidth="2.5" strokeDasharray="3 2" />}
              <title>{`${location.name}: ${location.views} views${expected ? "" : " (outside intended audience)"}`}</title>
            </g>
          );
        })}
      </Box>
      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
        <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: t.pepsiBlue }} /><Typography variant="caption">Intended audience</Typography></Stack>
        <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 12, height: 12, borderRadius: "50%", border: `2px dashed ${t.emberStrong}` }} /><Typography variant="caption">Outside intended audience</Typography></Stack>
      </Stack>
      <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
        {locations.slice(0, 5).map((location) => {
          const unexpected = !expectedCodes.has(location.code);
          return <Chip key={location.code} size="small" label={`${location.name} · ${location.views}`} sx={{ bgcolor: t.surfaceContainer, color: unexpected ? t.emberStrong : t.ink, border: unexpected ? `1px solid ${t.ember}` : "none" }} />;
        })}
      </Stack>
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
    recommendation.actionLabel ??
    (apply.kind === "generate-draft"
      ? apply.draftKind === "consolidation"
        ? "Generate master draft"
        : "Standardize for DEEx"
      : apply.kind === "mark-reviewed"
        ? "Mark as reviewed"
        : apply.kind === "archive"
          ? "Archive"
          : "");

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
          {recommendation.evidence?.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
              {recommendation.evidence.map((e) => (
                <Chip
                  key={`${e.signal}-${e.label}`}
                  size="small"
                  label={`${e.label}`}
                  title={e.detail}
                  sx={{ height: 22, fontSize: "0.6875rem", bgcolor: t.paper, color: palette.fg }}
                />
              ))}
            </Stack>
          )}
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
  selectedIds,
  busy,
  onToggle,
  onGenerate,
  onOpen,
}: {
  similar: PublishedSimilarMatch[];
  selectedIds: string[];
  busy: boolean;
  onToggle: (id: string) => void;
  onGenerate: () => void;
  onOpen: (id: string) => void;
}) {
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
          Articles to combine · {selectedIds.length} selected
        </Typography>
      </Stack>
      <Typography
        sx={{ fontSize: "0.8125rem", color: t.slate, mb: 2, lineHeight: 1.55 }}
      >
        Select the overlapping articles the agent should fold into one master draft. The draft will enter the normal review flow and preserve source IDs for audit.
      </Typography>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
        <Button
          variant="contained"
          size="small"
          disabled={busy || selectedIds.length === 0}
          onClick={onGenerate}
          startIcon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
        >
          Generate master draft
        </Button>
      </Stack>
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
              <Checkbox
                checked={selectedIds.includes(s.id)}
                onChange={() => onToggle(s.id)}
                onClick={(e) => e.stopPropagation()}
                size="small"
                sx={{ mt: -0.5 }}
              />
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
