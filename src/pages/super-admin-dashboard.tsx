import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import { usePersonaMode } from "../lib/persona";
import StoryUserSelect from "../components/story-user-select";

export type DetailKey = "discovery" | "governance" | "feedback" | "optimization" | "gaps";
type DiscoveryMetric = "success" | "ctr" | "bounce" | "quickReturn" | "reformulation";
export type RegionKey = "all" | "NA" | "LATAM" | "EMEA" | "APAC";
export type ActionCategory = "all" | "gaps" | "ownership" | "content-risk" | "feedback" | "reports" | "search";

type RegionSnapshot = {
  searchSuccess: number;
  referral: number;
  bounce: number;
  quickReturn: number;
  reformulation: number;
  aiCoverage: number;
  reviewCompliance: number;
  ownership: number;
  assigned: number;
  orphaned: number;
  due: number;
  overdue: number;
  highRisk: number;
  articleHelpfulness: number;
  geniusHelpfulness: number;
  askPepHelpfulness: number;
  incorrectRate: number;
  topReviewed: number;
  improvements: number;
  verified: number;
  gaps: number;
};

const dateRanges = [
  { value: "mtd", label: "Month to date" },
  { value: "30d", label: "Last 30 days" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ytd", label: "Year to date" },
];

// These codes intentionally match server/data/country-catalog.json.
const regionOptions: { value: RegionKey; label: string }[] = [
  { value: "all", label: "All regions" },
  { value: "NA", label: "North America (NA)" },
  { value: "LATAM", label: "Latin America (LATAM)" },
  { value: "EMEA", label: "Europe, Middle East & Africa (EMEA)" },
  { value: "APAC", label: "Asia Pacific (APAC)" },
];

const regionalMetrics: Record<RegionKey, RegionSnapshot> = {
  all: { searchSuccess: 74.8, referral: 42.8, bounce: 31.2, quickReturn: 11.6, reformulation: 14.9, aiCoverage: 86.1, reviewCompliance: 92.6, ownership: 94.2, assigned: 4808, orphaned: 296, due: 184, overdue: 37, highRisk: 8, articleHelpfulness: 81.4, geniusHelpfulness: 78.7, askPepHelpfulness: 75.2, incorrectRate: 1.8, topReviewed: 78, improvements: 31, verified: 18, gaps: 14 },
  NA: { searchSuccess: 76.8, referral: 44.9, bounce: 29.8, quickReturn: 10.8, reformulation: 13.7, aiCoverage: 88.2, reviewCompliance: 94.1, ownership: 95.4, assigned: 1597, orphaned: 77, due: 61, overdue: 11, highRisk: 2, articleHelpfulness: 83.0, geniusHelpfulness: 80.2, askPepHelpfulness: 77.1, incorrectRate: 1.5, topReviewed: 24, improvements: 10, verified: 7, gaps: 3 },
  LATAM: { searchSuccess: 72.6, referral: 40.7, bounce: 34.3, quickReturn: 12.9, reformulation: 16.8, aiCoverage: 82.7, reviewCompliance: 90.8, ownership: 91.9, assigned: 1149, orphaned: 101, due: 48, overdue: 10, highRisk: 3, articleHelpfulness: 79.1, geniusHelpfulness: 76.0, askPepHelpfulness: 72.8, incorrectRate: 2.1, topReviewed: 19, improvements: 7, verified: 4, gaps: 5 },
  EMEA: { searchSuccess: 74.1, referral: 41.8, bounce: 31.9, quickReturn: 11.7, reformulation: 15.1, aiCoverage: 85.9, reviewCompliance: 92.7, ownership: 93.8, assigned: 1059, orphaned: 70, due: 43, overdue: 9, highRisk: 2, articleHelpfulness: 81.5, geniusHelpfulness: 78.4, askPepHelpfulness: 74.9, incorrectRate: 1.7, topReviewed: 21, improvements: 8, verified: 5, gaps: 4 },
  APAC: { searchSuccess: 75.4, referral: 43.1, bounce: 30.7, quickReturn: 11.3, reformulation: 14.3, aiCoverage: 86.8, reviewCompliance: 91.6, ownership: 94.0, assigned: 1003, orphaned: 48, due: 32, overdue: 7, highRisk: 1, articleHelpfulness: 80.8, geniusHelpfulness: 79.1, askPepHelpfulness: 75.8, incorrectRate: 1.9, topReviewed: 14, improvements: 6, verified: 2, gaps: 2 },
};

const percent = (value: number) => `${value.toFixed(1)}%`;

function discoveryValue(metric: DiscoveryMetric, snapshot: RegionSnapshot) {
  const values: Record<DiscoveryMetric, number> = {
    success: snapshot.searchSuccess,
    ctr: snapshot.referral,
    bounce: snapshot.bounce,
    quickReturn: snapshot.quickReturn,
    reformulation: snapshot.reformulation,
  };
  return percent(values[metric]);
}

const discoveryMetrics: Record<
  DiscoveryMetric,
  { label: string; value: string; change: string; positive: boolean; helper: string; points: number[] }
> = {
  success: {
    label: "Search success",
    value: "74.8%",
    change: "+2.6 pp",
    positive: true,
    helper: "Estimated sessions that ended in a useful answer or article without an immediate failure signal.",
    points: [67, 69, 68, 71, 70, 73, 72, 74, 73, 75, 76, 75],
  },
  ctr: {
    label: "Content referral rate",
    value: "42.8%",
    change: "+1.4 pp",
    positive: true,
    helper: "Discovery sessions that produced an article or source-link click. Surface-specific CTR appears below.",
    points: [38, 39, 40, 39, 41, 40, 42, 41, 43, 42, 44, 43],
  },
  bounce: {
    label: "Bounce rate",
    value: "31.2%",
    change: "-0.8 pp",
    positive: true,
    helper: "Single-page sessions. Retained for trend context; a bounce can still represent a successful answer.",
    points: [35, 34, 35, 33, 34, 32, 33, 32, 31, 32, 31, 31],
  },
  quickReturn: {
    label: "Quick return",
    value: "11.6%",
    change: "-1.9 pp",
    positive: true,
    helper: "Article clicks followed by a rapid return to Search Results.",
    points: [16, 15, 15, 14, 15, 13, 14, 13, 12, 13, 12, 12],
  },
  reformulation: {
    label: "Query reformulation",
    value: "14.9%",
    change: "-0.7 pp",
    positive: true,
    helper: "Search sessions where an employee quickly rephrased the same intent.",
    points: [17, 16, 17, 16, 16, 15, 16, 15, 15, 16, 15, 15],
  },
};

const discoveryRows = [
  { surface: "All discovery", volume: "38,420 sessions", click: "42.8%", success: "74.8%", noAnswer: "8.7%" },
  { surface: "Genius", volume: "29,840 answers", click: "18.6%", success: "77.2%", noAnswer: "10.9%" },
  { surface: "Search Results", volume: "31,560 result pages", click: "48.9%", success: "72.4%", noAnswer: "—" },
  { surface: "Ask Pep", volume: "8,580 conversations", click: "27.1%", success: "70.8%", noAnswer: "15.7%" },
];

const maintainedPages = [
  ["Benefits enrollment hub", "People Operations", "8 cycles", "18 days early"],
  ["Code of Conduct", "Global Compliance", "7 cycles", "14 days early"],
  ["Corporate card requests", "Travel & Expense", "6 cycles", "12 days early"],
  ["Parental leave overview", "Global Benefits", "6 cycles", "11 days early"],
  ["Speak Up reporting", "Ethics & Compliance", "5 cycles", "9 days early"],
  ["Remote work guidance", "People Strategy", "5 cycles", "8 days early"],
  ["Expense report guide", "Travel & Expense", "5 cycles", "7 days early"],
  ["Manager onboarding", "Talent Management", "4 cycles", "6 days early"],
  ["Data privacy basics", "Privacy Office", "4 cycles", "5 days early"],
  ["Employee assistance program", "Global Benefits", "4 cycles", "4 days early"],
];

const overduePages = [
  ["Mexico payroll calendar", "Payroll Operations", "64 days", "8,420", "High"],
  ["Global relocation policy", "Mobility", "51 days", "6,180", "High"],
  ["Vendor onboarding", "Procurement", "47 days", "4,960", "Medium"],
  ["Leave request corrections", "People Operations", "42 days", "7,310", "High"],
  ["Plant visitor access", "Security", "39 days", "3,880", "Medium"],
  ["Tuition reimbursement", "Global Benefits", "35 days", "5,720", "Medium"],
  ["Travel exception process", "Travel & Expense", "31 days", "4,210", "Medium"],
  ["Records retention FAQ", "Legal Operations", "28 days", "2,940", "High"],
  ["Hybrid work equipment", "Workplace", "24 days", "3,510", "Low"],
  ["Employee referral bonus", "Talent Acquisition", "21 days", "2,680", "Low"],
];

const opportunityRows = [
  ["parental leave eligibility", "Genius", "4,820", "High reformulation", "Change published"],
  ["payroll calendar", "Search Results", "4,110", "Quick returns", "Impact verified"],
  ["expense receipt missing", "Ask Pep", "3,760", "No-answer cluster", "In progress"],
  ["remote work outside state", "Genius", "3,280", "Low answer coverage", "Planned"],
  ["corporate card declined", "Search Results", "2,940", "Low success", "Investigating"],
  ["dependent verification", "Ask Pep", "2,610", "No-answer cluster", "New"],
];

const gapRows = [
  ["Expense receipt exceptions", "Ask Pep + Cases", "184", "72 cases", "+28%", "Needs confirmation"],
  ["Company car eligibility by level", "Search + Genius + Cases", "163", "38 cases", "+22%", "Scope review"],
  ["Cross-border remote work", "Genius + Ask Pep", "143", "61 sessions", "+19%", "Owner needed"],
  ["Dependent verification timing", "Ask Pep + Cases", "118", "49 cases", "+11%", "Under review"],
  ["Plant contractor access", "Genius", "92", "41 sessions", "+8%", "Qualified"],
  ["International payroll corrections", "Genius + Ask Pep", "77", "35 sessions", "+6%", "Monitoring"],
];

export const ACTION_CATEGORY_LABELS: Record<ActionCategory, string> = {
  all: "All",
  gaps: "Knowledge gaps",
  ownership: "Ownership",
  "content-risk": "Content risk",
  feedback: "Feedback",
  reports: "Reports",
  search: "Search configuration",
};

export const actionItems: Array<{
  id: string;
  category: Exclude<ActionCategory, "all">;
  priority: "Critical" | "High" | "Medium";
  title: string;
  reason: string;
  scope: string;
  waiting: string;
  action: string;
  detail: DetailKey;
  region: RegionKey;
}> = [
  {
    id: "gap-expense-receipts",
    category: "gaps",
    priority: "Critical",
    title: "Confirm gap: expense receipt exceptions",
    reason: "184 Ask Pep requests and 72 prototype cases; demand increased 28% and the existing article appears incomplete.",
    scope: "myPepsiCo KB · NA · US and Canada",
    waiting: "2 days",
    action: "Review gap",
    detail: "gaps",
    region: "NA",
  },
  {
    id: "gap-company-car",
    category: "gaps",
    priority: "High",
    title: "Review scope conflict: company car eligibility",
    reason: "Similar LATAM and U.S. topics have different employee-level rules. AI recommends keeping regional variants separate.",
    scope: "myPepsiCo KB · LATAM and NA",
    waiting: "4 days",
    action: "Compare coverage",
    detail: "gaps",
    region: "all",
  },
  {
    id: "ownership-benefits",
    category: "ownership",
    priority: "High",
    title: "Resolve challenged ownership: benefits content",
    reason: "The proposed Team Admin challenged the assignment and identified a different authoritative policy owner.",
    scope: "myPepsiCo KB · EMEA · 3 articles",
    waiting: "6 days",
    action: "Review challenge",
    detail: "governance",
    region: "EMEA",
  },
  {
    id: "orphan-payroll",
    category: "ownership",
    priority: "High",
    title: "Find a home for an orphaned payroll article",
    reason: "The article remains published under temporary governance monitoring and reaches a high-volume employee audience.",
    scope: "myPepsiCo KB · LATAM · Mexico",
    waiting: "11 days",
    action: "Review ownership",
    detail: "governance",
    region: "LATAM",
  },
  {
    id: "risk-relocation",
    category: "content-risk",
    priority: "Critical",
    title: "Review high-risk overdue relocation policy",
    reason: "51 days overdue, declining engagement, and active traffic across several employee journeys.",
    scope: "myPepsiCo KB · Global",
    waiting: "1 day",
    action: "Review risk",
    detail: "governance",
    region: "all",
  },
  {
    id: "feedback-leave",
    category: "feedback",
    priority: "Medium",
    title: "Investigate incomplete leave-policy feedback",
    reason: "Normalized negative feedback increased across article helpfulness, Genius, and Ask Pep.",
    scope: "myPepsiCo KB · APAC",
    waiting: "5 days",
    action: "Review feedback",
    detail: "feedback",
    region: "APAC",
  },
  {
    id: "report-monthly",
    category: "reports",
    priority: "Medium",
    title: "Review AI summary for Monthly Knowledge Health",
    reason: "The leadership report is scheduled in 12 days and its AI-written summary still requires human approval.",
    scope: "All assigned regions · PDF and Excel",
    waiting: "Today",
    action: "Review report",
    detail: "optimization",
    region: "all",
  },
  {
    id: "search-payroll",
    category: "search",
    priority: "Medium",
    title: "Check payroll-calendar search configuration",
    reason: "Relevant content exists, but reformulation and quick-return signals suggest employees are not reaching it.",
    scope: "myPepsiCo KB · NA",
    waiting: "3 days",
    action: "Investigate search",
    detail: "discovery",
    region: "NA",
  },
];

const knowledgeGapTopics: Array<{
  topic: string;
  channels: string[];
  demand: string;
  trend: string;
  scope: string;
  assessment: string;
  status: string;
  region: RegionKey;
}> = [
  {
    topic: "Expense receipt exceptions",
    channels: ["Ask Pep", "Cases"],
    demand: "184 requests · 72 cases",
    trend: "+28%",
    scope: "NA · US and Canada",
    assessment: "Improve the existing article with missing exception guidance.",
    status: "Needs confirmation",
    region: "NA",
  },
  {
    topic: "Company car eligibility by employee level",
    channels: ["Search", "Genius", "Cases"],
    demand: "163 requests · 38 cases",
    trend: "+22%",
    scope: "LATAM + NA · conflicting rules",
    assessment: "Keep regional variants separate; consider a global routing page.",
    status: "Scope review",
    region: "all",
  },
  {
    topic: "Cross-border remote work",
    channels: ["Genius", "Ask Pep"],
    demand: "143 requests · 61 sessions",
    trend: "+19%",
    scope: "EMEA + NA",
    assessment: "Split by country and employee population before assigning.",
    status: "Owner needed",
    region: "all",
  },
  {
    topic: "Dependent verification timing",
    channels: ["Ask Pep", "Cases"],
    demand: "118 requests · 49 cases",
    trend: "+11%",
    scope: "APAC · India and Australia",
    assessment: "Existing coverage found; investigate findability and local differences.",
    status: "Under review",
    region: "APAC",
  },
];

function TrendChart({ points }: { points: number[] }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const min = Math.min(...points) - 2;
  const max = Math.max(...points) + 2;
  const coords = points
    .map((point, index) => {
      const x = 16 + (index / (points.length - 1)) * 568;
      const y = 112 - ((point - min) / Math.max(1, max - min)) * 84;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `16,116 ${coords} 584,116`;

  return (
    <Box sx={{ width: "100%", height: 138 }} aria-label="Metric trend for the selected period">
      <svg viewBox="0 0 600 138" width="100%" height="100%" preserveAspectRatio="none" role="img">
        {[32, 60, 88, 116].map((y) => (
          <line key={y} x1="16" x2="584" y1={y} y2={y} stroke={t.border} strokeWidth="1" />
        ))}
        <polygon points={area} fill={alpha(t.pepsiBlue, 0.09)} />
        <polyline points={coords} fill="none" stroke={t.pepsiBlue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.split(" ").map((coord, index) => {
          const [cx, cy] = coord.split(",");
          return <circle key={index} cx={cx} cy={cy} r="3" fill={t.surface} stroke={t.pepsiBlue} strokeWidth="2" />;
        })}
      </svg>
    </Box>
  );
}

function Delta({ children, positive = true }: { children: React.ReactNode; positive?: boolean }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const directionDown = typeof children === "string" && children.trim().startsWith("-");
  const Icon = directionDown ? TrendingDownOutlinedIcon : TrendingUpOutlinedIcon;
  return (
    <Stack direction="row" spacing={0.4} alignItems="center" sx={{ color: positive ? t.successInk : t.errorInk }}>
      <Icon sx={{ fontSize: 15 }} />
      <Typography component="span" sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{children}</Typography>
    </Stack>
  );
}

function SummaryMetric({
  label,
  value,
  change,
  note,
  onClick,
}: {
  label: string;
  value: string;
  change: string;
  note: string;
  onClick: () => void;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        appearance: "none",
        border: 0,
        borderRight: { md: `1px solid ${t.border}` },
        bgcolor: "transparent",
        textAlign: "left",
        cursor: "pointer",
        p: { xs: 2, md: 2.5 },
        minWidth: 0,
        "&:last-of-type": { borderRight: 0 },
        "&:hover": { bgcolor: t.surfaceContainerLow },
        "&:focus-visible": { outline: `2px solid ${t.pepsiBlue}`, outlineOffset: -2 },
      }}
    >
      <Typography variant="overline">{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 0.5 }}>
        <Typography sx={{ fontSize: "1.65rem", color: t.pepsiNavy, fontWeight: 500, letterSpacing: "-0.025em" }}>{value}</Typography>
        <Delta>{change}</Delta>
      </Stack>
      <Typography variant="caption" sx={{ display: "block", mt: 0.6 }}>{note}</Typography>
    </Box>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  onOpen,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onOpen: () => void;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={1.5}>
      <Box>
        <Typography variant="overline">{eyebrow}</Typography>
        <Typography variant="h6" sx={{ mt: 0.2 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, maxWidth: 720 }}>{description}</Typography>
      </Box>
      <Button endIcon={<ArrowForwardOutlinedIcon />} onClick={onOpen} sx={{ flexShrink: 0 }}>View report</Button>
    </Stack>
  );
}

function DenseTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {headers.map((header) => <TableCell key={header}>{header}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={`${row[0]}-${rowIndex}`} hover>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} sx={{ color: cellIndex === 0 ? t.ink : t.slate, fontWeight: cellIndex === 0 ? 500 : 400 }}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function SuperAdminDashboard() {
  const [personaMode] = usePersonaMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const wide = useMediaQuery(theme.breakpoints.up("lg"));
  const [dateRange, setDateRange] = useState("mtd");
  const [region, setRegion] = useState<RegionKey>("all");
  const [selectedMetric, setSelectedMetric] = useState<DiscoveryMetric>("success");
  const [detail, setDetail] = useState<DetailKey | null>(() => {
    const requested = searchParams.get("detail");
    return requested && ["discovery", "governance", "feedback", "optimization", "gaps"].includes(requested)
      ? (requested as DetailKey)
      : null;
  });

  const selected = discoveryMetrics[selectedMetric];
  const snapshot = regionalMetrics[region];
  const rangeLabel = dateRanges.find((range) => range.value === dateRange)?.label ?? "Month to date";
  const regionLabel = regionOptions.find((option) => option.value === region)?.label ?? "All regions";
  const regionActions = actionItems.filter(
    (item) => region === "all" || item.region === "all" || item.region === region,
  );
  const criticalActionCount = regionActions.filter((item) => item.priority === "Critical").length;
  const visibleGapTopics = knowledgeGapTopics.filter(
    (item) => region === "all" || item.region === "all" || item.region === region,
  );

  const reportRows = useMemo(() => {
    if (detail === "governance") return overduePages;
    if (detail === "optimization") return opportunityRows;
    if (detail === "gaps") return gapRows;
    return discoveryRows.map((row) => [row.surface, row.volume, row.click, row.success, row.noAnswer]);
  }, [detail]);

  const downloadReport = () => {
    const rows = reportRows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","));
    const regionalRows = getRegionalComparison(detail ?? "discovery").rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([["Content Engine prototype report", rangeLabel, regionLabel].join(",") + "\n" + rows.join("\n") + "\n\nRegional comparison\n" + regionalRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `content-engine-${detail ?? "dashboard"}-${region}-${dateRange}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (personaMode !== "super-admin") return <Navigate to="/" replace />;

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-start" }} gap={2.5}>
        <Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Typography variant="overline">Super Admin · myPepsiCo KB</Typography>
            <StoryUserSelect />
          </Stack>
          <Typography variant="h4" sx={{ mt: 0.75 }}>Knowledge Base Health</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
            A governance and discovery pulse for the knowledge base you manage. Employee behavior is aggregated and anonymous.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="kb-label">Knowledge base</InputLabel>
            <Select labelId="kb-label" value="mypep" label="Knowledge base">
              <MenuItem value="mypep">myPepsiCo KB</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel id="region-label">Region</InputLabel>
            <Select labelId="region-label" value={region} label="Region" onChange={(event) => setRegion(event.target.value as RegionKey)}>
              {regionOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="date-label">Date range</InputLabel>
            <Select labelId="date-label" value={dateRange} label="Date range" onChange={(event) => setDateRange(event.target.value)}>
              {dateRanges.map((range) => <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={downloadReport}>Export</Button>
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          mt: 4,
          p: { xs: 2, md: 2.25 },
          borderColor: t.pepsiBlue,
          bgcolor: t.pepsiBlueSubtle,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ md: "center" }}
          gap={2}
        >
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: t.paper, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <AutoAwesomeOutlinedIcon sx={{ color: t.pepsiBlue, fontSize: 20 }} />
            </Box>
            <Box>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                <Typography variant="subtitle1">AI governance briefing</Typography>
                <Chip size="small" label={`${regionActions.length} recommended tasks`} sx={{ bgcolor: t.paper, fontWeight: 700 }} />
                {criticalActionCount > 0 && (
                  <Chip size="small" label={`${criticalActionCount} critical`} sx={{ bgcolor: t.errorBg, color: t.errorInk, fontWeight: 700 }} />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 860 }}>
                Prioritize two knowledge-gap decisions and one overdue policy review. Ownership challenges, report approval, feedback, and search configuration also need attention.
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                AI recommendations are advisory. You choose which tasks to review and what action to take.
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            endIcon={<ArrowForwardOutlinedIcon />}
            onClick={() => navigate(`/super-admin/actions?region=${region}`)}
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            Review recommended tasks
          </Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, overflow: "hidden" }}>
        <SummaryMetric label="Search success" value={percent(snapshot.searchSuccess)} change="+2.6 pp" note="Estimated across discovery" onClick={() => setDetail("discovery")} />
        <SummaryMetric label="AI answer coverage" value={percent(snapshot.aiCoverage)} change="+1.9 pp" note="Genius and Ask Pep" onClick={() => setDetail("gaps")} />
        <SummaryMetric label="Review compliance" value={percent(snapshot.reviewCompliance)} change="+0.8 pp" note="180-day cadence" onClick={() => setDetail("governance")} />
        <SummaryMetric label="Ownership coverage" value={percent(snapshot.ownership)} change="+1.1 pp" note={`${snapshot.orphaned} articles orphaned`} onClick={() => setDetail("governance")} />
      </Paper>

      <Paper variant="outlined" sx={{ mt: 3, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader
          eyebrow="Knowledge demand and gaps"
          title="Where do employees need better or new knowledge?"
          description="Candidate gaps combine anonymous Search, Genius, Ask Pep, and prototype ServiceNow case signals. AI recommends; a Super Admin confirms every decision."
          onOpen={() => navigate("/super-admin/reports/gaps")}
        />
        <Box sx={{ mt: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "repeat(5, minmax(0, 1fr))" }, border: `1px solid ${t.border}`, borderRadius: 2, overflow: "hidden" }}>
          {[
            ["Needs your decision", region === "all" ? 2 : 1, "Immediate Super Admin workload", "/super-admin/reports/gaps?status=Needs%20decision&region=" + region],
            ["New candidate gaps this month", region === "all" ? 3 : 1, "Newly detected demand patterns", "/super-admin/reports/gaps?view=new&region=" + region],
            ["New knowledge opportunities", region === "all" ? 2 : 1, "AI-proposed articles ready for review", "/super-admin/reports/gaps?workspace=opportunities&region=" + region],
            ["High-priority unresolved", region === "all" ? 3 : 1, "Most urgent open risks", "/super-admin/reports/gaps?view=priority&region=" + region],
            ["Verified this month", region === "all" ? 2 : 1, "Demand gaps successfully closed", "/super-admin/reports/gaps?status=Verified&region=" + region],
          ].map(([label, value, note, href]) => (
            <Box component="button" type="button" aria-label={"Open " + label + " candidate gaps"} onClick={() => navigate(String(href))} key={label} sx={{ p: 1.75, border: 0, borderRight: { md: `1px solid ${t.border}` }, bgcolor: "transparent", textAlign: "left", cursor: "pointer", "&:last-of-type": { borderRight: 0 }, "&:hover": { bgcolor: t.pepsiBlueSubtle }, "&:focus-visible": { outline: `2px solid ${t.pepsiBlue}`, outlineOffset: -2 } }}>
              <Typography variant="overline">{label}</Typography>
              <Typography sx={{ mt: 0.25, fontSize: "1.5rem", fontWeight: 650, color: t.pepsiNavy }}>{value}</Typography>
              <Typography variant="caption">{note}</Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: t.pepsiBlueStrong, fontWeight: 700 }}>Open filtered report</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ mt: 2.25, p: 1.75, borderRadius: 2, bgcolor: t.surfaceContainerLow }}>
          <Typography variant="body2" color="text.secondary">Individual candidate topics, supporting evidence, AI recommendations, and governance decisions are available only in the full report.</Typography>
        </Box>
        <Typography variant="caption" sx={{ display: "block", mt: 1.5 }}>
          Prototype case data is aggregated for workflow design and does not represent a live ServiceNow case integration.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ mt: 3, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader eyebrow="Discovery performance" title="Are employees finding useful answers?" description="Search Results, Genius, and Ask Pep share one journey view while retaining surface-specific definitions." onOpen={() => navigate("/super-admin/reports/discovery")} />
        <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(340px, 0.65fr)" }, gap: 3 }}>
          <Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, border: `1px solid ${t.border}`, borderRadius: 2, overflow: "hidden" }}>
              {(Object.keys(discoveryMetrics) as DiscoveryMetric[]).map((key) => {
                const metric = discoveryMetrics[key];
                const active = selectedMetric === key;
                return (
                  <Box component="button" key={key} onClick={() => setSelectedMetric(key)} sx={{ border: 0, borderRight: `1px solid ${t.border}`, bgcolor: active ? t.pepsiBlueSubtle : t.surface, textAlign: "left", p: 1.5, cursor: "pointer", minHeight: 94, "&:hover": { bgcolor: active ? t.pepsiBlueSubtle : t.surfaceContainerLow } }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="caption" sx={{ fontWeight: active ? 700 : 500, color: active ? t.pepsiBlueStrong : t.slate }}>{metric.label}</Typography>
                      <Tooltip title={metric.helper}><InfoOutlinedIcon sx={{ fontSize: 14, color: t.granite }} /></Tooltip>
                    </Stack>
                    <Typography sx={{ mt: 0.7, fontSize: "1.15rem", fontWeight: 600, color: t.ink }}>{discoveryValue(key, snapshot)}</Typography>
                    <Delta>{metric.change}</Delta>
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">{selected.label}</Typography>
                <Typography variant="caption">{rangeLabel} · {regionLabel}</Typography>
              </Stack>
              <TrendChart points={selected.points} />
            </Box>
          </Box>

          <Box sx={{ borderLeft: { lg: `1px solid ${t.border}` }, pl: { lg: 3 } }}>
            <Typography variant="subtitle2">By search surface</Typography>
            <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
              {discoveryRows.slice(1).map((row) => (
                <Box key={row.surface} sx={{ py: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{row.surface}</Typography>
                    <Typography sx={{ fontSize: "0.875rem", fontWeight: 600 }}>{row.success}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.45 }}>
                    <Typography variant="caption">{row.volume}</Typography>
                    <Typography variant="caption">Success</Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Button startIcon={<AutoAwesomeOutlinedIcon />} onClick={() => setDetail("gaps")} sx={{ mt: 1 }}>{snapshot.gaps} qualified content gaps</Button>
          </Box>
        </Box>
      </Paper>

      <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" }, gap: 3 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
          <SectionHeader eyebrow="Governance & maintenance" title="Is governed content being maintained?" description="Deadline compliance uses nextReviewAt with the repo's 180-day fallback; health remains a separate signal." onOpen={() => navigate("/super-admin/reports/governance")} />
          <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
            <Box>
              <Typography variant="subtitle2">Ownership health</Typography>
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.25 }}>
                <Typography sx={{ fontSize: "1.5rem", fontWeight: 500 }}>{percent(snapshot.ownership)}</Typography>
                <Delta>+1.1 pp MTD</Delta>
              </Stack>
              <LinearProgress variant="determinate" value={snapshot.ownership} sx={{ mt: 1.25, height: 8, borderRadius: 99, bgcolor: t.surfaceContainerHigh }} />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="caption">{snapshot.assigned.toLocaleString()} assigned</Typography>
                <Typography variant="caption">{snapshot.orphaned} orphaned</Typography>
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2">Review cycle</Typography>
              <Stack spacing={1.1} sx={{ mt: 1.25 }}>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Reviewed on time</Typography><Typography variant="body2" fontWeight={600}>{percent(snapshot.reviewCompliance)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Due this month</Typography><Typography variant="body2" fontWeight={600}>{snapshot.due}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Currently overdue</Typography><Typography variant="body2" fontWeight={600} color="error.main">{snapshot.overdue}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography variant="body2">High-risk overdue</Typography><Typography variant="body2" fontWeight={600} color="error.main">{snapshot.highRisk}</Typography></Stack>
              </Stack>
            </Box>
          </Box>
          <Divider sx={{ my: 2.5 }} />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box><Typography variant="subtitle2">Maintenance reliability</Typography><Typography variant="caption">Pages consistently reviewed before their deadline</Typography></Box>
            <Chip icon={<CheckCircleOutlineIcon />} label="Top performers" size="small" color="success" variant="outlined" />
          </Stack>
          <DenseTable headers={["Page", "Owner", "On-time streak", "Typical timing"]} rows={maintainedPages.slice(0, 4)} />
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3 } }}>
          <SectionHeader eyebrow="Feedback & content quality" title="What are employees telling us?" description="Helpfulness and structured article feedback are reported separately and normalized for article traffic." onOpen={() => navigate("/super-admin/reports/feedback")} />
          <Stack spacing={2.4} sx={{ mt: 3 }}>
            {[
              ["Article helpfulness", percent(snapshot.articleHelpfulness), "+2.1 pp", "6.8% response rate"],
              ["Genius helpfulness", percent(snapshot.geniusHelpfulness), "+1.3 pp", "12.4% response rate"],
              ["Ask Pep helpfulness", percent(snapshot.askPepHelpfulness), "+0.6 pp", "16.1% response rate"],
              ["Incorrect information", `${snapshot.incorrectRate.toFixed(1)} / 1K`, "-0.4", "Normalized by article views"],
            ].map(([label, value, change, note]) => (
              <Box key={label}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Typography variant="body2" fontWeight={600}>{label}</Typography>
                  <Stack direction="row" spacing={1.2} alignItems="center"><Typography sx={{ fontSize: "1rem", fontWeight: 600 }}>{value}</Typography><Delta>{change}</Delta></Stack>
                </Stack>
                <Typography variant="caption">{note}</Typography>
              </Box>
            ))}
          </Stack>
          <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: t.emberBg }}>
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <ReportProblemOutlinedIcon sx={{ color: t.emberStrong, fontSize: 20, mt: 0.1 }} />
              <Box><Typography variant="subtitle2">19 feedback items awaiting owner review</Typography><Typography variant="caption">7 are 8–14 days old · 3 are 15+ days old</Typography></Box>
            </Stack>
          </Box>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ mt: 3, p: { xs: 2.5, md: 3 } }}>
        <SectionHeader eyebrow="Search optimization" title="Show the work—and whether it helped" description="A frozen quarterly leadership cohort sits alongside a live, rolling 90-day opportunity queue." onOpen={() => navigate("/super-admin/reports/optimization")} />
        <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "320px minmax(0, 1fr)" }, gap: 3 }}>
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: t.surfaceContainerLow }}>
            <Typography variant="overline">Quarterly cohort</Typography>
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}><Typography sx={{ fontSize: "2rem", fontWeight: 500, color: t.pepsiNavy }}>{snapshot.topReviewed}</Typography><Typography variant="body2">of regional cohort reviewed</Typography></Stack>
            <LinearProgress variant="determinate" value={snapshot.topReviewed} sx={{ mt: 1.5, height: 8, borderRadius: 99 }} />
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Improvements published</Typography><Typography variant="body2" fontWeight={600}>{snapshot.improvements}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2">Impact verified</Typography><Typography variant="body2" fontWeight={600}>{snapshot.verified}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2">No action required</Typography><Typography variant="body2" fontWeight={600}>11</Typography></Stack>
            </Stack>
          </Box>
          <Box>
            <Stack direction="row" justifyContent="space-between"><Typography variant="subtitle2">Highest-priority opportunities</Typography><Typography variant="caption">Rolling 90 days</Typography></Stack>
            <DenseTable headers={["Topic", "Surface", "Demand", "Signal", "Status"]} rows={opportunityRows.slice(0, 5)} />
          </Box>
        </Box>
      </Paper>

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} sx={{ mt: 2.5, px: 0.5 }}>
        <Typography variant="caption">Prototype values model target-state ServiceNow, Search Results, Genius, and Ask Pep inputs.</Typography>
        <Typography variant="caption">No employee-level activity is available in this view.</Typography>
      </Stack>

      <Drawer anchor="right" open={detail !== null} onClose={() => setDetail(null)} PaperProps={{ sx: { width: { xs: "100%", sm: 620, lg: wide ? 760 : 620 }, p: 0 } }}>
        <DetailDrawer detail={detail} rangeLabel={rangeLabel} regionLabel={regionLabel} onClose={() => setDetail(null)} onDownload={downloadReport} />
      </Drawer>
    </Box>
  );
}

function DetailDrawer({ detail, rangeLabel, regionLabel, onClose, onDownload }: { detail: DetailKey | null; rangeLabel: string; regionLabel: string; onClose: () => void; onDownload: () => void }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  if (!detail) return null;

  const config: Record<DetailKey, { eyebrow: string; title: string; description: string }> = {
    discovery: { eyebrow: "Discovery report", title: "Search performance", description: "Compare outcomes across Search Results, Genius, and Ask Pep without exposing individual employee journeys." },
    governance: { eyebrow: "Governance report", title: "Content maintenance", description: "Review reliability, ownership health, and the pages creating the greatest overdue-content risk." },
    feedback: { eyebrow: "Feedback report", title: "Employee feedback", description: "Helpfulness signals, structured issue reports, owner triage, and feedback aging." },
    optimization: { eyebrow: "Optimization report", title: "Search opportunities", description: "Leadership progress and the live queue of topics that need investigation or improvement." },
    gaps: { eyebrow: "AI coverage report", title: "Content gaps", description: "Qualified missing-content demand across Genius and Ask Pep after privacy and volume thresholds." },
  };
  const current = config[detail];

  return (
    <Box sx={{ minHeight: "100%", bgcolor: t.paper }}>
      <Box sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: alpha(t.paper, 0.96), borderBottom: `1px solid ${t.border}`, px: { xs: 2.5, sm: 3.5 }, py: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box><Typography variant="overline">{current.eyebrow}</Typography><Typography variant="h5" sx={{ mt: 0.25 }}>{current.title}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>{current.description}</Typography></Box>
          <IconButton onClick={onClose} aria-label="Close report"><CloseOutlinedIcon /></IconButton>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
          <Chip label={`${rangeLabel} · ${regionLabel} · myPepsiCo KB`} size="small" />
          <Button size="small" startIcon={<DownloadOutlinedIcon />} onClick={onDownload}>Export CSV</Button>
        </Stack>
      </Box>
      <Box sx={{ px: { xs: 2.5, sm: 3.5 }, py: 3 }}>
        <RegionalComparison detail={detail} />
        <Divider sx={{ my: 3 }} />
        {detail === "discovery" && <DiscoveryDetail />}
        {detail === "governance" && <GovernanceDetail />}
        {detail === "feedback" && <FeedbackDetail />}
        {detail === "optimization" && <OptimizationDetail />}
        {detail === "gaps" && <GapsDetail />}
      </Box>
    </Box>
  );
}

function getRegionalComparison(detail: DetailKey) {
  const entries = regionOptions.filter((option) => option.value !== "all");
  if (detail === "discovery") return { headers: ["Region", "Success", "Referral", "Bounce", "Quick return", "Reformulation"], rows: entries.map(({ value, label }) => { const m = regionalMetrics[value]; return [label, percent(m.searchSuccess), percent(m.referral), percent(m.bounce), percent(m.quickReturn), percent(m.reformulation)]; }) };
  if (detail === "governance") return { headers: ["Region", "Review compliance", "Ownership", "Orphaned", "Overdue", "High risk"], rows: entries.map(({ value, label }) => { const m = regionalMetrics[value]; return [label, percent(m.reviewCompliance), percent(m.ownership), String(m.orphaned), String(m.overdue), String(m.highRisk)]; }) };
  if (detail === "feedback") return { headers: ["Region", "Article helpful", "Genius helpful", "Ask Pep helpful", "Incorrect / 1K"], rows: entries.map(({ value, label }) => { const m = regionalMetrics[value]; return [label, percent(m.articleHelpfulness), percent(m.geniusHelpfulness), percent(m.askPepHelpfulness), m.incorrectRate.toFixed(1)]; }) };
  if (detail === "optimization") return { headers: ["Region", "Cohort reviewed", "Published", "Impact verified"], rows: entries.map(({ value, label }) => { const m = regionalMetrics[value]; return [label, String(m.topReviewed), String(m.improvements), String(m.verified)]; }) };
  return { headers: ["Region", "AI coverage", "Qualified gaps"], rows: entries.map(({ value, label }) => { const m = regionalMetrics[value]; return [label, percent(m.aiCoverage), String(m.gaps)]; }) };
}

function RegionalComparison({ detail }: { detail: DetailKey }) {
  const comparison = getRegionalComparison(detail);
  return (
    <Box>
      <Typography variant="subtitle1">Regional comparison</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>All regions established in the country catalog remain visible here, even when the dashboard is filtered to one region.</Typography>
      <DenseTable headers={comparison.headers} rows={comparison.rows} />
    </Box>
  );
}

function DiscoveryDetail() {
  return (
    <Stack spacing={3}>
      <Box><Typography variant="subtitle1">Performance by surface</Typography><DenseTable headers={["Surface", "Volume", "CTR / referral", "Success", "No answer"]} rows={discoveryRows.map((row) => [row.surface, row.volume, row.click, row.success, row.noAnswer])} /></Box>
      <Paper variant="outlined" sx={{ p: 2.5 }}><Typography variant="subtitle2">Diagnostic signals</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>Bounce Rate is retained for continuity. Quick Return and Query Reformulation provide stronger evidence that an employee did not find what they needed.</Typography><Stack direction="row" spacing={4} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap><Box><Typography variant="overline">Bounce</Typography><Typography variant="h6">31.2%</Typography></Box><Box><Typography variant="overline">Quick return</Typography><Typography variant="h6">11.6%</Typography></Box><Box><Typography variant="overline">Reformulation</Typography><Typography variant="h6">14.9%</Typography></Box></Stack></Paper>
      <Typography variant="caption">Estimated Search Success does not currently include verified human-support escalations.</Typography>
    </Stack>
  );
}

function GovernanceDetail() {
  return (
    <Stack spacing={3}>
      <Box><Typography variant="subtitle1">Top 10 consistently maintained</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Recognizes pages with repeated on-time reviews, not review volume alone.</Typography><DenseTable headers={["Page", "Owner", "On-time streak", "Typical timing"]} rows={maintainedPages} /></Box>
      <Box><Typography variant="subtitle1">Bottom 10 overdue risk</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Prioritized using days overdue, audience exposure, and business criticality.</Typography><DenseTable headers={["Page", "Owner", "Overdue", "Views (30d)", "Risk"]} rows={overduePages} /></Box>
    </Stack>
  );
}

function FeedbackDetail() {
  const rows = [
    ["Incorrect information", "42", "1.8 / 1K views", "11", "6.2 days"],
    ["Incomplete information", "67", "2.9 / 1K views", "18", "5.4 days"],
    ["Enhancement suggestion", "91", "3.9 / 1K views", "24", "7.1 days"],
  ];
  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2.5 }}><Typography variant="subtitle2">Feedback aging</Typography><Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}><Box><Typography variant="overline">0–7 days</Typography><Typography variant="h6">9</Typography></Box><Box><Typography variant="overline">8–14 days</Typography><Typography variant="h6">7</Typography></Box><Box><Typography variant="overline">15+ days</Typography><Typography variant="h6">3</Typography></Box></Stack><Typography variant="caption" sx={{ display: "block", mt: 1.5 }}>Aging is informational until a formal response SLA is defined.</Typography></Paper>
      <Box><Typography variant="subtitle1">Written article feedback</Typography><DenseTable headers={["Category", "Submitted", "Normalized rate", "Validated", "Median triage"]} rows={rows} /></Box>
      <Typography variant="body2" color="text.secondary">Feedback routes to the assigned content owner. Orphaned or inactive-owner items escalate to the Super Admin governance queue.</Typography>
    </Stack>
  );
}

function OptimizationDetail() {
  return <Stack spacing={2}><Typography variant="subtitle1">Rolling 90-day opportunity queue</Typography><DenseTable headers={["Topic", "Surface", "Demand", "Signal", "Status"]} rows={opportunityRows} /><Typography variant="caption">The quarterly top-100 leadership cohort remains frozen so progress can be compared consistently.</Typography></Stack>;
}

function GapsDetail() {
  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2.5 }}><Stack direction="row" spacing={1.5} alignItems="center"><AutoAwesomeOutlinedIcon color="primary" /><Box><Typography variant="subtitle2">AI Answer Coverage</Typography><Typography sx={{ fontSize: "1.5rem", fontWeight: 600 }}>86.1%</Typography></Box></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>A no-answer becomes a qualified gap only after retrieval, access, ambiguity, and out-of-scope causes are excluded.</Typography></Paper>
      <Box><Typography variant="subtitle1">Qualified and emerging gaps</Typography><DenseTable headers={["Topic", "Detected in", "Requests", "Anonymous users", "Trend", "Status"]} rows={gapRows} /></Box>
    </Stack>
  );
}
