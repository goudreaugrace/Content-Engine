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
  Tooltip,
  IconButton,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import ViewKanbanOutlinedIcon from "@mui/icons-material/ViewKanbanOutlined";
import {
  api,
  type ActivityAction,
  type ActivityEvent,
  type AttentionItem,
  type AttentionKind,
  type AttentionSeverity,
} from "../lib/api";
import { localeFor } from "../lib/market";
import { sectorShortLabel } from "../lib/sector";
import {
  ARTICLE_TABLE_COL_WIDTHS as W,
  ARTICLE_CELL_MAX_WIDTH,
  ARTICLE_TABLE_SX,
} from "../lib/article-table";
import { KpiRow, KpiItem } from "../components/kpi-row";
import { useActivity } from "../lib/use-activity";
import FilterSelect from "../components/filter-select";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import PublishOutlinedIcon from "@mui/icons-material/PublishOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

// ────────────────────────────────────────────────────────────
// Date helpers
// ────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
function daysAgo(iso: string) {
  const diff = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 30) return `${diff}d ago`;
  if (diff < 365) return `${Math.round(diff / 30)}mo ago`;
  return `${Math.round(diff / 365)}y ago`;
}
function nextReviewDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

// ────────────────────────────────────────────────────────────
// Filters
// ────────────────────────────────────────────────────────────
type KindFilter = "all" | AttentionKind;

/**
 * StatusFilter — mirrors the Status column in the table. Unifies the
 * draft statuses, staleness levels, and the job in-flight state into one
 * dropdown so the filter has 1:1 correspondence with what the column
 * actually renders.
 */
type StatusFilter =
  | "all"
  | "needs-review"
  | "needs-info"
  | "rejected"
  | "fresh"
  | "aging"
  | "stale"
  | "in-flight";

const STATUS_LABELS: Record<Exclude<StatusFilter, "all">, string> = {
  "needs-review": "Needs review",
  "needs-info": "Needs info",
  rejected: "Rejected",
  fresh: "Fresh",
  aging: "Aging",
  stale: "Stale",
  "in-flight": "In flight",
};

/** Display order on the filter dropdown — pre-published workflow first,
 *  then published cadence, then in-flight. Mirrors how a reviewer scans
 *  the queue in workflow order. */
const STATUS_FILTER_ORDER: Exclude<StatusFilter, "all">[] = [
  "needs-review",
  "needs-info",
  "rejected",
  "fresh",
  "aging",
  "stale",
  "in-flight",
];

/** Returns the normalized status key for an attention item, matching the
 *  Status chip rendered in the column. Returns null for items that don't
 *  fit any bucket (defensive — shouldn't happen in practice). */
function statusKeyOf(item: AttentionItem): Exclude<StatusFilter, "all"> | null {
  if (item.kind === "job") return "in-flight";
  if (item.kind === "draft") {
    return (item.draftStatus ?? null) as Exclude<StatusFilter, "all"> | null;
  }
  // published
  return (item.stalenessLevel ?? null) as Exclude<StatusFilter, "all"> | null;
}

