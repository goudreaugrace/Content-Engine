import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import RemoveIcon from "@mui/icons-material/Remove";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import {
  api,
  type PublishedArticle,
} from "../lib/api";
import { localeFor } from "../lib/market";
import { sectorShortLabel } from "../lib/sector";
import {
  ARTICLE_TABLE_COL_WIDTHS as W,
  ARTICLE_CELL_MAX_WIDTH,
  ARTICLE_TABLE_SX,
} from "../lib/article-table";
import { KpiRow, KpiItem } from "../components/kpi-row";
import PrePublishedTab from "./articles-tab-pre-published";
import { NeedsReviewTab } from "./articles-dashboard";
import FilterSelect from "../components/filter-select";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";

type StalenessFilter = "all" | "fresh" | "aging" | "stale" | "archived";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Phase F — tabbed Articles shell. "Published" lost its top-level page status
 * when we collapsed the two browse surfaces (drafts + published) into a single
 * "Articles" tab in the sidebar. This file now exports:
 *   - PublishedLibrary  → the page shell with sub-tabs + shared header
 *   - PublishedTab      → the existing published-articles list (header removed)
 * Pre-published tab lives in articles-tab-pre-published.tsx.
 */
type ArticlesSubTab = "needs-review" | "pre-published" | "published";

export default function PublishedLibrary() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL-synced tab state ──
  // Reads ?tab=needs-review|pre-published|published. Default =
  // "needs-review" — the merged Review Cycle experience is the highest-
  // priority landing surface on this combined page.
  const tabParam = searchParams.get("tab");
  const activeTab: ArticlesSubTab =
    tabParam === "pre-published"
      ? "pre-published"
      : tabParam === "published"
        ? "published"
        : "needs-review";

  const setTab = (next: ArticlesSubTab) => {
    const sp = new URLSearchParams(searchParams);
    if (next === "needs-review") sp.delete("tab");
    else sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  // Each tab reports its own row count so we can show "(N)" badges in the
  // tab labels. Useful at a glance — "Needs review (11) · Pre-published (12) · Published (5)".
  const [needsCount, setNeedsCount] = useState<number | null>(null);
  const [preCount, setPreCount] = useState<number | null>(null);
  const [pubCount, setPubCount] = useState<number | null>(null);

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      {/* ─── Shared page header ─── */}
      {/* Stacks until md (~900px) so the title has room to breathe on
          narrower panes; the actions drop below rather than squeezing
          the h1 into an awkward wrap. */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "flex-end" }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h4" component="h1">
            All Articles
          </Typography>
          {/* Subtitle trimmed to a single sentence (M3 medium app-bar pattern).
              The tab labels do the work of distinguishing pre-published vs
              published; the paragraph-length explanation read as docs, not
              chrome. */}
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: "62ch" }}>
            All knowledge articles, organized by lifecycle stage.
          </Typography>
        </Box>
        {/* Persistent action row — always visible regardless of active tab.
            "Start review cycle" opens the guided review workflow (walks the
            reviewer through the highest-priority attention items one at a
            time). "New article" opens the create wizard. */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexShrink: 0 }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<PlayArrowRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate("/review")}
            sx={{ whiteSpace: "nowrap" }}
          >
            Start review cycle
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate("/new")}
            sx={{ whiteSpace: "nowrap" }}
          >
            New article
          </Button>
        </Stack>
      </Stack>

      {/* ─── Sub-tabs ─── */}
      {/* Border lives ON the Tabs itself (not the outer Box) so the divider
          only spans the width of the tab labels, not the entire content area. */}
      <Box sx={{ mt: 4, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setTab(v as ArticlesSubTab)}
          sx={{
            display: "inline-flex",
            minHeight: 0,
            borderBottom: `1px solid ${t.border}`,
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
              minHeight: 0,
              py: 1.25,
              px: 0,
              mr: 4,
              color: t.slate,
              "&.Mui-selected": { color: t.ink },
            },
            "& .MuiTabs-indicator": { bgcolor: t.ink, height: 2 },
          }}
        >
          <Tab
            value="pre-published"
            label={
              <Stack direction="row" spacing={1} alignItems="baseline">
                <span>Pre-published</span>
                {preCount !== null && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: theme.palette.fonts.mono,
                      fontSize: "0.6875rem",
                      color: t.granite,
                    }}
                  >
                    {preCount}
                  </Box>
                )}
              </Stack>
            }
          />
          <Tab
            value="published"
            label={
              <Stack direction="row" spacing={1} alignItems="baseline">
                <span>Published</span>
                {pubCount !== null && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: theme.palette.fonts.mono,
                      fontSize: "0.6875rem",
                      color: t.granite,
                    }}
                  >
                    {pubCount}
                  </Box>
                )}
              </Stack>
            }
          />
          <Tab
            value="needs-review"
            label={
              <Stack direction="row" spacing={1} alignItems="baseline">
                <span>Needs review</span>
                {needsCount !== null && needsCount > 0 && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: theme.palette.fonts.mono,
                      fontSize: "0.6875rem",
                      color: t.ember,
                      fontWeight: 600,
                    }}
                  >
                    {needsCount}
                  </Box>
                )}
              </Stack>
            }
          />
        </Tabs>
      </Box>

      {/* ─── Active tab body ─── */}
      {activeTab === "needs-review" ? (
        <NeedsReviewTab onLoaded={setNeedsCount} />
      ) : activeTab === "pre-published" ? (
        <PrePublishedTab onLoaded={setPreCount} />
      ) : (
        <PublishedTab onLoaded={setPubCount} />
      )}
    </Box>
  );
}

