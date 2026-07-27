import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import RateReviewOutlinedIcon from "@mui/icons-material/RateReviewOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import CloseOutlinedIcon2 from "@mui/icons-material/CloseOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import { api, type Article, type ArticleStatus } from "../lib/api";
import { localeFor } from "../lib/market";
import { sectorShortLabel } from "../lib/sector";
import {
  ARTICLE_TABLE_COL_WIDTHS as W,
  ARTICLE_CELL_MAX_WIDTH,
  ARTICLE_TABLE_SX,
} from "../lib/article-table";
import { KpiRow, KpiItem } from "../components/kpi-row";
import FilterSelect from "../components/filter-select";

// ────────────────────────────────────────────────────────────
// Filters
// ────────────────────────────────────────────────────────────
// Excludes "published" — the pre-published tab filters those out, so the
// filter dropdown shouldn't offer them either.
type StatusFilter = "all" | Exclude<ArticleStatus, "published">;
type TypeFilter = "all" | Article["contentType"];
type MarketFilter = "all" | Article["market"];

// Status meta for the Pre-published tab. "published" is included so any
// edge-case article that's still loaded (e.g. mid-transition) renders a
// reasonable chip, but the tab actively filters published articles out
// so the user shouldn't see this chip in practice.
const STATUS_META: Record<
  ArticleStatus,
  { label: string; color: "warning" | "success" | "error" | "info"; icon: React.ReactNode }
