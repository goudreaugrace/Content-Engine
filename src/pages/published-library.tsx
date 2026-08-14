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
  TablePagination,
  TableRow,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Tooltip,
  Tabs,
  Tab,
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
  type Article,
  type ArticleStatus,
  type PublishedArticle,
} from "../lib/api";
import { localeFor } from "../lib/market";
import { usePersonaMode } from "../lib/persona";
import { getViewingContentOwner, setViewingContentOwner } from "../lib/content-owner-view";
import { sectorShortLabel } from "../lib/sector";
import {
  ARTICLE_TABLE_COL_WIDTHS as W,
  ARTICLE_CELL_MAX_WIDTH,
  ARTICLE_TABLE_SX,
} from "../lib/article-table";
import { KpiRow, KpiItem } from "../components/kpi-row";
import FilterSelect from "../components/filter-select";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";

type StalenessFilter = "all" | "fresh" | "aging" | "stale" | "archived";
type ActionFilter = "all" | "consolidate" | "standardize" | "archive" | "mark-reviewed" | "noop";
type AdminHealthFilter = "watchlist" | "critical" | "extremely-old" | "low-traffic" | "declining" | "all";
type AdminAlertAction = "review" | "update" | "archive" | "consolidate";

type NonAdminWorkflowStatus = ArticleStatus | "stale";
type NonAdminStatusFilter = "all" | NonAdminWorkflowStatus;

const NON_ADMIN_USER = "Demo User";
const NON_ADMIN_REPORTS = new Set(["Test", "Demo", "Test Author"]);
const NON_ADMIN_AUTHORS = new Set([NON_ADMIN_USER, ...NON_ADMIN_REPORTS]);
const NON_ADMIN_OWNER_LABELS: Record<string, string> = {
  "Demo User": "Maya Johnson",
  Test: "Jordan Lee",
  Demo: "Avery Patel",
  "Test Author": "Sofia Ramirez",
};
const NON_ADMIN_TRANSFER_OWNERS = [
  { name: "Demo User", email: "content-owner@pepsico.com" },
  { name: "Test", email: "jordan.lee@pepsico.com" },
  { name: "Demo", email: "avery.patel@pepsico.com" },
  { name: "Test Author", email: "sofia.ramirez@pepsico.com" },
];
const TEAM_ARTICLES_PER_PAGE = 15;

function nonAdminOwnerLabel(owner: string): string {
  return NON_ADMIN_OWNER_LABELS[owner] ?? owner;
}

function nonAdminStatusLabel(status: NonAdminWorkflowStatus): string {
  return {
    "needs-review": "In review",
    stale: "Stale",
    "needs-info": "Changes requested",
    rejected: "Rejected",
    published: "Published",
  }[status];
}

function nonAdminWorkflowStatus(
  article: Article,
  publishedById: Map<string, PublishedArticle>,
  publishedBySourceId: Map<string, PublishedArticle>,
): NonAdminWorkflowStatus {
  if (article.status !== "published") return article.status;
  const published =
    (article.publishedArticleId ? publishedById.get(article.publishedArticleId) : undefined) ??
    publishedBySourceId.get(article.id);
  return published?.staleness.level === "stale" ? "stale" : "published";
}

const NON_ADMIN_STATUS_ORDER: NonAdminWorkflowStatus[] = [
  "needs-review",
  "stale",
  "published",
  "needs-info",
  "rejected",
];

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

function daysSinceDate(iso?: string): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)));
}

function adminReviewAge(article: PublishedArticle): number {
  return daysSinceDate(article.lastReviewedAt ?? article.publishedAt);
}

function adminIsExtremelyOld(article: PublishedArticle): boolean {
  return adminReviewAge(article) >= 365;
}

function adminIsLowTraffic(article: PublishedArticle): boolean {
  return article.metrics.views30d < 30;
}

function adminIsCritical(article: PublishedArticle): boolean {
  return (
    article.staleness.level === "stale" ||
    adminIsExtremelyOld(article) ||
    (article.metrics.views30d < 10 && article.metrics.trend === "down")
  );
}

function adminNeedsWatch(article: PublishedArticle): boolean {
  if (article.staleness.level === "archived") return false;
  return (
    adminIsCritical(article) ||
    article.staleness.level === "aging" ||
    adminIsLowTraffic(article) ||
    article.metrics.trend === "down" ||
    ["archive", "mark-reviewed", "consolidate", "standardize"].includes(article.recommendation?.kind ?? "")
  );
}

