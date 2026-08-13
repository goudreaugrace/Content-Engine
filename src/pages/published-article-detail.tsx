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
  Checkbox,
  TextField,
  Tooltip,
  useTheme,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesomeOutlined";
import LinkIcon from "@mui/icons-material/Link";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import SourceOutlinedIcon from "@mui/icons-material/SourceOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import {
  api,
  type Market,
  type PublishedArticle,
  type PublishedSimilarMatch,
} from "../lib/api";
import { localeFor } from "../lib/market";
import { sectorShortLabel, sectorFullLabel } from "../lib/sector";
import ArticleDocument, { articleAnchorId } from "../components/article-document";

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
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [article, setArticle] = useState<PublishedArticle | null>(null);
  const [library, setLibrary] = useState<PublishedArticle[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedSimilarIds, setSelectedSimilarIds] = useState<string[]>([]);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [commentText, setCommentText] = useState("");

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

  const relatedArticles = (article.relatedArticleIds ?? [])
    .map((rid) => library.find((a) => a.id === rid))
    .filter((a): a is PublishedArticle => !!a)
    .slice(0, 4);

  const recordFeedback = async (
    kind: "helpful" | "notHelpful" | "share" | "comment",
    comment?: string,
  ) => {
    setFeedbackBusy(true);
    try {
      const updated = await api.recordPublishedFeedback(article.id, {
        kind,
        comment,
        by: "Demo User",
      });
      setArticle(updated);
      if (kind === "comment") setCommentText("");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const copyArticleLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    await recordFeedback("share");
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Button
        startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
        onClick={() => navigate("/?tab=published")}
        sx={{ mb: 3, ml: -1 }}
      >
        Published
      </Button>

      <PublishedAdminOverview
        article={article}
        stalenessConfig={stalenessConfig}
        busy={busy}
        onMarkReviewed={markReviewed}
        onToggleArchive={toggleArchive}
        onApplyRecommendation={applyRecommendation}
        onOpenSimilar={(rid) => navigate(`/library/${rid}`)}
      />

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
          onOpen={(id) => navigate(`/library/${id}`)}
          busy={busy}
        />
      )}

      {/* ─── Published article embed ─── */}
      <Box sx={{ mb: 6 }}>
        <PublishedArticleEmbed
          article={article}
          related={relatedArticles}
          onOpenRelated={(rid) => navigate(`/library/${rid}`)}
          onHelpful={() => recordFeedback("helpful")}
          onNotHelpful={() => recordFeedback("notHelpful")}
          onCopy={copyArticleLink}
          onComment={() => commentText.trim() && recordFeedback("comment", commentText)}
          commentText={commentText}
          onCommentText={setCommentText}
          busy={feedbackBusy}
        />
      </Box>

      {/* Convert / Delete-and-redirect dialogs removed — both were part of
          the dropped lifecycle decision matrix. Archive/unarchive is the
          single remaining action and runs inline (no dialog needed). */}
    </Box>
  );
}

