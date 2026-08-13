import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Stack, Tooltip, Typography, useTheme } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api, type PublishedArticle } from "../lib/api";
import ArticleDocument from "../components/article-document";

/**
 * Content-owner view of a published article. It deliberately contains no
 * lifecycle controls, admin recommendations, or review queue information.
 * Owners get the evidence they need to improve findability, then decide what
 * (if anything) to change themselves.
 */
export default function OwnerArticlePerformance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [article, setArticle] = useState<PublishedArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(e?.message ?? String(e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!article) return <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}><CircularProgress size={24} sx={{ color: t.slate }} /></Box>;

  const freshness = {
    fresh: { label: "Fresh", score: 100 - article.staleness.score, color: t.successInk, bg: t.successBg },
    aging: { label: "Aging", score: 100 - article.staleness.score, color: t.emberStrong, bg: "rgba(213, 110, 12, 0.10)" },
    stale: { label: "Stale", score: 100 - article.staleness.score, color: t.errorInk, bg: t.errorBg },
    archived: { label: "Archived", score: 0, color: t.slate, bg: t.surfaceContainer },
  }[article.staleness.level];

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Button startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => navigate("/?tab=my-articles")} sx={{ mb: 3, ml: -1 }}>
        My articles
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
        <Typography variant="h6" sx={{ mb: 2 }}>Article</Typography>
        <ArticleDocument body={article.body} market={article.market} readDepthPercent={article.metrics.scrollDepthPercent} />
      </Box>
    </Box>
  );
}

function formatDuration(seconds?: number) {
  if (!seconds) return "No timing yet";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins ? `${mins}m ${secs.toString().padStart(2, "0")}s` : `${secs}s`;
}

function ArticlePerformance({ article }: { article: PublishedArticle }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const metrics = article.metrics;
  const locations = metrics.locations ?? [];
  const queries = metrics.searchQueries ?? [];

  return (
    <Stack spacing={2.5}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 1.5,
        }}
      >
        <PerformanceStat label="Views this month" value={metrics.views30d.toLocaleString()} />
        <PerformanceStat label="All-time views" value={metrics.viewsAllTime.toLocaleString()} />
        <PerformanceStat label="Average read time" value={formatDuration(metrics.averageEngagementSeconds)} />
        <PerformanceStat label="Reader depth" value={metrics.scrollDepthPercent ? `${metrics.scrollDepthPercent}%` : "No depth yet"} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1fr)" },
          gap: 2,
        }}
      >
        <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: t.ink, mb: 0.5 }}>
            Searches that found this article
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: t.slate, mb: 1.25 }}>
            Top internal search phrases before opening the article.
          </Typography>
          <Stack spacing={0.75}>
            {queries.length > 0 ? (
              queries.slice(0, 5).map((query) => (
                <Stack key={query.phrase} direction="row" justifyContent="space-between" spacing={1.5}>
                  <Typography sx={{ fontSize: "0.8125rem", color: t.ink, minWidth: 0 }}>
                    {query.phrase}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: t.granite, whiteSpace: "nowrap" }}>
                    {query.searches} searches
                  </Typography>
                </Stack>
              ))
            ) : (
              <Typography sx={{ fontSize: "0.8125rem", color: t.granite }}>
                Search terms will appear after the article has traffic.
              </Typography>
            )}
          </Stack>
        </Box>

        <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 2, p: 2 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: t.ink, mb: 0.5 }}>
            Reader locations
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: t.slate, mb: 1.25 }}>
            Aggregated country-level readership.
          </Typography>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {locations.length > 0 ? (
              locations.slice(0, 8).map((location) => (
                <Chip
                  key={location.code}
                  size="small"
                  label={`${location.name} · ${location.views}`}
                  sx={{ bgcolor: t.surfaceContainerLow, color: t.ink }}
                />
              ))
            ) : (
              <Typography sx={{ fontSize: "0.8125rem", color: t.granite }}>
                Location data will appear after the article has traffic.
              </Typography>
            )}
          </Stack>
          {metrics.cta && (
            <Box sx={{ mt: 1.75, pt: 1.5, borderTop: `1px solid ${t.border}` }}>
              <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
                Next-step clicks
              </Typography>
              <Typography sx={{ fontSize: "0.875rem", color: t.ink, fontWeight: 650 }}>
                {metrics.cta.label}: {metrics.cta.clicks.toLocaleString()}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Stack>
  );
}

function PerformanceStat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 2, p: 2, bgcolor: "#FFFFFF" }}>
      <Typography sx={{ fontSize: "0.75rem", color: t.granite, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "1.35rem", fontWeight: 700, color: t.ink, lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  );
}