function adminHealthSignals(article: PublishedArticle): Array<{ label: string; severity: "high" | "medium" | "low" }> {
  const signals: Array<{ label: string; severity: "high" | "medium" | "low" }> = [];
  const reviewAge = adminReviewAge(article);
  if (article.staleness.level === "stale") signals.push({ label: "Stale", severity: "high" });
  else if (article.staleness.level === "aging") signals.push({ label: "Review due soon", severity: "medium" });
  if (reviewAge >= 365 && Number.isFinite(reviewAge)) signals.push({ label: `${Math.round(reviewAge / 30)}mo since review`, severity: "high" });
  if (article.metrics.views30d < 10) signals.push({ label: "Very low traffic", severity: "high" });
  else if (article.metrics.views30d < 30) signals.push({ label: "Below traffic target", severity: "medium" });
  if (article.metrics.trend === "down") signals.push({ label: "Declining", severity: "medium" });
  if (article.recommendation?.kind === "archive") signals.push({ label: "Archive candidate", severity: "high" });
  if (article.recommendation?.kind === "consolidate") signals.push({ label: "Duplicate overlap", severity: "medium" });
  if (article.recommendation?.kind === "standardize") signals.push({ label: "Needs standardization", severity: "medium" });
  return signals.length > 0 ? signals : [{ label: "Healthy", severity: "low" }];
}

function defaultAdminAlertAction(article: PublishedArticle): AdminAlertAction {
  if (article.recommendation?.kind === "archive" || article.metrics.views30d < 10) return "archive";
  if (article.recommendation?.kind === "consolidate") return "consolidate";
  if (article.staleness.level === "stale" || adminIsExtremelyOld(article)) return "review";
  return "update";
}

function adminAlertActionLabel(action: AdminAlertAction): string {
  return {
    review: "Review article",
    update: "Update article",
    archive: "Remove or archive",
    consolidate: "Consolidate duplicates",
  }[action];
}

function defaultAdminAlertReason(article: PublishedArticle, action: AdminAlertAction): string {
  const signals = adminHealthSignals(article)
    .filter((signal) => signal.label !== "Healthy")
    .slice(0, 3)
    .map((signal) => signal.label.toLowerCase())
    .join(", ");
  const intro = signals || "content health review needed";
  return `This article was flagged for ${intro}. Please ${adminAlertActionLabel(action).toLowerCase()} and confirm the right next step.`;
}

/**
 * Phase F — tabbed Articles shell. "Published" lost its top-level page status
 * when we collapsed the two browse surfaces (drafts + published) into a single
 * "Articles" tab in the sidebar. This file now exports:
 *   - PublishedLibrary  → the page shell with sub-tabs + shared header
 *   - PublishedTab      → the existing published-articles list (header removed)
 */
type ArticlesSubTab = "my-articles" | "published";

export default function PublishedLibrary() {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: ArticlesSubTab =
    tabParam === "my-articles" || tabParam === "needs-review" ? "my-articles" : "published";

  const setTab = (next: ArticlesSubTab) => {
    const sp = new URLSearchParams(searchParams);
    if (next === "published") sp.delete("tab");
    else sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  const [myCount, setMyCount] = useState<number | null>(null);
  const [pubCount, setPubCount] = useState<number | null>(null);
  const [personaMode] = usePersonaMode();
  const isSuperAdmin = personaMode === "super-admin";

  if (personaMode === "non-admin") {
    return <NonAdminArticlesPage />;
  }

  return (
    <Box sx={{ maxWidth: 1520, mx: "auto" }}>
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
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Typography variant="h4" component="h1">
              All Articles
            </Typography>
            {isSuperAdmin && (
              <Chip
                size="small"
                label="Super Admin"
                sx={{ bgcolor: t.pepsiBlueSubtle, color: t.pepsiBlueStrong, fontWeight: 600 }}
              />
            )}
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: "62ch" }}>
            {isSuperAdmin
              ? "Monitor organization-wide content health, spot owner follow-ups, and keep published knowledge current."
              : "This team-approval workspace is ready to be refined around the articles and people an admin supports."}
          </Typography>
        </Box>
        {/* Persistent admin action row — article creation belongs to Content Owners. */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexShrink: 0 }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<EmailOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate("/admin/emails")}
            sx={{ whiteSpace: "nowrap" }}
          >
            Email log
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ mt: 4 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setTab(v as ArticlesSubTab)}
          sx={{
            display: "inline-flex", minHeight: 0, borderBottom: `1px solid ${t.border}`, mb: 3,
            "& .MuiTab-root": { textTransform: "none", fontSize: "0.875rem", fontWeight: 500, minHeight: 0, py: 1.25, px: 0, mr: 4, color: t.slate, "&.Mui-selected": { color: t.ink } },
            "& .MuiTabs-indicator": { bgcolor: t.ink, height: 2 },
          }}
        >
          <Tab value="published" label={<Stack direction="row" spacing={1} alignItems="baseline"><span>Published health</span>{pubCount !== null && <Box component="span" sx={{ fontFamily: theme.palette.fonts.mono, fontSize: "0.6875rem", color: t.granite }}>{pubCount}</Box>}</Stack>} />
          <Tab value="my-articles" label={<Stack direction="row" spacing={1} alignItems="baseline"><span>Team articles</span>{myCount !== null && <Box component="span" sx={{ fontFamily: theme.palette.fonts.mono, fontSize: "0.6875rem", color: t.granite, fontWeight: 600 }}>{myCount}</Box>}</Stack>} />
        </Tabs>
        {activeTab === "my-articles" ? <NonAdminArticlesPage embedded onLoaded={setMyCount} /> : <PublishedTab onLoaded={setPubCount} />}
      </Box>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────