// ────────────────────────────────────────────────────────────
// PublishedTab — the existing published-articles list, lifted out of the
// page shell. Owns its own filters + table; doesn't render the shared
// header or tabs (those live in PublishedLibrary above).
// ────────────────────────────────────────────────────────────
function PublishedTab({
  onLoaded,
}: {
  onLoaded?: (count: number) => void;
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [stalenessFilter, setStalenessFilter] = useState<StalenessFilter>("all");

  /**
   * Table / Board view toggle, mirroring the Pre-published tab. Persisted
   * per-user in localStorage under a separate key so a writer can prefer
   * Board for drafts and Table for published (or vice versa) without one
   * choice forcing the other.
   */
  const [viewMode, setViewMode] = useState<"table" | "board">(() => {
    if (typeof window === "undefined") return "table";
    try {
      return localStorage.getItem("published-view-v1") === "board"
        ? "board"
        : "table";
    } catch {
      return "table";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("published-view-v1", viewMode);
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, [viewMode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listPublishedArticles();
      setArticles(data);
      onLoaded?.(data.length);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [onLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  const availableMarkets = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => set.add(a.market));
    return Array.from(set).sort();
  }, [articles]);
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => a.sector && set.add(a.sector));
    return Array.from(set).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return articles.filter((a) => {
      if (term) {
        const hay = `${a.title} ${a.seo?.title ?? ""} ${a.seo?.keywords?.join(" ") ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (sectorFilter !== "all" && a.sector !== sectorFilter) return false;
      if (marketFilter !== "all" && a.market !== marketFilter) return false;
      if (stalenessFilter !== "all" && a.staleness.level !== stalenessFilter)
        return false;
      return true;
    });
  }, [articles, search, marketFilter, sectorFilter, stalenessFilter]);

  const counts = useMemo(
    () => ({
      total: articles.length,
      fresh: articles.filter((a) => a.staleness.level === "fresh").length,
      aging: articles.filter((a) => a.staleness.level === "aging").length,
      stale: articles.filter((a) => a.staleness.level === "stale").length,
      archived: articles.filter((a) => a.staleness.level === "archived").length,
    }),
    [articles],
  );

  const hasAnyFilter =
    search.trim() !== "" ||
    marketFilter !== "all" ||
    sectorFilter !== "all" ||
    stalenessFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setMarketFilter("all");
    setSectorFilter("all");
    setStalenessFilter("all");
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* ─── KPI row — published lifecycle buckets ─── */}
      <KpiRow>
        <KpiItem label="Total published" value={counts.total} />
        <KpiItem label="Fresh" value={counts.fresh} />
        <KpiItem label="Aging" value={counts.aging} />
        <KpiItem
          label="Stale"
          value={counts.stale}
          accent={counts.stale > 0 ? t.ember : undefined}
        />
      </KpiRow>

      {/* ─── Filter strip ─── */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ md: "center" }}
        sx={{ mt: 6, mb: 1.5 }}
      >
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          {/* Staleness filter — same dropdown pattern as Needs Review and
              Pre-published so all three tabs share one filter shape. */}
          <FilterSelect
            label="Staleness"
            value={stalenessFilter}
            onChange={(v) => setStalenessFilter(v as StalenessFilter)}
            options={[
              { value: "all", label: `All (${counts.total})` },
              { value: "fresh", label: `Fresh (${counts.fresh})` },
              { value: "aging", label: `Aging (${counts.aging})` },
              { value: "stale", label: `Stale (${counts.stale})` },
              { value: "archived", label: `Archived (${counts.archived})` },
            ]}
          />
          <FilterSelect
            label="Sector"
            value={sectorFilter}
            onChange={setSectorFilter}
            options={[
              { value: "all", label: "All sectors" },
              ...availableSectors.map((s) => ({
                value: s,
                label: sectorShortLabel(s),
              })),
            ]}
          />
          <FilterSelect
            label="Market"
            value={marketFilter}
            onChange={setMarketFilter}
            options={[
              { value: "all", label: "All markets" },
              ...availableMarkets.map((m) => ({
                value: m,
                label: `${m} · ${localeFor(m as any)}`,
              })),
            ]}
          />
          {hasAnyFilter && (
            <Button
              size="small"
              onClick={clearFilters}
              sx={{ color: t.slate, ml: 0.5, fontSize: "0.75rem" }}
            >
              Clear
            </Button>
          )}
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={0.75} alignItems="center">
          <TextField
            size="small"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", md: 220 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: t.slate }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearch("")}
                    sx={{ p: 0.5, mr: -0.5 }}
                  >
                    <CloseOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <IconButton onClick={load} disabled={loading} size="small" title="Refresh">
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {/* Divider between data controls and view controls. */}
          <Box
            sx={{
              width: "1px",
              height: 20,
              bgcolor: t.border,
              mx: 0.5,
              flexShrink: 0,
            }}
          />
          {/* M3 segmented buttons — Table / Board view toggle. Persisted via
              localStorage. Board groups by staleness so writers can see the
              shape of "what needs refreshing" at a glance. */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(_, v) => v && setViewMode(v)}
            aria-label="View mode"
          >
            {/* Icon-only segmented buttons. Labels live in hover tooltips
                so the toolbar stays compact without losing discoverability. */}
            <Tooltip title="Table view" placement="top">
              <ToggleButton
                value="table"
                aria-label="Table view"
                sx={{ px: 1, py: 0.5 }}
              >
                <ViewListOutlinedIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Board view" placement="top">
              <ToggleButton
                value="board"
                aria-label="Board view"
                sx={{ px: 1, py: 0.5 }}
              >
                <ViewKanbanOutlinedIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* "Showing N of M" caption removed per M3 cleanup — count is already
          carried by the filter chips when filtered, and by the active tab's
          badge when unfiltered. Pagination footer surfaces the slice in the
          table view; lane counts surface it in the board view. */}

      {/* ─── Table view ─── */}
      {viewMode === "table" && (
      <TableContainer>
        <Table sx={ARTICLE_TABLE_SX}>
          {/* Canonical column order — shared with the Review Cycle and
              Pre-published Articles tables. Cols 1-5 (Article · Market ·
              Staleness · Submitted by · When) are identical across all
              three; Views (30d) is this table's specialty. Archived state
              is now expressed via the Staleness chip, not a separate
              Lifecycle column. */}
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: W.article }}>Article</TableCell>
              <TableCell sx={{ width: W.market }}>Market</TableCell>
              <TableCell sx={{ width: W.status }}>Staleness</TableCell>
              <TableCell sx={{ width: W.submittedBy }}>Submitted by</TableCell>
              <TableCell sx={{ width: W.when }}>Last reviewed</TableCell>
              <TableCell align="right" sx={{ width: W.trailing }}>
                Views (30d)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={20} sx={{ color: t.slate }} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Stack alignItems="center" spacing={1.5}>
                    <Typography color="text.secondary" variant="body2">
                      No published articles match your filters.
                    </Typography>
                    {hasAnyFilter && (
                      <Button size="small" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <PublishedRow key={a.id} article={a} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* ─── Board view ─── */}
      {viewMode === "board" && (
        <PublishedBoardView
          articles={filtered}
          loading={loading}
          onCardClick={(a) => navigate(`/library/${a.id}`)}
        />
      )}
    </Box>
  );

  function PublishedRow({ article }: { article: PublishedArticle }) {
    const theme = useTheme();
    const t = theme.palette.tokens;
    return (
      <TableRow
        hover
        sx={{ cursor: "pointer" }}
        onClick={() => navigate(`/library/${article.id}`)}
      >
        {/* 1 · Article — title + id/version/contentType secondary line. */}
        <TableCell sx={{ maxWidth: ARTICLE_CELL_MAX_WIDTH }}>
          <Typography sx={{ fontSize: "0.9375rem", fontWeight: 500, color: t.ink }}>
            {article.title}
          </Typography>
          <Typography
            sx={{
              fontFamily: theme.palette.fonts.mono,
              fontSize: "0.6875rem",
              color: t.granite,
              mt: 0.25,
            }}
          >
            {article.id} · v{article.version} · {article.contentType}
            {article.sector ? ` · ${sectorShortLabel(article.sector)}` : ""}
          </Typography>
        </TableCell>
        {/* 2 · Market — locale + countries. */}
        <TableCell>
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
          {article.countries.length > 0 && (
            <Typography sx={{ fontSize: "0.6875rem", color: t.granite, mt: 0.25 }}>
              {article.countries.join(", ")}
            </Typography>
          )}
        </TableCell>
        {/* 3 · Staleness — status-equivalent chip for published articles. */}
        <TableCell>
          <StalenessChip staleness={article.staleness} />
        </TableCell>
        {/* 4 · Submitted by — original author of the source draft. Same
            field other tables use for their Submitted by column. */}
        <TableCell>
          <Typography sx={{ fontSize: "0.875rem", color: t.ink, lineHeight: 1.3 }}>
            {article.originalSubmittedBy.name}
          </Typography>
        </TableCell>
        {/* 5 · Last reviewed — when this published article was last
            confirmed accurate. */}
        <TableCell>
          {article.lastReviewedAt ? (
            <>
              <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
                {daysAgo(article.lastReviewedAt)}
              </Typography>
              <Typography sx={{ fontSize: "0.6875rem", color: t.granite }}>
                {formatDate(article.lastReviewedAt)}
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: "0.875rem", color: t.granite }}>—</Typography>
          )}
        </TableCell>
        {/* 6 · Views (30d) — table-specific metric. Right-aligned for
            numeric scannability. */}
        <TableCell align="right">
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            justifyContent="flex-end"
          >
            <TrendIcon trend={article.metrics.trend} />
            <Typography sx={{ fontSize: "0.875rem", color: t.ink, fontWeight: 500 }}>
              {article.metrics.views30d.toLocaleString()}
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: "0.6875rem", color: t.granite }}>
            {article.metrics.viewsAllTime.toLocaleString()} all-time
          </Typography>
        </TableCell>
        {/* Lifecycle column removed — archived state is now part of the
            Staleness chip in column 3. */}
      </TableRow>
    );
  }
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────
// Metric helper removed — the standalone metric row it powered was deleted
// in the M3 cleanup pass. Counts now live in the StalenessChipFilter chips
// and the tab badges. If a summary widget needs to come back, use the chips
// directly rather than reviving Metric.

function StalenessChip({ staleness }: { staleness: PublishedArticle["staleness"] }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const config = {
    fresh: { label: "Fresh", color: t.successInk, bg: t.successBg },
    aging: { label: "Aging", color: t.ember, bg: "rgba(213, 110, 12, 0.10)" },
    stale: { label: "Stale", color: t.errorInk, bg: "rgba(217, 48, 37, 0.10)" },
    // Archived uses neutral slate — terminal state, not an alert level.
    archived: { label: "Archived", color: t.slate, bg: t.mist },
  }[staleness.level];
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        label={config.label}
        size="small"
        sx={{
          bgcolor: config.bg,
          color: config.color,
          fontWeight: 600,
          fontSize: "0.6875rem",
          height: 22,
        }}
      />
      <Typography sx={{ fontSize: "0.6875rem", color: t.granite }}>
        {staleness.score}
      </Typography>
    </Stack>
  );
}

/**
 * M3 filter-chip cluster for staleness. Replaces the prior FilterSelect
 * dropdown — chips show the option AND its count, and tap-to-toggle reads
 * faster than open-menu-select-close for a short fixed option set.
 */
function StalenessChipFilter({
  value,
  onChange,
  counts,
}: {
  value: StalenessFilter;
  onChange: (next: StalenessFilter) => void;
  counts: {
    total: number;
    fresh: number;
    aging: number;
    stale: number;
    archived: number;
  };
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  // Archived uses a neutral granite accent — it's a terminal state, not an
  // alert level, so it shouldn't read with the same urgency as Stale.
  const options: Array<{
    key: StalenessFilter;
    label: string;
    count: number;
    /** Accent only renders when the chip is selected, so calm bar stays calm. */
    accent: string;
  }> = [
    { key: "all", label: "All", count: counts.total, accent: t.pepsiBlue },
    { key: "fresh", label: "Fresh", count: counts.fresh, accent: t.successInk },
    { key: "aging", label: "Aging", count: counts.aging, accent: t.ember },
    { key: "stale", label: "Stale", count: counts.stale, accent: t.errorInk },
    {
      key: "archived",
      label: "Archived",
      count: counts.archived,
      accent: t.slate,
    },
  ];

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {options.map((opt) => {
        const selected = value === opt.key;
        return (
          <Chip
            key={opt.key}
            label={
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5 }}
              >
                <Box component="span">{opt.label}</Box>
                <Box
                  component="span"
                  sx={{
                    fontFamily: theme.palette.fonts.mono,
                    fontSize: "0.6875rem",
                    opacity: 0.85,
                  }}
                >
                  {opt.count}
                </Box>
              </Box>
            }
            onClick={() => onChange(opt.key)}
            size="small"
            variant={selected ? "filled" : "outlined"}
            sx={{
              height: 26,
              fontSize: "0.75rem",
              cursor: "pointer",
              ...(selected
                ? {
                    bgcolor: opt.accent,
                    color: "#FFFFFF",
                    borderColor: opt.accent,
                    "&:hover": { bgcolor: opt.accent, opacity: 0.92 },
                  }
                : {
                    borderColor: t.border,
                    color: t.ink,
                    "&:hover": { borderColor: t.borderStrong, bgcolor: t.mist },
                  }),
            }}
          />
        );
      })}
    </Stack>
  );
}

function TrendIcon({ trend }: { trend: PublishedArticle["metrics"]["trend"] }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const Icon =
    trend === "up"
      ? ArrowUpwardIcon
      : trend === "down"
        ? ArrowDownwardIcon
        : RemoveIcon;
  const color =
    trend === "up" ? t.successInk : trend === "down" ? t.errorInk : t.granite;
  return <Icon sx={{ fontSize: 13, color }} />;
}

// ════════════════════════════════════════════════════════════
// Board view for published articles — lanes by staleness level
// ────────────────────────────────────────────────────────────
// Three lanes, freshest-first: Fresh · Aging · Stale. Lane counts use the
// staleness accent so the volume of "what needs refreshing" reads at a
// glance. Cards carry every field the table column shows (type · locale ·
// version · id, title, submitted by, last reviewed, 30-day views with
// trend, optional lifecycle pill) so the toggle is a real view choice,
// not a stripped-down summary.
// ════════════════════════════════════════════════════════════
const PUBLISHED_BOARD_LANE_ORDER: PublishedArticle["staleness"]["level"][] = [
  "fresh",
  "aging",
  "stale",
  "archived",
];
const STALENESS_LANE_LABELS: Record<
  PublishedArticle["staleness"]["level"],
  string
> = {
  fresh: "Fresh",
  aging: "Aging",
  stale: "Stale",
  archived: "Archived",
};

function PublishedBoardView({
  articles,
  loading,
  onCardClick,
}: {
  articles: PublishedArticle[];
  loading: boolean;
  onCardClick: (a: PublishedArticle) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const grouped = useMemo(() => {
    const map: Record<PublishedArticle["staleness"]["level"], PublishedArticle[]> = {
      fresh: [],
      aging: [],
      stale: [],
      archived: [],
    };
    articles.forEach((a) => map[a.staleness.level].push(a));
    return map;
  }, [articles]);

  if (loading && articles.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={20} sx={{ color: t.slate }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        overflowX: "auto",
        pb: 2,
        scrollbarWidth: "thin",
      }}
    >
      {PUBLISHED_BOARD_LANE_ORDER.map((level) => (
        <PublishedBoardLane
          key={level}
          level={level}
          articles={grouped[level]}
          onCardClick={onCardClick}
        />
      ))}
    </Box>
  );
}

function PublishedBoardLane({
  level,
  articles,
  onCardClick,
}: {
  level: PublishedArticle["staleness"]["level"];
  articles: PublishedArticle[];
  onCardClick: (a: PublishedArticle) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const accent =
    level === "fresh"
      ? t.successInk
      : level === "aging"
        ? t.ember
        : level === "stale"
          ? t.errorInk
          : t.slate; // archived — neutral, terminal

  return (
    <Box
      sx={{
        width: 320,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 360px)",
        minHeight: 200,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ mb: 1.5, px: 0.5, flexShrink: 0 }}
      >
        <Typography
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: t.ink,
            letterSpacing: "0.01em",
          }}
        >
          {STALENESS_LANE_LABELS[level]}
        </Typography>
        <Box
          sx={{
            minWidth: 22,
            height: 18,
            px: 0.75,
            borderRadius: 999,
            bgcolor: articles.length === 0 ? t.mist : accent,
            color: articles.length === 0 ? t.granite : "#FFFFFF",
            fontSize: "0.6875rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {articles.length}
        </Box>
      </Stack>

      <Stack
        spacing={1.25}
        sx={{ flex: 1, overflowY: "auto", pr: 0.5, pb: 1 }}
      >
        {articles.length === 0 ? (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: t.granite,
              textAlign: "center",
              py: 3,
              px: 1.5,
              lineHeight: 1.4,
            }}
          >
            Nothing {STALENESS_LANE_LABELS[level].toLowerCase()}.
          </Typography>
        ) : (
          articles.map((a) => (
            <PublishedBoardCard
              key={a.id}
              article={a}
              onClick={() => onCardClick(a)}
            />
          ))
        )}
      </Stack>
    </Box>
  );
}

function PublishedBoardCard({
  article,
  onClick,
}: {
  article: PublishedArticle;
  onClick: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  return (
    <Box
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        p: 2,
        bgcolor: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        cursor: "pointer",
        transition: "all 150ms cubic-bezier(0.22, 1, 0.36, 1)",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        "&:hover": {
          borderColor: t.borderStrong,
          bgcolor: t.mist,
        },
        "&:focus-visible": {
          outline: `2px solid ${t.pepsiBlue}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Identity strip — type · locale · version · id. Mono so it reads as
          metadata, parallel to the table's secondary line under the title. */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{
          fontFamily: theme.palette.fonts.mono,
          fontSize: "0.6875rem",
          color: t.granite,
          letterSpacing: "0.02em",
        }}
      >
        <Box component="span" sx={{ color: t.slate, fontWeight: 500 }}>
          {article.contentType}
        </Box>
        <Box component="span">·</Box>
        <Box component="span">{localeFor(article.market)}</Box>
        {article.sector && (
          <>
            <Box component="span">·</Box>
            <Box component="span">{sectorShortLabel(article.sector)}</Box>
          </>
        )}
        <Box component="span">·</Box>
        <Box component="span">v{article.version}</Box>
        <Box component="span">·</Box>
        <Box
          component="span"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            flex: 1,
          }}
        >
          {article.id}
        </Box>
      </Stack>

      {/* Title — 2-line clamp. */}
      <Typography
        sx={{
          fontSize: "0.9375rem",
          fontWeight: 500,
          color: t.ink,
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {article.title}
      </Typography>

      {/* Countries — only when set. Quiet chips row mirroring the Market
          column's secondary line in the table. */}
      {article.countries.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {article.countries.slice(0, 4).map((c) => (
            <Chip
              key={c}
              label={c}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.6875rem" }}
            />
          ))}
          {article.countries.length > 4 && (
            <Typography
              sx={{
                fontSize: "0.6875rem",
                color: t.granite,
                alignSelf: "center",
              }}
            >
              +{article.countries.length - 4}
            </Typography>
          )}
        </Stack>
      )}

      {/* Views row — 30-day count with trend arrow, plus all-time as a
          secondary caption. Equivalent to the table's right-aligned
          Views (30d) column. */}
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <TrendIcon trend={article.metrics.trend} />
        <Typography
          sx={{ fontSize: "0.875rem", color: t.ink, fontWeight: 500 }}
        >
          {article.metrics.views30d.toLocaleString()}
        </Typography>
        <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
          views · {article.metrics.viewsAllTime.toLocaleString()} all-time
        </Typography>
      </Stack>

      {/* Lifecycle pill removed — archived state is now reflected by the
          card sitting in the Archived lane, no extra pill needed. */}

      {/* Footer — Submitted by + Last reviewed. Pushed to the bottom so
          all cards share a baseline. */}
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        spacing={1}
        sx={{ mt: "auto", pt: 0.5 }}
      >
        <Typography
          sx={{
            fontSize: "0.8125rem",
            color: t.ink,
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            flex: 1,
          }}
        >
          {article.originalSubmittedBy?.name ?? "—"}
        </Typography>
        {article.lastReviewedAt ? (
          <Tooltip
            title={new Date(article.lastReviewedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          >
            <Typography
              sx={{ fontSize: "0.75rem", color: t.granite, flexShrink: 0 }}
            >
              Reviewed {daysAgo(article.lastReviewedAt)}
            </Typography>
          </Tooltip>
        ) : (
          <Typography
            sx={{ fontSize: "0.75rem", color: t.granite, flexShrink: 0 }}
          >
            Not yet reviewed
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