function PublishedAdminOverview({
  article,
  stalenessConfig,
  busy,
  onMarkReviewed,
  onToggleArchive,
  onApplyRecommendation,
  onOpenSimilar,
}: {
  article: PublishedArticle;
  stalenessConfig: { label: string; color: string; bg: string };
  busy: boolean;
  onMarkReviewed: () => void;
  onToggleArchive: () => void;
  onApplyRecommendation: () => void;
  onOpenSimilar: (id: string) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const recommendation = article.recommendation;
  const hasReviewAction = !!recommendation && recommendation.apply.kind !== "noop";
  const recommendationAction =
    recommendation?.actionLabel ??
    (recommendation?.apply.kind === "generate-draft"
      ? recommendation.apply.draftKind === "consolidation"
        ? "Generate master draft"
        : "Standardize draft"
      : recommendation?.apply.kind === "mark-reviewed"
        ? "Mark reviewed"
        : recommendation?.apply.kind === "archive"
          ? "Archive"
          : "");

  return (
    <Box sx={{ mb: 4 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "flex-start" }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
            <StatusDot color={article.archivedAt ? t.slate : t.successInk} />
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: article.archivedAt ? t.slate : t.successInk }}>
              {article.archivedAt ? "Archived" : "Published"}
            </Typography>
            <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: t.borderStrong }} />
            <StatusDot color={stalenessConfig.color} />
            <Typography sx={{ fontSize: "0.8125rem", color: stalenessConfig.color }}>
              {stalenessConfig.label}
            </Typography>
          </Stack>
          <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
            {article.title}
          </Typography>
          <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" sx={{ color: t.slate }}>
            <Typography sx={{ fontSize: "0.8125rem" }}>{article.contentType}</Typography>
            <Typography sx={{ fontSize: "0.8125rem" }}>v{article.version}</Typography>
            <Typography sx={{ fontSize: "0.8125rem" }}>{localeFor(article.market)}</Typography>
            {article.sector && (
              <Typography sx={{ fontSize: "0.8125rem" }} title={sectorFullLabel(article.sector)}>
                {sectorShortLabel(article.sector)}
              </Typography>
            )}
            <Typography sx={{ fontSize: "0.8125rem", fontFamily: theme.palette.fonts.mono }}>
              {article.id}
            </Typography>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent={{ md: "flex-end" }}>
          {article.archivedAt ? (
            <Button
              variant="contained"
              size="small"
              onClick={onToggleArchive}
              disabled={busy}
              startIcon={<UnarchiveOutlinedIcon sx={{ fontSize: 18 }} />}
            >
              Unarchive
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={onToggleArchive}
              disabled={busy}
              startIcon={<ArchiveOutlinedIcon sx={{ fontSize: 18 }} />}
            >
              Archive
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={onMarkReviewed}
            disabled={busy || !!article.archivedAt}
            startIcon={
              busy ? (
                <CircularProgress size={12} color="inherit" />
              ) : (
                <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
              )
            }
          >
            Mark reviewed
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        spacing={{ xs: 1.5, md: 2.5 }}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: hasReviewAction || article.staleness.level !== "fresh" || article.archivedAt ? 1.5 : 0 }}
      >
        <CompactFact label="Views 30d" value={article.metrics.views30d.toLocaleString()} />
        <CompactFact label="All-time" value={article.metrics.viewsAllTime.toLocaleString()} />
        <CompactFact label="Published" value={formatDate(article.publishedAt)} />
        <CompactFact
          label="Reviewed"
          value={article.lastReviewedAt ? formatDate(article.lastReviewedAt) : "Not reviewed"}
        />
      </Stack>

      {(hasReviewAction || article.staleness.level !== "fresh" || article.archivedAt) && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ md: "center" }}
          justifyContent="space-between"
          sx={{
            pt: 1.25,
            borderTop: `1px solid ${t.border}`,
          }}
        >
          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
            {article.staleness.reasons[0] && (
              <Typography sx={{ fontSize: "0.8125rem", color: t.slate }}>
                {article.staleness.reasons[0]}
              </Typography>
            )}
            {hasReviewAction && recommendation && (
              <Typography sx={{ fontSize: "0.8125rem", color: t.slate, lineHeight: 1.45 }}>
                Suggested action: {recommendation.reason}
              </Typography>
            )}
            {article.archivedAt && article.archivedBy && (
              <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
                Archived by {article.archivedBy} on {formatDate(article.archivedAt)}.
              </Typography>
            )}
          </Stack>
          {hasReviewAction && recommendation && (
            <Button
              variant="outlined"
              size="small"
              disabled={busy}
              onClick={onApplyRecommendation}
              startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 16 }} />}
              sx={{ flexShrink: 0 }}
            >
              {recommendationAction}
            </Button>
          )}
          {recommendation?.similarRef && (
            <Button
              size="small"
              onClick={() => onOpenSimilar(recommendation.similarRef!.id)}
              startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
              sx={{ flexShrink: 0 }}
            >
              View match
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
}

function CompactFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box>
      <Typography sx={{ fontSize: "0.75rem", color: t.granite, mb: 0.15 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.875rem", color: t.ink, fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

function StatusDot({ color }: { color: string }) {
  return <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />;
}

function PublishedArticleEmbed({
  article,
  related,
  onOpenRelated,
  onHelpful,
  onNotHelpful,
  onCopy,
  onComment,
  commentText,
  onCommentText,
  busy,
}: {
  article: PublishedArticle;
  related: PublishedArticle[];
  onOpenRelated: (id: string) => void;
  onHelpful: () => void;
  onNotHelpful: () => void;
  onCopy: () => void;
  onComment: () => void;
  commentText: string;
  onCommentText: (text: string) => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const primaryLocale = localeFor(article.market);
  const [selectedLocale, setSelectedLocale] = useState(primaryLocale);
  const translations = Object.entries(article.translations ?? {});
  const languageOptions = Array.from(new Set([primaryLocale, ...translations.map(([locale]) => locale)]));
  const selectedTranslation =
    selectedLocale === primaryLocale ? null : article.translations?.[selectedLocale];
  const selectedBody =
    typeof selectedTranslation === "string"
      ? selectedTranslation
      : selectedTranslation?.body ?? article.body;
  const sections = extractArticleSections(article.body);
  const [activeSection, setActiveSection] = useState(sections[0]?.title ?? "");

  useEffect(() => {
    setSelectedLocale(primaryLocale);
  }, [article.id, primaryLocale]);

  useEffect(() => {
    setActiveSection(sections[0]?.title ?? "");
    const sectionIds = sections.map((section) => articleAnchorId(section.title));
    if (!sectionIds.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const matched = sections.find((section) => articleAnchorId(section.title) === visible.target.id);
        if (matched) setActiveSection(matched.title);
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: [0, 1],
      },
    );

    sectionIds.forEach((sectionId) => {
      const node = document.getElementById(sectionId);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [article.id, sections.map((section) => section.title).join("|")]);

  return (
    <Box
      sx={{
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        bgcolor: t.surfaceContainerLow,
        overflow: "visible",
      }}
    >
      <PublishedArticleToolbar
        languageOptions={languageOptions}
        selectedLocale={selectedLocale}
        onLocaleChange={setSelectedLocale}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "180px minmax(0, 1fr) 300px",
            xl: "200px minmax(0, 820px) 310px",
          },
          alignItems: "start",
          gap: { xs: 0, lg: 2 },
          p: { xs: 1, md: 2 },
          bgcolor: t.surfaceContainerLow,
        }}
      >
        <ArticleContentsNav
          sections={sections}
          activeSection={activeSection}
          onSectionSelect={setActiveSection}
        />
        <Box>
          <ArticleDocument
            body={selectedBody}
            market={article.market}
            title={article.title}
            lead={article.lead}
            contentType={article.contentType}
            showContents={false}
            showMastheadMeta={false}
          />
          <ArticleAppendices
            article={article}
            related={related}
            onOpenRelated={onOpenRelated}
            onHelpful={onHelpful}
            onNotHelpful={onNotHelpful}
            onCopy={onCopy}
            onComment={onComment}
            commentText={commentText}
            onCommentText={onCommentText}
            busy={busy}
          />
        </Box>
        <ArticleInfobox article={article} languageOptions={languageOptions} selectedLocale={selectedLocale} />
      </Box>
    </Box>
  );
}

function PublishedArticleToolbar({
  languageOptions,
  selectedLocale,
  onLocaleChange,
}: {
  languageOptions: string[];
  selectedLocale: string;
  onLocaleChange: (locale: string) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 2 },
        py: 1.25,
        borderBottom: `1px solid ${t.border}`,
        bgcolor: t.paper,
      }}
    >
      <Stack direction="row" justifyContent="flex-end" alignItems="center">
        <Stack direction="row" spacing={1} alignItems="center" sx={{ alignSelf: { xs: "flex-start", md: "center" } }}>
          <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
            Language
          </Typography>
          <FormControl size="small">
            <Select
              value={selectedLocale}
              onChange={(e) => onLocaleChange(e.target.value as string)}
              inputProps={{ "aria-label": "Article language" }}
              renderValue={(value) => (
                <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: t.pepsiBlueStrong }}>
                  {languageLabel(String(value))}
                </Typography>
              )}
              MenuProps={{
                PaperProps: {
                  sx: {
                    mt: 0.75,
                    borderRadius: 2,
                    border: `1px solid ${t.border}`,
                    boxShadow: "0 6px 18px rgba(60,64,67,0.16)",
                    overflow: "hidden",
                  },
                },
                MenuListProps: {
                  dense: true,
                  sx: { py: 0.5 },
                },
              }}
              sx={{
                height: 32,
                borderRadius: 999,
                bgcolor: t.surfaceContainerLow,
                "& .MuiSelect-select": {
                  py: 0,
                  pl: 1.25,
                  pr: "32px !important",
                  display: "flex",
                  alignItems: "center",
                  minHeight: "0 !important",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: t.border,
                  borderRadius: 999,
                },
                "&:hover": { bgcolor: t.mist },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: t.borderStrong,
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: t.pepsiBlue,
                  borderWidth: 1,
                },
                "& .MuiSelect-icon": {
                  color: t.pepsiBlueStrong,
                  right: 8,
                  fontSize: 18,
                },
              }}
            >
              {languageOptions.map((locale) => (
                <MenuItem
                  key={locale}
                  value={locale}
                  sx={{
                    minHeight: 34,
                    fontSize: "0.875rem",
                    color: t.ink,
                    "&.Mui-selected": {
                      bgcolor: t.pepsiBlueSubtle,
                      color: t.pepsiBlueStrong,
                      fontWeight: 700,
                      "&:hover": { bgcolor: t.pepsiBlueSubtle },
                    },
                  }}
                >
                  {languageLabel(locale)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Box>
  );
}

function ArticleContentsNav({
  sections,
  activeSection,
  onSectionSelect,
}: {
  sections: ArticleSection[];
  activeSection: string;
  onSectionSelect: (section: string) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box
      sx={{
        display: { xs: "none", lg: "block" },
        position: "sticky",
        top: 16,
        maxHeight: "calc(100vh - 32px)",
        overflow: "auto",
        pr: 1,
        py: 1,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: t.slate }}>
          On this page
        </Typography>
      </Stack>
      <Stack spacing={0.1}>
        {sections.map((section) => {
          const active = activeSection === section.title;
          return (
            <Box
              key={`${section.depth}-${section.title}`}
              component="a"
              href={`#${articleAnchorId(section.title)}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(articleAnchorId(section.title))?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
                onSectionSelect(section.title);
              }}
              sx={{
                display: "block",
                ml: section.depth === 3 ? 0.85 : 0,
                px: 1,
                py: active ? 0.65 : 0.5,
                borderRadius: active ? 999 : 1.5,
                border: active ? `1px solid ${t.slate}` : "1px solid transparent",
                fontSize: section.depth === 3 ? "0.75rem" : "0.8125rem",
                fontWeight: active ? 800 : section.depth === 3 ? 500 : 600,
                lineHeight: 1.35,
                color: active ? t.ink : t.slate,
                textDecoration: "none",
                transition: "background-color 120ms ease, border-color 120ms ease, color 120ms ease",
                "&:hover": {
                  bgcolor: active ? "transparent" : t.mist,
                  color: t.ink,
                },
              }}
            >
              {section.title}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

function ArticleInfobox({
  article,
  languageOptions,
  selectedLocale,
}: {
  article: PublishedArticle;
  languageOptions: string[];
  selectedLocale: string;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const translations = Object.entries(article.translations ?? {});
  const detailRows = [
    { label: "Content type", value: article.contentType },
    { label: "Owner", value: article.owner ?? article.originalSubmittedBy.name },
    { label: "Last published", value: formatDate(article.publishedAt) },
    { label: "Effective", value: article.effectiveAt ? formatDate(article.effectiveAt) : "Not specified" },
    { label: "Next review", value: article.nextReviewAt ? formatDate(article.nextReviewAt) : "Not scheduled" },
    { label: "Version", value: `v${article.version}` },
  ];
  const visibilityRows = [
    { label: "Who can see it", value: article.visibility?.security === "restricted" ? "Restricted audience" : "All employees" },
    { label: "Audience", value: (article.visibility?.audiences ?? ["All employees"]).join(", ") },
    { label: "Market", value: article.market },
    { label: "Countries", value: (article.visibility?.countries ?? article.countries).join(", ") },
  ];

  return (
    <Box
      id="article-details"
      sx={{
        position: { lg: "sticky" },
        top: 16,
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        bgcolor: t.paper,
        overflow: "hidden",
      }}
    >
      <InfoboxSection title="Article details" rows={detailRows} />
      <InfoboxSection title="Security and audience" rows={visibilityRows} />
      <Box sx={{ borderTop: `1px solid ${t.border}` }}>
        <InfoboxHeader>Translations</InfoboxHeader>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {languageOptions.map((locale) => {
              const translation = article.translations?.[locale];
              const status = typeof translation === "string" ? "current" : translation?.status;
              return (
                <Chip
                  key={locale}
                  size="small"
                  label={`${languageLabel(locale)}${locale === selectedLocale ? " · selected" : status === "stale" ? " · stale" : ""}`}
                  color={status === "stale" ? "warning" : "default"}
                  sx={{ height: 24, fontSize: "0.6875rem", borderRadius: 999 }}
                />
              );
            })}
            {!translations.length && (
              <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
                Source language only.
              </Typography>
            )}
          </Stack>
        </Box>
      </Box>
      <Box sx={{ borderTop: `1px solid ${t.border}` }}>
        <InfoboxHeader>Topics</InfoboxHeader>
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {(article.topics ?? [article.contentType]).slice(0, 6).map((topic) => (
              <Chip key={topic} size="small" label={topic} sx={{ height: 24, fontSize: "0.6875rem", borderRadius: 999 }} />
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

type ArticleSection = {
  title: string;
  depth: 2 | 3;
};

function extractArticleSections(body: string): ArticleSection[] {
  return Array.from(body.matchAll(/^(#{2,3})\s+(.+?)\s*$/gm)).map((match) => ({
    depth: match[1].length as 2 | 3,
    title: match[2].trim(),
  }));
}

function languageLabel(locale: string) {
  const labels: Record<string, string> = {
    "en-US": "English",
    en: "English",
    es: "Español",
    "es-MX": "Español",
    "pt-BR": "Português",
    pt: "Português",
    fr: "Français",
    "fr-CA": "Français",
    hi: "हिन्दी",
  };
  return labels[locale] ?? locale.toUpperCase();
}

function InfoboxSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box sx={{ borderTop: `1px solid ${t.border}` }}>
      <InfoboxHeader>{title}</InfoboxHeader>
      <Box component="table" sx={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, px: 1.5, pb: 1.25 }}>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <Box
                component="th"
                scope="row"
                sx={{
                  width: "38%",
                  px: 0,
                  py: 0.65,
                  verticalAlign: "top",
                  textAlign: "left",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: t.slate,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {row.label}
              </Box>
              <Box
                component="td"
                sx={{
                  px: 0,
                  py: 0.65,
                  pl: 1.25,
                  verticalAlign: "top",
                  fontSize: "0.8125rem",
                  lineHeight: 1.35,
                  color: t.ink,
                  wordBreak: "break-word",
                }}
              >
                {row.value}
              </Box>
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

function InfoboxHeader({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Typography
      sx={{
        bgcolor: "transparent",
        color: t.pepsiBlueStrong,
        fontSize: "0.6875rem",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        px: 1.5,
        pt: 1.5,
        pb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

function ArticleAppendices({
  article,
  related,
  onOpenRelated,
  onHelpful,
  onNotHelpful,
  onCopy,
  onComment,
  commentText,
  onCommentText,
  busy,
}: {
  article: PublishedArticle;
  related: PublishedArticle[];
  onOpenRelated: (id: string) => void;
  onHelpful: () => void;
  onNotHelpful: () => void;
  onCopy: () => void;
  onComment: () => void;
  commentText: string;
  onCommentText: (text: string) => void;
  busy: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const feedback = article.feedback ?? { helpful: 0, notHelpful: 0, shares: 0, comments: [] };

  return (
    <Stack spacing={2.5} sx={{ mt: 3, maxWidth: 820 }}>
      <AppendixPanel icon={<SourceOutlinedIcon />} title="References">
        {article.references?.length ? (
          <Stack spacing={1}>
            {article.references.map((ref) => (
              <Box key={ref.id}>
                <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: t.ink }}>
                  {ref.title}
                </Typography>
                <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
                  {ref.kind} · {ref.source ?? "reviewer"} · added by {ref.addedBy}
                </Typography>
                {ref.excerpt && (
                  <Typography sx={{ mt: 0.5, fontSize: "0.8125rem", color: t.slate, lineHeight: 1.45 }}>
                    {ref.excerpt}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: "0.875rem", color: t.slate }}>
            No references attached. Confirm source backing before relying on this article.
          </Typography>
        )}
      </AppendixPanel>

      <AppendixPanel icon={<AccountTreeOutlinedIcon />} title="Related Articles">
        {related.length ? (
          <Stack spacing={1}>
            {related.map((item) => (
              <Button
                key={item.id}
                onClick={() => onOpenRelated(item.id)}
                endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                sx={{ justifyContent: "space-between", px: 0, color: t.pepsiBlueStrong }}
              >
                {item.title}
              </Button>
            ))}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: "0.875rem", color: t.slate }}>
            No related articles have been linked yet.
          </Typography>
        )}
      </AppendixPanel>

      <AppendixPanel icon={<ForumOutlinedIcon />} title="Feedback">
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
          <Button size="small" variant="outlined" disabled={busy} onClick={onHelpful} startIcon={<ThumbUpAltOutlinedIcon sx={{ fontSize: 16 }} />}>
            Helpful {feedback.helpful}
          </Button>
          <Button size="small" variant="outlined" disabled={busy} onClick={onNotHelpful} startIcon={<ThumbDownAltOutlinedIcon sx={{ fontSize: 16 }} />}>
            Not helpful {feedback.notHelpful}
          </Button>
          <Tooltip title="Copy article link">
            <Button size="small" variant="outlined" disabled={busy} onClick={onCopy} startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />}>
              Share {feedback.shares}
            </Button>
          </Tooltip>
        </Stack>
        <Stack spacing={1}>
          {feedback.comments.slice(-3).map((comment) => (
            <Box key={comment.id} sx={{ borderTop: `1px solid ${t.border}`, pt: 1 }}>
              <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
                {comment.by} · {formatDate(comment.at)}
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>{comment.body}</Typography>
            </Box>
          ))}
          <TextField
            size="small"
            multiline
            minRows={2}
            value={commentText}
            onChange={(e) => onCommentText(e.target.value)}
            placeholder="Add a comment for the owner"
          />
          <Button size="small" variant="contained" disabled={busy || !commentText.trim()} onClick={onComment}>
            Comment
          </Button>
        </Stack>
      </AppendixPanel>
    </Stack>
  );
}

function AppendixPanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box sx={{ borderTop: `1px solid ${t.border}`, pt: 2.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
        <Box sx={{ color: t.pepsiBlue, display: "flex", "& svg": { fontSize: 18 } }}>{icon}</Box>
        <Typography variant="overline" sx={{ color: t.slate, letterSpacing: "0.08em" }}>
          {title}
        </Typography>
      </Stack>
      {children}
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
    <Box
      component="details"
      sx={{
        mb: 4,
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        bgcolor: t.paper,
        overflow: "hidden",
        "&[open] summary": { borderBottom: `1px solid ${t.border}` },
      }}
    >
      <Box
        component="summary"
        sx={{
          cursor: "pointer",
          listStyle: "none",
          p: 2,
          "&::-webkit-details-marker": { display: "none" },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
            <LinkIcon sx={{ fontSize: 17, color: t.slate, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: t.ink }}>
                Potential duplicate articles
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: t.slate }}>
                {similar.length} matches · {selectedIds.length} selected for possible consolidation
              </Typography>
            </Box>
          </Stack>
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: t.pepsiBlueStrong, flexShrink: 0 }}>
            Review
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ p: 2, bgcolor: t.surfaceContainerLow }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: "0.8125rem", color: t.slate, lineHeight: 1.55, maxWidth: 720 }}>
            Select overlapping articles only when the agent should fold them into one master draft for review.
          </Typography>
          <Button
            variant="contained"
            size="small"
            disabled={busy || selectedIds.length === 0}
            onClick={onGenerate}
            startIcon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
            sx={{ alignSelf: { xs: "flex-start", md: "center" } }}
          >
            Generate draft
          </Button>
        </Stack>
        <Stack spacing={1}>
          {similar.map((s) => (
            <Box
              key={s.id}
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: t.paper,
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
    </Box>
  );
}