// Content Owner / Team Admin article list. Content Owners see only their
// own work; the embedded Team Admin view includes direct reports.
// ────────────────────────────────────────────────────────────
function NonAdminArticlesPage({
  embedded = false,
  onLoaded,
}: {
  embedded?: boolean;
  onLoaded?: (count: number) => void;
} = {}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const isTeamView = embedded;
  const [articles, setArticles] = useState<Article[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NonAdminStatusFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [viewingOwner, setViewingOwner] = useState(getViewingContentOwner);
  const [page, setPage] = useState(0);
  const [transferArticle, setTransferArticle] = useState<Article | null>(null);
  const [transferOwner, setTransferOwner] = useState(NON_ADMIN_USER);
  const [transferSaving, setTransferSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [draftData, publishedData] = await Promise.all([
        api.listArticles(),
        api.listPublishedArticles(),
      ]);
      setArticles(draftData);
      setPublishedArticles(publishedData);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const publishedById = useMemo(() => {
    return new Map(publishedArticles.map((article) => [article.id, article]));
  }, [publishedArticles]);

  const publishedBySourceId = useMemo(() => {
    return new Map(publishedArticles.map((article) => [article.sourceArticleId, article]));
  }, [publishedArticles]);

  const scoped = useMemo(() => {
    const priority: Record<NonAdminWorkflowStatus, number> = {
      "needs-review": 0,
      stale: 1,
      published: 2,
      "needs-info": 3,
      rejected: 4,
    };
    return articles
      .filter((a) =>
        isTeamView
          ? NON_ADMIN_AUTHORS.has(a.submittedBy?.name ?? "")
          : a.submittedBy?.name === viewingOwner,
      )
      .sort((a, b) => {
        const reportA = NON_ADMIN_REPORTS.has(a.submittedBy?.name ?? "") ? -1 : 0;
        const reportB = NON_ADMIN_REPORTS.has(b.submittedBy?.name ?? "") ? -1 : 0;
        const statusA = nonAdminWorkflowStatus(a, publishedById, publishedBySourceId);
        const statusB = nonAdminWorkflowStatus(b, publishedById, publishedBySourceId);
        if (statusA === "needs-review" && statusB !== "needs-review") return -1;
        if (statusB === "needs-review" && statusA !== "needs-review") return 1;
        if (statusA === "stale" && statusB !== "stale") return -1;
        if (statusB === "stale" && statusA !== "stale") return 1;
        if (reportA !== reportB) return reportA - reportB;
        if (priority[statusA] !== priority[statusB]) return priority[statusA] - priority[statusB];
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
  }, [articles, isTeamView, publishedById, publishedBySourceId, viewingOwner]);

  useEffect(() => {
    onLoaded?.(scoped.length);
  }, [onLoaded, scoped.length]);

  const counts = useMemo(
    () => ({
      total: scoped.length,
      approvals: scoped.filter(
        (a) =>
          nonAdminWorkflowStatus(a, publishedById, publishedBySourceId) === "needs-review" &&
          (isTeamView
            ? NON_ADMIN_REPORTS.has(a.submittedBy?.name ?? "")
            : a.submittedBy?.name === viewingOwner),
      ).length,
      stale: scoped.filter(
        (a) => nonAdminWorkflowStatus(a, publishedById, publishedBySourceId) === "stale",
      ).length,
      published: scoped.filter(
        (a) => nonAdminWorkflowStatus(a, publishedById, publishedBySourceId) === "published",
      ).length,
    }),
    [scoped, isTeamView, publishedById, publishedBySourceId, viewingOwner],
  );

  const availableStatuses = useMemo(() => {
    const set = new Set<NonAdminWorkflowStatus>();
    scoped.forEach((a) => set.add(nonAdminWorkflowStatus(a, publishedById, publishedBySourceId)));
    return NON_ADMIN_STATUS_ORDER.filter((status) => set.has(status));
  }, [scoped, publishedById, publishedBySourceId]);

  const availableOwners = useMemo(() => {
    const set = new Set<string>();
    scoped.forEach((a) => set.add(a.submittedBy?.name ?? "Unknown"));
    return Array.from(set).sort((a, b) =>
      nonAdminOwnerLabel(a).localeCompare(nonAdminOwnerLabel(b)),
    );
  }, [scoped]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return scoped.filter((a) => {
      const owner = a.submittedBy?.name ?? "Unknown";
      const status = nonAdminWorkflowStatus(a, publishedById, publishedBySourceId);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (ownerFilter !== "all" && owner !== ownerFilter) return false;
      if (term) {
        const hay = `${a.title} ${a.contentType} ${owner} ${nonAdminOwnerLabel(owner)} ${nonAdminStatusLabel(status)} ${a.market}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [scoped, search, statusFilter, ownerFilter, publishedById, publishedBySourceId]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / TEAM_ARTICLES_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagedArticles = useMemo(
    () =>
      filtered.slice(
        currentPage * TEAM_ARTICLES_PER_PAGE,
        (currentPage + 1) * TEAM_ARTICLES_PER_PAGE,
      ),
    [currentPage, filtered],
  );

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, ownerFilter, viewingOwner]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setOwnerFilter("all");
  };

  const hasFilters =
    search.trim() !== "" || statusFilter !== "all" || (isTeamView && ownerFilter !== "all");

  const openTransfer = (article: Article) => {
    const currentOwner = article.submittedBy?.name ?? "";
    const nextOwner =
      NON_ADMIN_TRANSFER_OWNERS.find((owner) => owner.name !== currentOwner)?.name ??
      NON_ADMIN_USER;
    setTransferArticle(article);
    setTransferOwner(nextOwner);
  };

  const closeTransfer = () => {
    if (transferSaving) return;
    setTransferArticle(null);
  };

  const confirmTransfer = async () => {
    if (!transferArticle) return;
    const target = NON_ADMIN_TRANSFER_OWNERS.find((owner) => owner.name === transferOwner);
    if (!target) return;
    setTransferSaving(true);
    try {
      const updated = await api.transferArticleOwner(transferArticle.id, target);
      setArticles((prev) => prev.map((article) => (article.id === updated.id ? updated : article)));
      setError(null);
      setTransferArticle(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setTransferSaving(false);
    }
  };

  const transferTargets = transferArticle
    ? NON_ADMIN_TRANSFER_OWNERS.filter(
        (owner) => owner.name !== (transferArticle.submittedBy?.name ?? ""),
      )
    : NON_ADMIN_TRANSFER_OWNERS;

  return (
    <Box sx={{ maxWidth: embedded ? "none" : 1440, mx: embedded ? 0 : "auto" }}>
      {!embedded && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "flex-start", md: "flex-end" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              <Typography variant="h4" component="h1">
                My Articles
              </Typography>
              <TextField
                select
                size="small"
                label="POC: View as content owner"
                value={viewingOwner}
                onChange={(event) => {
                  setViewingOwner(event.target.value);
                  setViewingContentOwner(event.target.value);
                }}
                sx={{ minWidth: 240 }}
                SelectProps={{ MenuProps: { PaperProps: { sx: { mt: 0.5 } } } }}
              >
                {NON_ADMIN_TRANSFER_OWNERS.map((owner) => (
                  <MenuItem key={owner.name} value={owner.name}>
                    {nonAdminOwnerLabel(owner.name)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: "62ch" }}>
              Track your article status, keep your knowledge current, and respond to review feedback in one place.
            </Typography>
          </Box>
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
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: embedded ? 0 : 4 }}>
        <KpiRow>
        <KpiItem label={isTeamView ? "Team articles" : "My articles"} value={counts.total} />
        <KpiItem
          label={isTeamView ? "Team approvals" : "Awaiting approval"}
          value={counts.approvals}
          accent={counts.approvals > 0 ? t.ember : undefined}
        />
        <KpiItem
          label="Stale reviews"
          value={counts.stale}
          accent={counts.stale > 0 ? t.errorInk : undefined}
        />
        <KpiItem label="Published" value={counts.published} />
      </KpiRow>
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ md: "center" }}
        sx={{ mt: 4, mb: 1.5 }}
      >
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as NonAdminStatusFilter)}
          options={[
            { value: "all", label: `All statuses (${scoped.length})` },
            ...availableStatuses.map((status) => ({
              value: status,
              label: `${nonAdminStatusLabel(status)} (${
                scoped.filter(
                  (a) => nonAdminWorkflowStatus(a, publishedById, publishedBySourceId) === status,
                ).length
              })`,
            })),
          ]}
        />
        {isTeamView && (
          <FilterSelect
            label="Owner"
            value={ownerFilter}
            onChange={setOwnerFilter}
            options={[
              { value: "all", label: `All owners (${scoped.length})` },
              ...availableOwners.map((owner) => ({
                value: owner,
                label: `${nonAdminOwnerLabel(owner)} (${
                  scoped.filter((a) => (a.submittedBy?.name ?? "Unknown") === owner).length
                })`,
              })),
            ]}
          />
        )}
        {hasFilters && (
          <Button size="small" onClick={clearFilters} sx={{ color: t.slate }}>
            Clear
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: "100%", md: 240 } }}
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
      </Stack>

      <TableContainer>
        <Table sx={ARTICLE_TABLE_SX}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: W.article }}>Article</TableCell>
              <TableCell sx={{ width: W.status }}>Status</TableCell>
              <TableCell sx={{ width: W.submittedBy }}>Owner</TableCell>
              <TableCell sx={{ width: W.market }}>Sector</TableCell>
              <TableCell sx={{ width: W.when }}>Updated</TableCell>
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
                  <Typography color="text.secondary" variant="body2">
                    No articles match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pagedArticles.map((article) => {
                const status = nonAdminWorkflowStatus(article, publishedById, publishedBySourceId);
                const published =
                  (article.publishedArticleId ? publishedById.get(article.publishedArticleId) : undefined) ??
                  publishedBySourceId.get(article.id);
                return (
                  <NonAdminArticleRow
                    key={article.id}
                    article={article}
                    status={status}
                    canTransfer={isTeamView}
                    onTransfer={() => openTransfer(article)}
                    onOpen={() =>
                      published
                        ? navigate(`/my-articles/${published.id}`)
                        : navigate(`/articles/${article.id}`)
                    }
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {filtered.length > TEAM_ARTICLES_PER_PAGE && (
        <TablePagination
          component="div"
          count={filtered.length}
          page={currentPage}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={TEAM_ARTICLES_PER_PAGE}
          rowsPerPageOptions={[TEAM_ARTICLES_PER_PAGE]}
          labelRowsPerPage=""
          labelDisplayedRows={({ from, to, count }) =>
            `${from}\u2013${to} of ${count} team articles`
          }
          sx={{
            borderTop: `1px solid ${t.border}`,
            "& .MuiTablePagination-toolbar": { px: 0 },
            "& .MuiTablePagination-selectLabel, & .MuiTablePagination-select": {
              display: "none",
            },
          }}
        />
      )}

      <Dialog open={Boolean(transferArticle)} onClose={closeTransfer} maxWidth="xs" fullWidth>
        <DialogTitle>Transfer ownership</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Reassign this article when an owner changes roles or leaves the team.
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            label="New owner"
            value={transferOwner}
            onChange={(e) => setTransferOwner(e.target.value)}
            sx={{ mt: 2 }}
          >
            {transferTargets.map((owner) => (
              <MenuItem key={owner.name} value={owner.name}>
                {nonAdminOwnerLabel(owner.name)}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTransfer} disabled={transferSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmTransfer}
            disabled={transferSaving || !transferOwner}
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function NonAdminArticleRow({
  article,
  status,
  canTransfer,
  onTransfer,
  onOpen,
}: {
  article: Article;
  status: NonAdminWorkflowStatus;
  canTransfer: boolean;
  onTransfer: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const owner = article.submittedBy?.name ?? "Unknown";
  const displayOwner = nonAdminOwnerLabel(owner);
  const needsApproval =
    status === "needs-review" && NON_ADMIN_REPORTS.has(owner);
  const needsStaleReview = status === "stale";

  return (
    <TableRow hover sx={{ cursor: "pointer" }} onClick={onOpen}>
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
          {article.id} · {article.contentType}
          {article.sector ? ` · ${sectorShortLabel(article.sector)}` : ""}
        </Typography>
      </TableCell>
      <TableCell>
        <ArticleStatusChip status={status} urgent={needsApproval || needsStaleReview} />
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
            {displayOwner}
          </Typography>
          {canTransfer && owner !== NON_ADMIN_USER && (
            <Tooltip title="Transfer ownership">
              <IconButton
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onTransfer();
                }}
                sx={{ p: 0.25, color: t.slate }}
              >
                <SwapHorizRoundedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell>
        <Box
          component="span"
          sx={{
            fontFamily: theme.palette.fonts.mono,
            fontSize: "0.6875rem",
            color: t.slate,
          }}
        >
          {sectorShortLabel(article.sector)}
        </Box>
      </TableCell>
      <TableCell>
        <Typography sx={{ fontSize: "0.875rem", color: t.ink }}>
          {daysAgo(article.submittedAt)}
        </Typography>
        <Typography sx={{ fontSize: "0.6875rem", color: t.granite }}>
          {formatDate(article.submittedAt)}
        </Typography>
      </TableCell>
    </TableRow>
  );
}

function ArticleStatusChip({
  status,
  urgent,
}: {
  status: NonAdminWorkflowStatus;
  urgent?: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const config: Record<NonAdminWorkflowStatus, { label: string; color: string; bg: string }> = {
    "needs-review": {
      label: urgent ? "Approval needed" : "In review",
      color: urgent ? t.emberStrong : t.ember,
      bg: t.emberBg,
    },
    stale: {
      label: "Stale",
      color: t.errorInk,
      bg: t.errorBg,
    },
    "needs-info": { label: "Changes Requested", color: t.granite, bg: t.surfaceContainerLow },
    rejected: { label: "Rejected", color: t.errorInk, bg: t.errorBg },
    published: { label: "Published", color: t.successInk, bg: t.successBg },
  };
  const c = config[status];
  return (
    <Chip
      size="small"
      label={c.label}
      sx={{
        height: 22,
        bgcolor: c.bg,
        color: c.color,
        fontSize: "0.6875rem",
        fontWeight: 600,
      }}
    />
  );
}

function statusLabel(status: ArticleStatus): string {
  return {
    "needs-review": "In review",
    "needs-info": "Changes Requested",
    rejected: "Rejected",
    published: "Published",
  }[status];
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
  const [countryFilter, setMarketFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<AdminHealthFilter>("watchlist");
  const [stalenessFilter, setStalenessFilter] = useState<StalenessFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [alertArticle, setAlertArticle] = useState<PublishedArticle | null>(null);
  const [alertAction, setAlertAction] = useState<AdminAlertAction>("review");
  const [alertReason, setAlertReason] = useState("");
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertedIds, setAlertedIds] = useState<Set<string>>(() => new Set());

  /**
   * Table / Board view toggle, mirroring the Pre-published tab. Persisted
   * per-user in localStorage under a separate key so a writer can prefer
   * Board for drafts and Table for published (or vice versa) without one
   * choice forcing the other.
   */
  const [viewMode, setViewMode] = useState<"table" | "board">(() => {
    if (typeof window === "undefined") return "table";
    try {
      return localStorage.getItem("published-health-view-v1") === "board"
        ? "board"
        : "table";
    } catch {
      return "table";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("published-health-view-v1", viewMode);
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

  const availableCountries = useMemo(() => {
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
      if (countryFilter !== "all" && a.market !== countryFilter) return false;
      if (healthFilter === "watchlist" && !adminNeedsWatch(a)) return false;
      if (healthFilter === "critical" && !adminIsCritical(a)) return false;
      if (healthFilter === "extremely-old" && !adminIsExtremelyOld(a)) return false;
      if (healthFilter === "low-traffic" && !adminIsLowTraffic(a)) return false;
      if (healthFilter === "declining" && a.metrics.trend !== "down") return false;
      if (stalenessFilter !== "all" && a.staleness.level !== stalenessFilter)
        return false;
      if (actionFilter !== "all" && (a.recommendation?.kind ?? "noop") !== actionFilter)
        return false;
      return true;
    });
  }, [articles, search, countryFilter, sectorFilter, healthFilter, stalenessFilter, actionFilter]);

  const counts = useMemo(
    () => ({
      total: articles.length,
      fresh: articles.filter((a) => a.staleness.level === "fresh").length,
      aging: articles.filter((a) => a.staleness.level === "aging").length,
      stale: articles.filter((a) => a.staleness.level === "stale").length,
      archived: articles.filter((a) => a.staleness.level === "archived").length,
      watchlist: articles.filter(adminNeedsWatch).length,
      critical: articles.filter(adminIsCritical).length,
      extremelyOld: articles.filter(adminIsExtremelyOld).length,
      lowTraffic: articles.filter(adminIsLowTraffic).length,
      declining: articles.filter((a) => a.metrics.trend === "down").length,
      ownerAlerts: articles.filter((a) => adminNeedsWatch(a) && !alertedIds.has(a.id)).length,
      consolidate: articles.filter((a) => a.recommendation?.kind === "consolidate").length,
      standardize: articles.filter((a) => a.recommendation?.kind === "standardize").length,
      archiveAction: articles.filter((a) => a.recommendation?.kind === "archive").length,
      reviewAction: articles.filter((a) => a.recommendation?.kind === "mark-reviewed").length,
      noAction: articles.filter((a) => (a.recommendation?.kind ?? "noop") === "noop").length,
    }),
    [articles, alertedIds],
  );

  const hasAnyFilter =
    search.trim() !== "" ||
    countryFilter !== "all" ||
    sectorFilter !== "all" ||
    healthFilter !== "watchlist" ||
    stalenessFilter !== "all" ||
    actionFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setMarketFilter("all");
    setSectorFilter("all");
    setHealthFilter("watchlist");
    setStalenessFilter("all");
    setActionFilter("all");
  };

  const openOwnerAlert = (article: PublishedArticle) => {
    const action = defaultAdminAlertAction(article);
    setAlertArticle(article);
    setAlertAction(action);
    setAlertReason(defaultAdminAlertReason(article, action));
  };

  const closeOwnerAlert = () => {
    if (alertSaving) return;
    setAlertArticle(null);
  };

  const updateAlertAction = (next: AdminAlertAction) => {
    setAlertAction(next);
    if (alertArticle) setAlertReason(defaultAdminAlertReason(alertArticle, next));
  };

  const sendOwnerAlert = async () => {
    if (!alertArticle) return;
    setAlertSaving(true);
    try {
      await api.sendOwnerAlert({
        articleId: alertArticle.sourceArticleId,
        articleTitle: alertArticle.title,
        ownerName: alertArticle.originalSubmittedBy.name,
        to: [alertArticle.originalSubmittedBy.email],
        action: alertAction,
        reason: alertReason,
      });
      setAlertedIds((prev) => new Set(prev).add(alertArticle.id));
      setAlertArticle(null);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setAlertSaving(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <KpiRow>
        <KpiItem label="Watchlist" value={counts.watchlist} accent={counts.watchlist > 0 ? t.ember : undefined} />
        <KpiItem label="Critical" value={counts.critical} accent={counts.critical > 0 ? t.errorInk : undefined} />
        <KpiItem label="Extremely old" value={counts.extremelyOld} accent={counts.extremelyOld > 0 ? t.errorInk : undefined} />
        <KpiItem label="Owner alerts" value={counts.ownerAlerts} accent={counts.ownerAlerts > 0 ? t.pepsiBlue : undefined} />
      </KpiRow>

      <Box
        sx={{
          mt: 3,
          p: 2,
          border: `1px solid ${t.border}`,
          borderRadius: 1,
          bgcolor: t.surfaceContainerLow,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Typography sx={{ fontWeight: 600, color: t.ink, fontSize: "0.9375rem" }}>
              Owner follow-up queue
            </Typography>
            <Typography sx={{ color: t.slate, fontSize: "0.8125rem", mt: 0.25 }}>
              Default view shows stale, old, low-traffic, declining, and recommendation-backed articles first.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={`${counts.lowTraffic} low traffic`} sx={{ bgcolor: t.mist, color: t.ink, fontSize: "0.6875rem" }} />
            <Chip size="small" label={`${counts.declining} declining`} sx={{ bgcolor: t.mist, color: t.ink, fontSize: "0.6875rem" }} />
          </Stack>
        </Stack>
      </Box>

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
          <FilterSelect
            label="Health"
            value={healthFilter}
            onChange={(v) => setHealthFilter(v as AdminHealthFilter)}
            options={[
              { value: "watchlist", label: `Watchlist (${counts.watchlist})` },
              { value: "critical", label: `Critical (${counts.critical})` },
              { value: "extremely-old", label: `Extremely old (${counts.extremelyOld})` },
              { value: "low-traffic", label: `Low traffic (${counts.lowTraffic})` },
              { value: "declining", label: `Declining (${counts.declining})` },
              { value: "all", label: `All articles (${counts.total})` },
            ]}
          />
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
            label="Recommended next step"
            value={actionFilter}
            onChange={(v) => setActionFilter(v as ActionFilter)}
            options={[
              { value: "all", label: `All actions (${counts.total})` },
              { value: "consolidate", label: `Consolidate (${counts.consolidate})` },
              { value: "standardize", label: `Standardize (${counts.standardize})` },
              { value: "archive", label: `Archive (${counts.archiveAction})` },
              { value: "mark-reviewed", label: `Review (${counts.reviewAction})` },
              { value: "noop", label: `No action (${counts.noAction})` },
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
            label="Country"
            value={countryFilter}
            onChange={setMarketFilter}
            options={[
              { value: "all", label: "All countries" },
              ...availableCountries.map((m) => ({
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
              Pre-published Articles tables. Cols 1-5 (Article · Country ·
              Staleness · Submitted by · When) are identical across all
              three; Views (30d) is this table's specialty. Archived state
              is now expressed via the Staleness chip, not a separate
              Lifecycle column. */}
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: W.article }}>Article</TableCell>
              <TableCell sx={{ width: W.submittedBy }}>Owner</TableCell>
              <TableCell sx={{ width: 220 }}>Watchouts</TableCell>
              <TableCell sx={{ width: W.when }}>Last reviewed</TableCell>
              <TableCell align="right" sx={{ width: W.trailing }}>Views (30d)</TableCell>
              <TableCell align="right" sx={{ width: W.trailing }}>Action</TableCell>
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
                <PublishedRow key={a.id} article={a} onAlert={openOwnerAlert} alerted={alertedIds.has(a.id)} />
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

      <Dialog open={Boolean(alertArticle)} onClose={closeOwnerAlert} maxWidth="sm" fullWidth>
        <DialogTitle>Send owner alert</DialogTitle>
        <DialogContent>
          {alertArticle && (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Send a focused follow-up to {alertArticle.originalSubmittedBy.name} for {alertArticle.title}.
              </Typography>
              <TextField
                select
                fullWidth
                size="small"
                label="Requested action"
                value={alertAction}
                onChange={(e) => updateAlertAction(e.target.value as AdminAlertAction)}
              >
                <MenuItem value="review">Review article</MenuItem>
                <MenuItem value="update">Update article</MenuItem>
                <MenuItem value="archive">Remove or archive</MenuItem>
                <MenuItem value="consolidate">Consolidate duplicates</MenuItem>
              </TextField>
              <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                label="Message"
                value={alertReason}
                onChange={(e) => setAlertReason(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeOwnerAlert} disabled={alertSaving}>Cancel</Button>
          <Button variant="contained" onClick={sendOwnerAlert} disabled={alertSaving || !alertReason.trim()}>
            Send alert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  function PublishedRow({ article, onAlert, alerted }: { article: PublishedArticle; onAlert: (article: PublishedArticle) => void; alerted: boolean }) {
    const theme = useTheme();
    const t = theme.palette.tokens;
    const signals = adminHealthSignals(article);
    const canAlert = adminNeedsWatch(article) && article.staleness.level !== "archived";
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
          {article.recommendation && article.recommendation.kind !== "noop" && (
            <Chip
              size="small"
              label={article.recommendation.actionLabel ?? article.recommendation.title}
              sx={{ mt: 0.75, height: 20, fontSize: "0.625rem", bgcolor: t.pepsiBlueSubtle, color: t.pepsiBlueStrong, fontWeight: 600 }}
            />
          )}
        </TableCell>
        <TableCell>
          <Typography sx={{ fontSize: "0.875rem", color: t.ink, lineHeight: 1.3 }}>
            {article.originalSubmittedBy.name}
          </Typography>
          <Typography sx={{ fontSize: "0.6875rem", color: t.granite, mt: 0.25 }}>
            {article.originalSubmittedBy.email}
          </Typography>
        </TableCell>
        <TableCell>
          <Stack spacing={0.75} alignItems="flex-start">
            <StalenessChip staleness={article.staleness} />
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {signals.slice(0, 3).map((signal) => (
                <Chip
                  key={signal.label}
                  size="small"
                  label={signal.label}
                  sx={{
                    height: 20,
                    fontSize: "0.625rem",
                    bgcolor:
                      signal.severity === "high"
                        ? t.errorBg
                        : signal.severity === "medium"
                          ? t.emberBg
                          : t.mist,
                    color:
                      signal.severity === "high"
                        ? t.errorInk
                        : signal.severity === "medium"
                          ? t.emberStrong
                          : t.slate,
                    fontWeight: 600,
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </TableCell>
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
            <Typography sx={{ fontSize: "0.875rem", color: t.granite }}>Never</Typography>
          )}
        </TableCell>
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
        <TableCell align="right">
          <Button
            size="small"
            variant={alerted ? "text" : "outlined"}
            disabled={!canAlert || alerted}
            onClick={(event) => {
              event.stopPropagation();
              onAlert(article);
            }}
            startIcon={!alerted ? <EmailOutlinedIcon sx={{ fontSize: 15 }} /> : undefined}
            sx={{ whiteSpace: "nowrap" }}
          >
            {alerted ? "Sent" : "Alert"}
          </Button>
        </TableCell>
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

      {/* Countries — only when set. Quiet chips row mirroring the Country
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
