import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api, type PublishedArticle } from "../lib/api";
import { ArticlePerformance } from "./published-article-detail";
import ArticleDocument from "../components/article-document";
import ArticleReadingFrame from "../components/article-reading-frame";
import { localeFor } from "../lib/market";

function translationBody(value: NonNullable<PublishedArticle["translations"]>[string] | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.body;
}

/**
 * Content-owner view of a published article. It deliberately contains no
 * lifecycle controls, admin recommendations, or review queue information.
 * Owners get the evidence they need to improve findability, then decide what
 * (if anything) to change themselves.
 */
export default function OwnerArticlePerformance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [article, setArticle] = useState<PublishedArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewLocale, setViewLocale] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [baseArticle, metrics] = await Promise.all([
        api.getPublishedArticle(id),
        api.getPublishedArticlePerformance(id),
      ]);
      setArticle({ ...baseArticle, metrics });
      setError(null);
    } catch (e: any) {
      try {
        const source = await api.getArticle(id);
        if (source.status === "published" || source.publishedArticleId) {
          const published = await api.getPublishedArticle(source.publishedArticleId ?? source.id);
          navigate(`/my-articles/${published.id}${window.location.search}`, { replace: true });
          return;
        }
        navigate(`/articles/${source.id}${window.location.search}`, { replace: true });
        return;
      } catch {
        // Keep the original owner/published lookup error below.
      }
      setError(e?.message ?? String(e));
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!article) return <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}><CircularProgress size={24} sx={{ color: t.slate }} /></Box>;

  const freshness = {
    fresh: { label: "Fresh", score: 100 - article.staleness.score, color: t.successInk, bg: t.successBg },
    aging: { label: "Aging", score: 100 - article.staleness.score, color: t.emberStrong, bg: "rgba(213, 110, 12, 0.10)" },
    stale: { label: "Stale", score: 100 - article.staleness.score, color: t.errorInk, bg: t.errorBg },
    archived: { label: "Archived", score: 0, color: t.slate, bg: t.surfaceContainer },
  }[article.staleness.level];
  const primaryLocale = localeFor(article.market);
  const availableLocales = [primaryLocale, ...Object.keys(article.translations ?? {})];
  const selectedLocale = viewLocale ?? primaryLocale;
  const displayedBody =
    selectedLocale !== primaryLocale
      ? (translationBody(article.translations?.[selectedLocale]) ?? article.body)
      : article.body;

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Button startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => navigate("/?tab=my-articles")} sx={{ mb: 3, ml: -1 }}>
        {searchParams.get("from") === "team-articles" ? "Team Articles" : "My Articles"}
      </Button>
      <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
        <Chip label="Published" size="small" sx={{ bgcolor: t.successBg, color: t.successInk, fontWeight: 600 }} />
        <Tooltip title="Freshness reflects review cadence, not whether the content is correct." arrow>
          <Chip
            label={article.staleness.level === "archived" ? "Archived" : `${freshness.score}/100 · ${freshness.label}`}
            size="small"
            sx={{ bgcolor: freshness.bg, color: freshness.color, fontWeight: 600 }}
          />
        </Tooltip>
        <Typography variant="body2" sx={{ color: t.slate }}>{article.contentType}</Typography>
        <Typography variant="body2" sx={{ color: t.slate }}>•</Typography>
        <Typography variant="body2" sx={{ color: t.slate }}>Your article</Typography>
      </Stack>
      <Typography variant="h4" component="h1" sx={{ mb: 0.75 }}>{article.title}</Typography>
      <Typography variant="body2" sx={{ color: t.slate, mb: 4 }}>
        Use these signals to understand how colleagues find and use your article. Nothing is changed automatically.
      </Typography>
      <ArticlePerformance article={article} />
      <Box sx={{ mt: 5, mb: 6 }}>
        <ArticleReadingFrame
          body={displayedBody}
          tags={[article.contentType, localeFor(article.market), ...(article.countries ?? [])]}
          selectedLocale={selectedLocale}
          primaryLocale={primaryLocale}
          availableLocales={availableLocales}
          quickLinks={[
            {
              label: "Back to my articles",
              onClick: () => navigate("/?tab=my-articles"),
            },
          ]}
          article={
            <ArticleDocument
              body={displayedBody}
              sections={selectedLocale === primaryLocale ? article.sections : undefined}
              market={article.market}
              title={article.title}
              lead={article.lead}
              contentType={article.contentType}
              canonicalSlug={article.canonicalSlug}
              updatedLabel={`Updated: ${new Date(article.lastReviewedAt ?? article.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
              viewCount={article.metrics.viewsAllTime}
              selectedLocale={selectedLocale}
              availableLocales={availableLocales}
              onLocaleSelect={setViewLocale}
              presentation="immersive"
              showMasthead={false}
              readDepthPercent={article.metrics.scrollDepthPercent}
            />
          }
          details={[
            {
              title: "Publishing details",
              rows: [
                { label: "Status", value: article.archivedAt ? "Archived" : "Published" },
                { label: "Owner", value: article.owner ?? article.originalSubmittedBy.name },
                { label: "Version", value: `Version ${article.version}` },
              ],
            },
          ]}
        />
      </Box>
    </Box>
  );
}