// ────────────────────────────────────────────────────────────
// NeedsReviewTab — the merged "Review Cycle" experience, now rendered
// as the default tab of the All Articles page (see PublishedLibrary).
// Owns its own attention feed + filters + view mode; the shell page
// provides the H1, subtitle, and the persistent "Start review cycle"
// action button.
// ────────────────────────────────────────────────────────────
export function NeedsReviewTab({
  onLoaded,
}: {
  onLoaded?: (count: number) => void;
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;

  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recent activity feed — drives the "Activity since you were last here"
  // strip at the top of the page. The hook also powers the sidebar badge,
  // so calling it here keeps both surfaces in sync via the same
  // localStorage key + window event.
  const activity = useActivity();

  // Filters
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  /**
   * Table / Board view toggle. Persisted to localStorage per-user. Board view
   * groups items by severity (High · Medium · Low) — the primary signal on
   * this page and the one already reflected in the metric row above. Same
   * pattern as the Articles tabs; key is namespaced so the three toggles
   * don't trample each other.
   */
  const [viewMode, setViewMode] = useState<"table" | "board">(() => {
    if (typeof window === "undefined") return "table";
    try {
      return localStorage.getItem("review-cycle-view-v1") === "board"
        ? "board"
        : "table";
    } catch {
      return "table";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("review-cycle-view-v1", viewMode);
    } catch {
      /* localStorage unavailable — non-fatal */
    }
  }, [viewMode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listAttention();
      setItems(data);
      onLoaded?.(data.length);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [onLoaded]);

  // Faster polling while any job is in flight so the "Writing…" row transitions
  // to its finished article promptly.
  const hasInFlight = items.some(
    (i) => i.kind === "job" && i.reason === "Agents drafting now",
  );

  useEffect(() => {
    load();
    const id = setInterval(load, hasInFlight ? 2000 : 8000);
    return () => clearInterval(id);
  }, [load, hasInFlight]);

  // ── Derived data ──
  const counts = useMemo(
    () => ({
      total: items.length,
      high: items.filter((i) => i.severity === "high").length,
      medium: items.filter((i) => i.severity === "medium").length,
      low: items.filter((i) => i.severity === "low").length,
    }),
    [items],
  );

  // Per-status counts for the Status filter dropdown. Computed once over
  // the unfiltered set so the dropdown labels read "Needs review (12)"
  // regardless of which other filters are active.
  const statusCounts = useMemo(() => {
    const out: Partial<Record<Exclude<StatusFilter, "all">, number>> = {};
    for (const it of items) {
      const key = statusKeyOf(it);
      if (key) out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }, [items]);

  const availableMarkets = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add(i.market));
    return Array.from(set).sort();
  }, [items]);

  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.sector && set.add(i.sector));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return items.filter((it) => {
      if (kindFilter !== "all" && it.kind !== kindFilter) return false;
      if (statusFilter !== "all" && statusKeyOf(it) !== statusFilter) return false;
      if (sectorFilter !== "all" && it.sector !== sectorFilter) return false;
      if (marketFilter !== "all" && it.market !== marketFilter) return false;
      if (term) {
        const hay =
          `${it.title} ${it.who} ${it.contentType} ${it.reason}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [items, search, kindFilter, statusFilter, sectorFilter, marketFilter]);

  const hasAnyFilter =
    search.trim() !== "" ||
    kindFilter !== "all" ||
    statusFilter !== "all" ||
    sectorFilter !== "all" ||
    marketFilter !== "all";

  const clearAll = () => {
    setSearch("");
    setKindFilter("all");
    setStatusFilter("all");
    setSectorFilter("all");
    setMarketFilter("all");
  };

  const review = nextReviewDate();

  return (
    <Box>
      {/* ─────────── KPI row — priority buckets for the review workflow ─────────── */}
      <KpiRow>
        <KpiItem
          label="Next review"
          value={review.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}
        />
        <KpiItem
          label="High priority"
          value={counts.high}
          accent={counts.high > 0 ? t.ember : undefined}
        />
        <KpiItem label="Medium" value={counts.medium} />
        <KpiItem label="Total open" value={counts.total} />
      </KpiRow>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {/* ─────────── Filter toolbar ─────────── */}
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
          {/* Status filter — mirrors the Status column. Options derive
              from the unfiltered set so empty buckets don't clutter the
              dropdown (e.g., "Archived" never appears here because
              archived items are excluded from the attention feed). */}
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: `All statuses (${counts.total})` },
              ...STATUS_FILTER_ORDER.filter((k) => (statusCounts[k] ?? 0) > 0).map(
                (k) => ({
                  value: k,
                  label: `${STATUS_LABELS[k]} (${statusCounts[k]})`,
                }),
              ),
            ]}
          />
          <FilterSelect
            label="Source"
            value={kindFilter}
            onChange={(v) => setKindFilter(v as KindFilter)}
            options={[
              { value: "all", label: "All sources" },
              { value: "draft", label: "Pre-published drafts" },
              { value: "published", label: "Published articles" },
              { value: "job", label: "In-flight jobs" },
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
          {/* Divider between data controls (search/refresh) and view
              controls (table/board). Same pattern as the two Articles tabs. */}
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
              localStorage so user preference sticks across sessions. Board
              groups items by severity, mirroring the page's primary signal. */}
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

      <Typography sx={{ fontSize: "0.75rem", color: t.granite, mb: 2 }}>
        Showing {filtered.length}
        {hasAnyFilter ? ` of ${items.length}` : ""}{" "}
        {filtered.length === 1 ? "item" : "items"}
      </Typography>

      {/* ─────────── Table view ─────────── */}
      {viewMode === "table" && (
      <TableContainer>
        <Table sx={ARTICLE_TABLE_SX}>
          {/* Canonical column order — shared with the Pre-published and
              Published Articles tables. Cols 1-5 are identical across all
              three; specialty columns (Source for this table) come after.
              No trailing Open column — the whole row is clickable. */}
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: W.article }}>Article</TableCell>
              <TableCell sx={{ width: W.market }}>Market</TableCell>
              <TableCell sx={{ width: W.status }}>Status</TableCell>
              <TableCell sx={{ width: W.submittedBy }}>Submitted by</TableCell>
              <TableCell sx={{ width: W.when }}>Updated</TableCell>
              <TableCell sx={{ width: W.trailing }}>Source</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && items.length === 0 ? (
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
                      {items.length === 0
                        ? "Cycle is clear. Nothing waiting on you right now."
                        : "No items match your filters."}
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
              filtered.map((item) => (
                <AttentionRow key={`${item.kind}-${item.id}`} item={item} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* ─────────── Board view ─────────── */}
      {viewMode === "board" && (
        <ReviewCycleBoardView
          items={filtered}
          loading={loading}
          totalCount={items.length}
          hasAnyFilter={hasAnyFilter}
          onClearFilters={clearAll}
          onCardClick={(item) => navigate(item.linkTo)}
        />
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// RecentActivityStrip — top-of-page "what's changed since you were here"
// ────────────────────────────────────────────────────────────
// Surfaces unread state-change events (approvals, rejections, needs-info
// replies, publishes, archives, cadence resets). Click a row to jump to
// the affected article. "Mark all as seen" advances the lastSeen
// timestamp via the shared useActivity hook, which also drops the
// sidebar badge to zero (same localStorage key + custom event).
// ════════════════════════════════════════════════════════════
const ACTIVITY_ACTION_META: Record<
  ActivityAction,
  { label: string; icon: React.ReactNode; accentRef: "ink" | "ember" | "success" | "error" | "info" }
> = {
  submitted: {
    label: "submitted",
    icon: <EditOutlinedIcon sx={{ fontSize: 14 }} />,
    accentRef: "ink",
  },
  rejected: {
    label: "rejected",
    icon: <CloseIcon sx={{ fontSize: 14 }} />,
    accentRef: "error",
  },
  "needs-info": {
    label: "sent back",
    icon: <HelpOutlineIcon sx={{ fontSize: 14 }} />,
    accentRef: "ember",
  },
  published: {
    label: "published",
    icon: <PublishOutlinedIcon sx={{ fontSize: 14 }} />,
    accentRef: "success",
  },
  archived: {
    label: "archived",
    icon: <ArchiveOutlinedIcon sx={{ fontSize: 14 }} />,
    accentRef: "ink",
  },
  "marked-reviewed": {
    label: "marked still accurate",
    icon: <RestartAltIcon sx={{ fontSize: 14 }} />,
    accentRef: "info",
  },
};

function RecentActivityStrip({
  events,
  onOpen,
  onMarkAllSeen,
}: {
  events: ActivityEvent[];
  onOpen: (linkTo: string) => void;
  onMarkAllSeen: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const accent = (ref: ActivityAction): string => {
    const a = ACTIVITY_ACTION_META[ref];
    switch (a.accentRef) {
      case "success":
        return t.successInk;
      case "error":
        return t.errorInk;
      case "ember":
        return t.ember;
      case "info":
        return t.pepsiBlue;
      default:
        return t.slate;
    }
  };
  // Cap visible rows — strip should be quick to scan, not a feed view.
  const VISIBLE = 4;
  const visible = events.slice(0, VISIBLE);
  const overflow = events.length - visible.length;

  return (
    <Box
      sx={{
        mt: 3,
        p: 2,
        borderRadius: 2,
        bgcolor: t.surfaceContainerLow,
        border: `1px solid ${t.border}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ mb: 1.25 }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: t.ember,
          }}
        />
        <Typography
          variant="overline"
          sx={{
            color: t.slate,
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          Activity since you were last here · {events.length}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          onClick={onMarkAllSeen}
          sx={{
            color: t.slate,
            fontSize: "0.75rem",
            textTransform: "none",
            "&:hover": { color: t.ink, bgcolor: t.mist },
          }}
        >
          Mark all as seen
        </Button>
      </Stack>
      <Stack spacing={0.5}>
        {visible.map((ev) => (
          <Box
            key={ev.id}
            onClick={() => onOpen(ev.linkTo)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(ev.linkTo);
              }
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              py: 0.75,
              px: 1,
              borderRadius: 1.5,
              cursor: "pointer",
              transition: "background-color 120ms ease",
              "&:hover": { bgcolor: t.mist },
              "&:focus-visible": {
                outline: `2px solid ${t.pepsiBlue}`,
                outlineOffset: 1,
              },
            }}
          >
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                bgcolor: `${accent(ev.action)}1A`,
                color: accent(ev.action),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {ACTIVITY_ACTION_META[ev.action].icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: "0.8125rem",
                  color: t.ink,
                  lineHeight: 1.4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <Box component="strong" sx={{ fontWeight: 600 }}>
                  {ev.articleTitle}
                </Box>{" "}
                <Box component="span" sx={{ color: t.slate }}>
                  was {ACTIVITY_ACTION_META[ev.action].label} by {ev.actor}
                </Box>
                {ev.detail && (
                  <Box
                    component="span"
                    sx={{
                      color: t.granite,
                      fontStyle: "italic",
                      ml: 0.5,
                    }}
                  >
                    {" · "}
                    "{ev.detail}"
                  </Box>
                )}
              </Typography>
            </Box>
            <Tooltip
              title={new Date(ev.at).toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              })}
            >
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: t.granite,
                  flexShrink: 0,
                }}
              >
                {daysAgo(ev.at)}
              </Typography>
            </Tooltip>
          </Box>
        ))}
        {overflow > 0 && (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: t.granite,
              pl: 1,
              pt: 0.5,
            }}
          >
            + {overflow} more event{overflow === 1 ? "" : "s"} below in the list.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────
function MetaItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ display: "block", lineHeight: 1, mb: 0.5 }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "0.9375rem",
          fontWeight: 500,
          color: theme.palette.tokens.ink,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}


function AttentionRow({ item }: { item: AttentionItem }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <TableRow
      hover
      sx={{
        cursor: "pointer",
        bgcolor: item.kind === "job" ? t.pepsiBlueSubtle + "55" : undefined,
      }}
      onClick={() => navigate(item.linkTo)}
    >
      {/* 1 · Article — title + id/contentType secondary line. */}
      <TableCell sx={{ maxWidth: ARTICLE_CELL_MAX_WIDTH }}>
        <Typography
          sx={{ fontSize: "0.9375rem", fontWeight: 500, color: t.ink }}
        >
          {item.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.granite,
            mt: 0.25,
          }}
        >
          {item.id} · {item.contentType}
          {item.sector ? ` · ${sectorShortLabel(item.sector)}` : ""}
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
          {localeFor(item.market)}
        </Box>
        {item.countries.length > 0 && (
          <Typography
            sx={{ fontSize: "0.6875rem", color: t.granite, mt: 0.25 }}
          >
            {item.countries.slice(0, 3).join(", ")}
            {item.countries.length > 3 ? "…" : ""}
          </Typography>
        )}
      </TableCell>
      {/* 3 · Status — the state chip. */}
      <TableCell>
        <StatusChip item={item} />
      </TableCell>
      {/* 4 · Submitted by. */}
      <TableCell>
        <Typography sx={{ fontSize: "0.875rem", color: t.ink, lineHeight: 1.3 }}>
          {item.who}
        </Typography>
      </TableCell>
      {/* 5 · Updated — when the item last changed. */}
      <TableCell>
        <Tooltip
          title={new Date(item.asOf).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        >
          <Box>
            <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
              {formatDate(item.asOf)}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
              {daysAgo(item.asOf)}
            </Typography>
          </Box>
        </Tooltip>
      </TableCell>
      {/* 6 · Source — table-specific specialty (draft/published/job kind). */}
      <TableCell>
        <SourceBadge kind={item.kind} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Status chip — short canonical label, like the per-status chips on the
 * article-detail pages. The full reason from the server lives in a tooltip
 * so reviewers can hover to see "why" without the row growing tall.
 */
function StatusChip({ item }: { item: AttentionItem }) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  // Map the verbose server reason → a tight one- or two-word status label
  // plus colors. Falls back to a generic gray chip for anything new.
  let label = "Needs action";
  let color = t.slate;
  let bg = t.mist;

  if (item.reason.startsWith("Needs review")) {
    label = "Needs review";
    color = t.emberStrong;
    bg = "rgba(213, 110, 12, 0.10)";
  } else if (item.reason.startsWith("Ready to approve")) {
    label = "Ready";
    color = t.successInk;
    bg = t.successBg;
  } else if (item.reason.startsWith("Approved")) {
    label = "Approved";
    color = t.successInk;
    bg = t.successBg;
  } else if (item.reason.startsWith("Waiting on author")) {
    label = "Needs info";
    color = t.pepsiBlueStrong;
    bg = t.pepsiBlueSubtle;
  } else if (item.reason.startsWith("Rejected")) {
    label = "Rejected";
    color = t.errorInk;
    bg = "rgba(217, 48, 37, 0.08)";
  } else if (item.reason.startsWith("Agents drafting")) {
    label = "Drafting";
    color = t.pepsiBlueStrong;
    bg = t.pepsiBlueSubtle;
  } else if (
    item.reason.startsWith("Stale") ||
    item.reason.startsWith("Not reviewed")
  ) {
    label = "Stale";
    color = t.errorInk;
    bg = "rgba(217, 48, 37, 0.08)";
  } else if (item.reason.startsWith("Aging")) {
    label = "Aging";
    color = t.emberStrong;
    bg = "rgba(213, 110, 12, 0.10)";
  } else if (item.reason.startsWith("Marked for")) {
    label = "Action set";
    color = t.pepsiBlueStrong;
    bg = t.pepsiBlueSubtle;
  } else if (item.reason.startsWith("Failed")) {
    label = "Failed";
    color = t.errorInk;
    bg = "rgba(217, 48, 37, 0.08)";
  }

  return (
    <Tooltip title={item.reason} arrow>
      <Chip
        label={label}
        size="small"
        sx={{
          bgcolor: bg,
          color,
          fontWeight: 600,
          fontSize: "0.6875rem",
          height: 24,
          cursor: "inherit",
        }}
      />
    </Tooltip>
  );
}