> = {
  "needs-review": {
    label: "Needs review",
    color: "warning",
    icon: <RateReviewOutlinedIcon sx={{ fontSize: 13 }} />,
  },
  "needs-info": {
    label: "Needs info",
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
    icon: <CloseOutlinedIcon2 sx={{ fontSize: 13 }} />,
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
function daysAgo(iso: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 30) return `${diff}d ago`;
  if (diff < 365) return `${Math.round(diff / 30)}mo ago`;
  return `${Math.round(diff / 365)}y ago`;
}

// ────────────────────────────────────────────────────────────
// PreviousTab — list of every Article in the submission queue
// (any status). Mirrors the published tab's shape so the two tabs
// feel like a single, consistent catalog.
// ────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

export default function PrePublishedTab({
  onLoaded,
}: {
  /** Called once after each load with the total count so the parent can
   *  show "(N)" in the tab label. */
  onLoaded?: (count: number) => void;
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [countryFilter, setMarketFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  /**
   * Table / Board view toggle. Persisted to localStorage so a user's
   * preferred shape sticks across reloads — this is a personal preference,
   * not a content-state thing. First-time visitors get Table (denser,
   * faster to scan); Board is opt-in via the toggle.
   */
  const [viewMode, setViewMode] = useState<"table" | "board">(() => {
    if (typeof window === "undefined") return "table";
    try {
      return localStorage.getItem("pre-pub-view-v1") === "board"
        ? "board"
        : "table";
    } catch {
      return "table";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("pre-pub-view-v1", viewMode);
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, [viewMode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listArticles();
      // Pre-published tab shows draft-state articles only. Source articles
      // at status="published" are audit history; the live content lives on
      // the PublishedArticle entries (Published tab).
      const drafts = data.filter((a) => a.status !== "published");
      // Sort newest first by default, matching the published tab.
      drafts.sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt));
      setArticles(drafts);
      onLoaded?.(drafts.length);
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

  // Reset page whenever filters change.
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, typeFilter, countryFilter, sectorFilter]);

  const counts = useMemo(
    () => ({
      total: articles.length,
      "needs-review": articles.filter((a) => a.status === "needs-review").length,
      "needs-info": articles.filter((a) => a.status === "needs-info").length,
      rejected: articles.filter((a) => a.status === "rejected").length,
    }),
    [articles],
  );

  const availableTypes = useMemo(() => {
    const set = new Set<Article["contentType"]>();
    articles.forEach((a) => set.add(a.contentType));
    return Array.from(set).sort();
  }, [articles]);
  const availableCountries = useMemo(() => {
    const set = new Set<Article["market"]>();
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
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (typeFilter !== "all" && a.contentType !== typeFilter) return false;
      if (sectorFilter !== "all" && a.sector !== sectorFilter) return false;
      if (countryFilter !== "all" && a.market !== countryFilter) return false;
      if (term) {
        const hay =
          `${a.title} ${a.submittedBy.name} ${a.contentType}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [articles, search, statusFilter, typeFilter, countryFilter, sectorFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const hasAnyFilter =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    countryFilter !== "all" ||
    sectorFilter !== "all";

  const clearAll = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setMarketFilter("all");
    setSectorFilter("all");
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ─── KPI row — draft workflow buckets ─── */}
      <KpiRow>
        <KpiItem label="Total drafts" value={counts.total} />
        <KpiItem
          label="Needs review"
          value={counts["needs-review"]}
          accent={counts["needs-review"] > 0 ? t.ember : undefined}
        />
        <KpiItem label="Needs info" value={counts["needs-info"]} />
        <KpiItem label="Rejected" value={counts.rejected} />
      </KpiRow>

      {/* ─── Filter strip ───
          M3 cleanup: the prior 5-tile metric row (Total / Needs review /
          Needs info / Approved / Rejected) duplicated information now carried
          by the status chips below and the tab badge above. Removed in favor
          of chips that show both the count AND act as the filter. */}
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
          {/* Status filter — mirrors the pattern used on Needs Review so
              all three tabs share one filter shape. Counts inline in the
              option label. */}
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: `All statuses (${counts.total})` },
              {
                value: "needs-review",
                label: `Needs review (${counts["needs-review"]})`,
              },
              {
                value: "needs-info",
                label: `Needs info (${counts["needs-info"]})`,
              },
              { value: "rejected", label: `Rejected (${counts.rejected})` },
            ]}
          />
          <FilterSelect
            label="Type"
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as TypeFilter)}
            options={[
              { value: "all", label: "All types" },
              ...availableTypes.map((tname) => ({ value: tname, label: tname })),
            ]}
          />
          <FilterSelect
            label="Sector"
            value={sectorFilter}
            onChange={(v) => setSectorFilter(v)}
            options={[
              { value: "all", label: "All sectors" },
              ...availableSectors.map((s) => ({
                value: s,
                label: sectorShortLabel(s),
              })),
            ]}
          />
          <FilterSelect
            label="Country"
            value={countryFilter}
            onChange={(v) => setMarketFilter(v as MarketFilter)}
            options={[
              { value: "all", label: "All countries" },
              ...availableCountries.map((m) => ({
                value: m,
                label: `${m} · ${localeFor(m)}`,
              })),
            ]}
          />
          {hasAnyFilter && (
            <Button
              size="small"
              onClick={clearAll}
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
          <IconButton
            onClick={load}
            disabled={loading}
            size="small"
            title="Refresh"
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
          {/* Divider between data controls (search/refresh) and view controls
              (table/board). Keeps the two intents visually separated. */}
          <Box
            sx={{
              width: "1px",
              height: 20,
              bgcolor: t.border,
              mx: 0.5,
              flexShrink: 0,
            }}
          />
          {/* M3 segmented buttons — view-mode toggle. Persisted via
              localStorage so user preference sticks across sessions. */}
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
              Published Articles tables. Content type folds into the Article
              cell's secondary line, so this table no longer carries a
              standalone Type column. */}
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: W.article }}>Article</TableCell>
              <TableCell sx={{ width: W.market }}>Country</TableCell>
              <TableCell sx={{ width: W.status }}>Status</TableCell>
              <TableCell sx={{ width: W.submittedBy }}>Submitted by</TableCell>
              <TableCell sx={{ width: W.when }}>Submitted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={20} sx={{ color: t.slate }} />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <Stack alignItems="center" spacing={1.5}>
                    <Typography color="text.secondary" variant="body2">
                      {articles.length === 0
                        ? "No pre-published articles yet."
                        : "No articles match your filters."}
                    </Typography>
                    {hasAnyFilter && (
                      <Button size="small" onClick={clearAll}>
                        Clear filters
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((a) => {
                const meta = STATUS_META[a.status];
                return (
                  <TableRow
                    key={a.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/articles/${a.id}`)}
                  >
                    {/* 1 · Article — title + id/contentType secondary line. */}
                    <TableCell sx={{ maxWidth: ARTICLE_CELL_MAX_WIDTH }}>
                      <Typography
                        sx={{
                          fontSize: "0.9375rem",
                          fontWeight: 500,
                          color: t.ink,
                        }}
                      >
                        {a.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: theme.palette.fonts.mono,
                          fontSize: "0.6875rem",
                          color: t.granite,
                          mt: 0.25,
                        }}
                      >
                        {a.id} · {a.contentType}
                        {a.sector ? ` · ${sectorShortLabel(a.sector)}` : ""}
                      </Typography>
                    </TableCell>
                    {/* 2 · Country. */}
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          fontFamily: theme.palette.fonts.mono,
                          fontSize: "0.6875rem",
                          color: t.slate,
                        }}
                      >
                        {localeFor(a.market)}
                      </Box>
                    </TableCell>
                    {/* 3 · Status. */}
                    <TableCell>
                      <Chip
                        icon={meta.icon as React.ReactElement}
                        label={meta.label}
                        color={meta.color}
                        size="small"
                      />
                    </TableCell>
                    {/* 4 · Submitted by. */}
                    <TableCell>
                      <Typography
                        sx={{
                          fontSize: "0.875rem",
                          color: t.ink,
                          lineHeight: 1.3,
                        }}
                      >
                        {a.submittedBy.name}
                      </Typography>
                    </TableCell>
                    {/* 5 · Submitted (when). */}
                    <TableCell>
                      <Tooltip
                        title={new Date(a.submittedAt).toLocaleDateString(
                          "en-US",
                          { month: "long", day: "numeric", year: "numeric" },
                        )}
                      >
                        <Box>
                          <Typography
                            sx={{ fontSize: "0.875rem", color: t.ink }}
                          >
                            {formatDate(a.submittedAt)}
                          </Typography>
                          <Typography
                            sx={{ fontSize: "0.75rem", color: t.granite }}
                          >
                            {daysAgo(a.submittedAt)}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* ─── Board view ─── */}
      {viewMode === "board" && (
        <BoardView
          articles={filtered}
          loading={loading}
          onCardClick={(a) => navigate(`/articles/${a.id}`)}
        />
      )}

      {/* Pagination only renders in table view — board shows everything and
          relies on lane-internal scroll for tall stacks. */}
      {viewMode === "table" && filtered.length > 0 && (
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          spacing={0.5}
          sx={{
            mt: 2.5,
            // Material 3 data-table pagination strip sits on a tinted footer.
            // The strip doesn't span the entire table width — it hugs the right
            // edge with the rows-per-page label flowing into the chevrons.
            color: t.slate,
          }}
        >
          {/* Range readout — M3 prefers "1–15 of 47" rows over "Page 1 of 4"
              because it conveys the actual slice. We render both pieces. */}
          <Typography sx={{ fontSize: "0.8125rem", color: t.slate, mr: 1.5 }}>
            <Box component="span" sx={{ color: t.ink, fontWeight: 500 }}>
              {safePage * PAGE_SIZE + 1}
              {"–"}
              {Math.min(filtered.length, (safePage + 1) * PAGE_SIZE)}
            </Box>{" "}
            of {filtered.length}
          </Typography>
          <IconButton
            size="small"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <IconButton
            size="small"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage(safePage + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// Board view — Notion-style Kanban grouped by article status
// ────────────────────────────────────────────────────────────
// Three fixed lanes in workflow order (needs-review → needs-info →
// rejected). Approval is no longer a draft state — approving an article
// publishes it atomically, moving the source out of this tab entirely.
// Lanes lay out horizontally and overflow-scroll on narrow viewports;
// each lane stack scrolls vertically when it grows tall.
// ════════════════════════════════════════════════════════════
const BOARD_LANE_ORDER: Exclude<ArticleStatus, "published">[] = [
  "needs-review",
  "needs-info",
  "rejected",
];

/**
 * M3 filter-chip cluster for article status. Replaces the prior FilterSelect
 * dropdown — chips show the option AND its count, and tap-to-toggle reads
 * faster than open-menu-select-close for a short fixed option set.
 */
function StatusChipFilter({
  value,
  onChange,
  counts,
}: {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
  counts: {
    total: number;
    "needs-review": number;
    "needs-info": number;
    rejected: number;
  };
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  // Workflow order so the eye reads left → right as "actionable → done."
  // Approval is no longer a draft state — approving publishes atomically
  // and moves the article out of this tab.
  const options: Array<{
    key: StatusFilter;
    label: string;
    count: number;
    accent: string;
  }> = [
    { key: "all", label: "All", count: counts.total, accent: t.pepsiBlue },
    {
      key: "needs-review",
      label: "Needs review",
      count: counts["needs-review"],
      accent: t.emberStrong,
    },
    {
      key: "needs-info",
      label: "Needs info",
      count: counts["needs-info"],
      accent: t.infoInk,
    },
    {
      key: "rejected",
      label: "Rejected",
      count: counts.rejected,
      accent: t.errorInk,
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

function BoardView({
  articles,
  loading,
  onCardClick,
}: {
  articles: Article[];
  loading: boolean;
  onCardClick: (a: Article) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  // Bucket the filtered set once. Order within each lane mirrors the
  // table's default sort (newest submitted first). The page filters
  // status="published" out upstream, so the three draft lanes cover
  // everything that reaches the board.
  const grouped = useMemo(() => {
    const map: Record<Exclude<ArticleStatus, "published">, Article[]> = {
      "needs-review": [],
      "needs-info": [],
      rejected: [],
    };
    articles.forEach((a) => {
      if (a.status !== "published") map[a.status].push(a);
    });
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
        // Subtle inner scrollbar styling so horizontal overflow looks
        // intentional rather than scrappy.
        scrollbarWidth: "thin",
      }}
    >
      {BOARD_LANE_ORDER.map((status) => (
        <BoardLane
          key={status}
          status={status}
          articles={grouped[status]}
          onCardClick={onCardClick}
        />
      ))}
    </Box>
  );
}

function BoardLane({
  status,
  articles,
  onCardClick,
}: {
  status: Exclude<ArticleStatus, "published">;
  articles: Article[];
  onCardClick: (a: Article) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const meta = STATUS_META[status];

  // Lane accent color picked off the status chip's MUI color so the lane
  // header + count badge read as the same family as the status everywhere
  // else in the app.
  const accent =
    status === "needs-review"
      ? t.emberStrong
      : status === "needs-info"
        ? t.infoInk
        : t.errorInk; // rejected

  return (
    <Box
      sx={{
        width: 300,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        // Capped height so a single very long lane doesn't push the
        // whole page taller than the viewport. The lane body scrolls.
        maxHeight: "calc(100vh - 360px)",
        minHeight: 200,
      }}
    >
      {/* Lane header — label + count. Count uses the status accent so the
          eye can pre-attentively see "where the volume is." */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          mb: 1.5,
          px: 0.5,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: t.ink,
            letterSpacing: "0.01em",
          }}
        >
          {meta.label}
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

      {/* Lane body — vertical card stack, scrollable when overflowing. */}
      <Stack
        spacing={1.25}
        sx={{
          flex: 1,
          overflowY: "auto",
          pr: 0.5,
          // Tiny extra padding-bottom so the last card has breathing room
          // against the lane's scroll edge.
          pb: 1,
        }}
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
            Nothing in {meta.label.toLowerCase()}.
          </Typography>
        ) : (
          articles.map((a) => (
            <BoardCard key={a.id} article={a} onClick={() => onCardClick(a)} />
          ))
        )}
      </Stack>
    </Box>
  );
}

function BoardCard({
  article,
  onClick,
}: {
  article: Article;
  onClick: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  // Issue count derived from non-dismissed compliance issues, matching the
  // EditDock's suggestion badge. Surfaced on the card so reviewers can spot
  // "this one has stuff to look at" without opening the article.
  const liveIssues = (article.complianceIssues ?? []).filter(
    (i) => !i.dismissed,
  );
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
      {/* Top metadata row — content type + locale + id. Mono so it reads as
          a technical/identifier strip, parallel to the table's secondary
          line under the article title. */}
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

      {/* Title — 2-line clamp so cards stay a predictable height. */}
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

      {/* Optional signal row — auto-approve flag and/or compliance count.
          Only renders when there's something to show, so calm cards stay
          calm and noisy cards earn the extra height. */}
      {(article.autoApproveCandidate || liveIssues.length > 0) && (
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
        >
          {article.autoApproveCandidate && (
            <Chip
              label="Safe to approve"
              size="small"
              color="success"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.6875rem" }}
            />
          )}
          {liveIssues.length > 0 && (
            <Chip
              label={`${liveIssues.length} issue${liveIssues.length === 1 ? "" : "s"}`}
              size="small"
              variant="outlined"
              sx={{
                height: 20,
                fontSize: "0.6875rem",
                borderColor: t.border,
                color: t.slate,
              }}
            />
          )}
        </Stack>
      )}

      {/* Footer — submitted-by name + submitted age. Mirrors the Submitted
          by / Submitted columns from the table. Pushed to the bottom of the
          card so all cards in a lane share a baseline. */}
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
          {article.submittedBy.name}
        </Typography>
        <Tooltip
          title={new Date(article.submittedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: t.granite,
              flexShrink: 0,
            }}
          >
            {daysAgo(article.submittedAt)}
          </Typography>
        </Tooltip>
      </Stack>
    </Box>
  );
}

// Metric helper removed — the standalone metric row it powered was deleted
// in the M3 cleanup pass. If a summary widget needs to come back here,
// reach for the M3 "info chip" pattern or pull StatusChipFilter directly
// rather than reviving the standalone metric.