function SourceBadge({ kind }: { kind: AttentionKind }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const label =
    kind === "draft"
      ? "Pre-published"
      : kind === "published"
        ? "Published"
        : "In flight";
  return (
    <Chip
      label={label}
      size="small"
      variant="outlined"
      sx={{
        height: 22,
        fontSize: "0.6875rem",
        borderColor: t.border,
        color: t.slate,
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════
// Board view — lanes by severity (High · Medium · Low)
// ────────────────────────────────────────────────────────────
// Severity is the primary signal on this page (the metric row above already
// highlights it), so the board uses it as the grouping axis. Cards carry
// the same fields as the table row: title + id/type, market locale, the
// reason chip, source badge, who, when.
// ════════════════════════════════════════════════════════════
const REVIEW_BOARD_LANE_ORDER: AttentionSeverity[] = [
  "high",
  "medium",
  "low",
];
const SEVERITY_LANE_LABELS: Record<AttentionSeverity, string> = {
  high: "High priority",
  medium: "Medium",
  low: "Low",
};

function ReviewCycleBoardView({
  items,
  loading,
  totalCount,
  hasAnyFilter,
  onClearFilters,
  onCardClick,
}: {
  items: AttentionItem[];
  loading: boolean;
  totalCount: number;
  hasAnyFilter: boolean;
  onClearFilters: () => void;
  onCardClick: (item: AttentionItem) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const grouped = useMemo(() => {
    const map: Record<AttentionSeverity, AttentionItem[]> = {
      high: [],
      medium: [],
      low: [],
    };
    items.forEach((it) => map[it.severity].push(it));
    return map;
  }, [items]);

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={20} sx={{ color: t.slate }} />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
          {totalCount === 0
            ? "Cycle is clear. Nothing waiting on you right now."
            : "No items match your filters."}
        </Typography>
        {hasAnyFilter && (
          <Button size="small" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
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
      {REVIEW_BOARD_LANE_ORDER.map((sev) => (
        <ReviewCycleBoardLane
          key={sev}
          severity={sev}
          items={grouped[sev]}
          onCardClick={onCardClick}
        />
      ))}
    </Box>
  );
}

function ReviewCycleBoardLane({
  severity,
  items,
  onCardClick,
}: {
  severity: AttentionSeverity;
  items: AttentionItem[];
  onCardClick: (item: AttentionItem) => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  // High = ember (the same "attention" accent the page already uses for the
  // high-priority dot in the metric row). Medium = pepsi blue. Low = slate.
  const accent =
    severity === "high"
      ? t.emberStrong
      : severity === "medium"
        ? t.pepsiBlue
        : t.slate;

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
          {SEVERITY_LANE_LABELS[severity]}
        </Typography>
        <Box
          sx={{
            minWidth: 22,
            height: 18,
            px: 0.75,
            borderRadius: 999,
            bgcolor: items.length === 0 ? t.mist : accent,
            color: items.length === 0 ? t.granite : "#FFFFFF",
            fontSize: "0.6875rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          {items.length}
        </Box>
      </Stack>

      <Stack
        spacing={1.25}
        sx={{ flex: 1, overflowY: "auto", pr: 0.5, pb: 1 }}
      >
        {items.length === 0 ? (
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
            Nothing at {SEVERITY_LANE_LABELS[severity].toLowerCase()} priority.
          </Typography>
        ) : (
          items.map((item) => (
            <ReviewCycleBoardCard
              key={`${item.kind}-${item.id}`}
              item={item}
              onClick={() => onCardClick(item)}
            />
          ))
        )}
      </Stack>
    </Box>
  );
}

function ReviewCycleBoardCard({
  item,
  onClick,
}: {
  item: AttentionItem;
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
        bgcolor:
          item.kind === "job" ? t.pepsiBlueSubtle + "55" : t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 2,
        cursor: "pointer",
        transition: "all 150ms cubic-bezier(0.22, 1, 0.36, 1)",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        "&:hover": {
          borderColor: t.borderStrong,
          bgcolor: item.kind === "job" ? t.pepsiBlueSubtle : t.mist,
        },
        "&:focus-visible": {
          outline: `2px solid ${t.pepsiBlue}`,
          outlineOffset: 2,
        },
      }}
    >
      {/* Identity strip — type + locale + id, mono so it reads as metadata. */}
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
          {item.contentType}
        </Box>
        <Box component="span">·</Box>
        <Box component="span">{localeFor(item.market)}</Box>
        {item.sector && (
          <>
            <Box component="span">·</Box>
            <Box component="span">{sectorShortLabel(item.sector)}</Box>
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
          {item.id}
        </Box>
      </Stack>

      {/* Title — 2-line clamp for predictable height. */}
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
        {item.title}
      </Typography>

      {/* Reason + source — the two chips that tell the reviewer "why does
          this need me, and where does it live?" Same components as the
          table row uses, so the visual vocabulary stays consistent. */}
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <StatusChip item={item} />
        <SourceBadge kind={item.kind} />
      </Stack>

      {/* Footer — who + when. Pushed to bottom so cards share a baseline. */}
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
          {item.who}
        </Typography>
        <Tooltip
          title={new Date(item.asOf).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        >
          <Typography
            sx={{ fontSize: "0.75rem", color: t.granite, flexShrink: 0 }}
          >
            {daysAgo(item.asOf)}
          </Typography>
        </Tooltip>
      </Stack>
    </Box>
  );
}
