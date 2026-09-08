import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tab, Tabs, Tooltip, Typography, useTheme,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import EventRepeatOutlinedIcon from "@mui/icons-material/EventRepeatOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { usePersonaMode } from "../lib/persona";

type ReportType = "gaps" | "discovery" | "governance" | "feedback" | "optimization";
type GapStatus = "Needs decision" | "Monitoring" | "Assigned" | "In progress" | "Measuring impact" | "Verified" | "Dismissed";

const reportConfig: Record<ReportType, { eyebrow: string; title: string; description: string }> = {
  gaps: {
    eyebrow: "Knowledge demand & gaps",
    title: "Knowledge Demand and Gaps",
    description: "Qualify demand across Search Results, Genius, Ask Pep, and aggregated support cases. AI proposes; a Super Admin makes every governance decision.",
  },
  discovery: {
    eyebrow: "Discovery performance",
    title: "Search and Answer Performance",
    description: "Compare whether employees found a useful destination across Search Results, Genius, and Ask Pep without exposing individual journeys.",
  },
  governance: {
    eyebrow: "Governance & maintenance",
    title: "Content Governance and Maintenance",
    description: "Review ownership, review-cycle reliability, overdue risk, and pages that consistently meet or miss governance deadlines.",
  },
  feedback: {
    eyebrow: "Feedback & quality",
    title: "Employee Feedback and Content Quality",
    description: "Compare normalized helpfulness and structured feedback, then identify which content needs owner follow-up.",
  },
  optimization: {
    eyebrow: "Search optimization",
    title: "Optimization Outcomes",
    description: "Track the live opportunity queue and show whether completed content and search improvements changed employee outcomes.",
  },
};

const gapRows: Array<{
  priority: "Critical" | "High" | "Medium";
  topic: string;
  channels: string[];
  demand: string;
  trend: string;
  scope: string;
  coverage: string;
  recommendation: string;
  status: GapStatus;
  region: string;
  evidence: string;
  newThisMonth?: boolean;
}> = [
  {
    priority: "Critical", newThisMonth: true, topic: "Company car eligibility by employee level",
    channels: ["Search", "Genius", "Cases"], demand: "163 requests · 38 cases", trend: "+22%",
    scope: "LATAM + NA · conflicting rules", coverage: "3 related articles; country and employee-level rules differ",
    recommendation: "Keep regional variants separate; consider one global routing page.", status: "Needs decision", region: "all",
    evidence: "Employees reformulate around eligibility and level. LATAM and US policy language overlaps, but the rules and eligible populations do not.",
  },
  {
    priority: "High", newThisMonth: true, topic: "Expense receipt exceptions",
    channels: ["Ask Pep", "Cases"], demand: "184 requests · 72 cases", trend: "+28%",
    scope: "NA · US and Canada", coverage: "Existing expense article lacks exception guidance",
    recommendation: "Improve the existing article and route to its Team Admin.", status: "Needs decision", region: "NA",
    evidence: "No-answer responses and cases cluster around lost receipts, damaged receipts, and manager exceptions.",
  },
  {
    priority: "High", newThisMonth: true, topic: "Cross-border remote work",
    channels: ["Genius", "Ask Pep"], demand: "143 requests · 61 sessions", trend: "+19%",
    scope: "EMEA + NA", coverage: "Partial coverage in mobility and tax content",
    recommendation: "Split by country and employee population before assigning.", status: "Monitoring", region: "all",
    evidence: "Related content answers tax and relocation questions, but does not consistently cover temporary remote work.",
  },
  {
    priority: "Medium", topic: "Dependent verification timing",
    channels: ["Ask Pep", "Cases"], demand: "118 requests · 49 cases", trend: "+11%",
    scope: "APAC · India and Australia", coverage: "Relevant benefits content exists",
    recommendation: "Investigate findability and local differences before creating content.", status: "Assigned", region: "APAC",
    evidence: "Existing coverage is compatible, suggesting a search configuration or terminology issue rather than a true gap.",
  },
  {
    priority: "Medium", topic: "Payroll calendar cut-off dates",
    channels: ["Search", "Genius"], demand: "96 requests · 44 reformulations", trend: "+9%",
    scope: "NA · United States", coverage: "Current payroll calendar is published",
    recommendation: "Treat as a findability problem; test title, synonyms, and freshness.", status: "In progress", region: "NA",
    evidence: "Quick returns and reformulations stay elevated despite a current authoritative article.",
  },
  {
    priority: "Medium", topic: "Global mobility document checklist",
    channels: ["Search", "Ask Pep"], demand: "82 requests - 21 quick returns", trend: "-3%",
    scope: "EMEA - United Kingdom and Germany", coverage: "Checklist updates published by the mobility team",
    recommendation: "Measure whether the recent article update reduced repeat searches.", status: "Measuring impact", region: "EMEA",
    evidence: "The revised checklist is live; outcome signals need another reporting cycle before verification.",
  },
  {
    priority: "Medium", topic: "Benefits enrollment confirmation",
    channels: ["Search", "Genius"], demand: "74 requests - 8 quick returns", trend: "-18%",
    scope: "NA - United States", coverage: "Authoritative article and confirmation steps are current",
    recommendation: "Verify the improvement and close the gap.", status: "Verified", region: "NA",
    evidence: "Reformulation and quick-return rates fell for two consecutive reporting periods after the update.",
  },
  {
    priority: "Medium", topic: "Supplier onboarding contacts",
    channels: ["Ask Pep"], demand: "57 requests - 6 no-answer responses", trend: "-21%",
    scope: "Global", coverage: "New routing article is published and accessible",
    recommendation: "Verify the improvement and close the gap.", status: "Verified", region: "all",
    evidence: "No-answer volume is below the agreed threshold and article destinations are increasing.",
  },
  {
    priority: "Medium", topic: "Holiday calendar download",
    channels: ["Search"], demand: "41 requests - 3 quick returns", trend: "-6%",
    scope: "APAC - Australia", coverage: "Valid calendar content already ranked first",
    recommendation: "Dismiss as normal navigation behavior.", status: "Dismissed", region: "APAC",
    evidence: "The content is current, accessible, and successful. The remaining behavior does not meet the gap threshold.",
  },
];

const knowledgeOpportunities = [
  {
    id: "remote-work-country-guide",
    proposedTitle: "Cross Border Remote Work Eligibility by Country",
    intent: "Employees need to know whether they may work temporarily from another country, who must approve it, and which restrictions apply.",
    channels: ["Search", "Genius", "Ask Pep", "Cases"],
    months: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    searches: [52, 61, 74, 89, 112, 143],
    searchIncrease: "+175% in six months",
    otherSignals: ["61 Genius or Ask Pep no-answer sessions", "31 related support cases", "44 query reformulations this month"],
    scope: "EMEA and NA - country-specific variants required",
    region: "all",
    coverage: "Mobility and tax articles cover pieces of the question, but none explains the complete temporary remote-work decision path.",
    whyNew: "Create a routing guide with separate country content. Do not combine country rules into one universal policy.",
    confidence: "High",
    suggestedOwner: "Alexis Nguyen - People Operations",
    outline: ["Eligibility and exclusions", "Country selection", "Required approvals", "Tax and immigration warnings", "Where to get help"],
    success: "Reduce no-answer sessions by 30% and query reformulation by 20% within two reporting cycles.",
  },
  {
    id: "car-eligibility-routing",
    proposedTitle: "Find Your Company Car Eligibility Policy",
    intent: "Employees need a reliable path to the correct car policy based on country and employee level.",
    channels: ["Search", "Genius", "Cases"],
    months: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    searches: [41, 49, 63, 78, 101, 128],
    searchIncrease: "+212% in six months",
    otherSignals: ["38 related support cases", "27 Genius low-confidence responses", "36 quick returns this month"],
    scope: "LATAM and NA - routing content only",
    region: "all",
    coverage: "Three authoritative policies exist, but their rules conflict by region and employee level and are difficult to route correctly.",
    whyNew: "Create one global routing page that sends employees to the correct existing policy. Keep the underlying regional policies separate.",
    confidence: "Medium-high",
    suggestedOwner: "Alfonso Ibarra - Content Governance",
    outline: ["Choose your country", "Choose your employee level", "Open the applicable policy", "Contact the correct support team"],
    success: "Increase correct policy destinations by 25% and reduce quick returns by 20% within 60 days.",
  },
];

const genericReports: Record<Exclude<ReportType, "gaps">, { metrics: string[][]; headers: string[]; rows: string[][] }> = {
  discovery: {
    metrics: [["Search success", "67.4%", "+2.6 pp"], ["Quick returns", "18.1%", "-1.4 pp"], ["Query reformulation", "14.8%", "-0.9 pp"], ["AI answer coverage", "76.2%", "+1.9 pp"]],
    headers: ["Channel", "Demand", "Clicks / destinations", "Success signal", "No answer"],
    rows: [["Search Results", "28,430 searches", "19,164 clicks", "67.4%", "N/A"], ["Genius", "8,214 prompts", "5,682 source visits", "74.8% helpful", "712"], ["Ask Pep", "5,486 conversations", "3,214 article visits", "78.1% helpful", "486"]],
  },
  governance: {
    metrics: [["Ownership coverage", "96.8%", "+1.1 pp"], ["Review compliance", "91.4%", "+0.8 pp"], ["Currently overdue", "42", "-6"], ["High-risk overdue", "7", "-2"]],
    headers: ["Page", "Owner / team", "Review status", "Risk", "Next action"],
    rows: [["Global Travel & Expense", "Alina Corral", "18 days overdue", "High", "Escalate review"], ["Parental Leave Overview", "Itzel Ayala Quezada", "9 days overdue", "High", "Owner reviewing"], ["Procurement Buying Channels", "Unassigned", "Ownership challenge", "Medium", "Team Admin response due"], ["Benefits Enrollment", "Sofia Gonzalez", "On time · 6-cycle streak", "Low", "No action"]],
  },
  feedback: {
    metrics: [["Article helpfulness", "81.6%", "+2.1 pp"], ["Genius helpfulness", "74.8%", "+1.3 pp"], ["Ask Pep helpfulness", "78.1%", "+0.6 pp"], ["Incorrect info", "2.4 / 1K", "-0.4"]],
    headers: ["Topic / article", "Signal", "Normalized rate", "Age", "Owner action"],
    rows: [["Parental leave eligibility", "Incomplete information", "5.8 / 1K views", "11 days", "Changes requested"], ["Expense receipt exceptions", "Ask Pep thumbs down", "4.9 / 1K sessions", "7 days", "Under review"], ["Remote work approvals", "Suggestion for enhancement", "3.1 / 1K views", "4 days", "Awaiting triage"]],
  },
  optimization: {
    metrics: [["Opportunities reviewed", "68%", "+9 pp"], ["Improvements published", "27", "+6"], ["Impact verified", "14", "+4"], ["No action required", "11", "+2"]],
    headers: ["Topic", "Surface", "Demand", "Primary signal", "Outcome status"],
    rows: [["Payroll calendar", "Search", "2,481", "Reformulation", "Measuring impact"], ["Expense exceptions", "Ask Pep", "1,824", "No answer", "In progress"], ["Company car eligibility", "Genius", "1,406", "Low helpfulness", "Scope review"], ["Dependent verification", "Search + Ask Pep", "1,102", "Quick return", "Assigned"]],
  },
};

const regionOptions = ["All regions", "North America (NA)", "Latin America (LATAM)", "Europe, Middle East & Africa (EMEA)", "Asia Pacific (APAC)"];
const statuses: Array<GapStatus | "All"> = ["Needs decision", "Monitoring", "Assigned", "In progress", "Measuring impact", "Verified", "Dismissed", "All"];

function SearchDemandBars({ months, values, increase }: { months: string[]; values: number[]; increase: string }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const max = Math.max(...values);
  return <Box>
    <Stack direction="row" justifyContent="space-between" alignItems="baseline"><Typography variant="subtitle2">Search demand</Typography><Chip size="small" label={increase} sx={{ bgcolor: t.emberBg, color: t.emberStrong, fontWeight: 700 }} /></Stack>
    <Box sx={{ mt: 1.5, height: 150, display: "flex", alignItems: "flex-end", gap: 1.1, borderBottom: "1px solid " + t.border, px: 0.5 }}>
      {values.map((value, index) => <Tooltip key={months[index]} arrow title={months[index] + ": " + value + " searches"}>
        <Box sx={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", cursor: "help" }}>
          <Typography variant="caption" sx={{ mb: 0.4, fontWeight: 650 }}>{value}</Typography>
          <Box sx={{ width: "100%", maxWidth: 34, height: Math.max(10, (value / max) * 112), bgcolor: t.pepsiBlue, borderRadius: "4px 4px 0 0", transition: "opacity 150ms", "&:hover": { opacity: 0.75 } }} />
        </Box>
      </Tooltip>)}
    </Box>
    <Stack direction="row" gap={1.1} sx={{ px: 0.5 }}>{months.map((month) => <Typography key={month} variant="caption" sx={{ flex: 1, textAlign: "center", pt: 0.6 }}>{month}</Typography>)}</Stack>
    <Typography variant="caption" sx={{ display: "block", mt: 1 }}>Monthly searches in the selected prototype reporting window. Hover over a bar for its value.</Typography>
  </Box>;
}

function GapProgressDonut({ needsDecision, monitoring, underway, closed }: { needsDecision: number; monitoring: number; underway: number; closed: number }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const total = needsDecision + monitoring + underway + closed;
  const triaged = total ? Math.round(((total - needsDecision) / total) * 100) : 0;
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { label: "Needs decision", count: needsDecision, color: "#F5A623", description: "Candidate gaps awaiting a Super Admin decision." },
    { label: "Monitoring", count: monitoring, color: "#9AA6B2", description: "Candidates being watched until enough evidence exists to act." },
    { label: "Mitigation underway", count: underway, color: "#0066B3", description: "Candidates that are assigned, in progress, or measuring impact." },
    { label: "Verified or closed", count: closed, color: "#00843D", description: "Candidates verified as resolved or dismissed as not being a true gap." },
  ];
  let completed = 0;

  return <Box>
    <Box sx={{ position: "relative", width: 176, height: 176, mx: "auto" }}>
      <svg width="176" height="176" viewBox="0 0 176 176" role="img" aria-label={"Candidate gap progress: " + triaged + "% triaged"}>
        <circle cx="88" cy="88" r={radius} fill="none" stroke={t.surfaceContainerHigh} strokeWidth="22" />
        {segments.map((segment) => {
          const start = completed;
          completed += segment.count;
          const fraction = total ? segment.count / total : 0;
          const percent = total ? Math.round(fraction * 100) : 0;
          return <Tooltip key={segment.label} arrow placement="top" title={segment.label + ": " + segment.count + " of " + total + " candidate gaps (" + percent + "%). " + segment.description}>
            <circle
              cx="88" cy="88" r={radius} fill="none" stroke={segment.color} strokeWidth="22"
              strokeDasharray={(fraction * circumference) + " " + circumference}
              strokeDashoffset={-(total ? start / total : 0) * circumference}
              transform="rotate(-90 88 88)"
              style={{ cursor: "help", transition: "stroke-width 160ms ease" }}
              onMouseEnter={(event) => event.currentTarget.setAttribute("stroke-width", "27")}
              onMouseLeave={(event) => event.currentTarget.setAttribute("stroke-width", "22")}
            />
          </Tooltip>;
        })}
      </svg>
      <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", pointerEvents: "none" }}>
        <Box><Typography sx={{ fontSize: "1.75rem", fontWeight: 700, color: t.pepsiNavy }}>{triaged}%</Typography><Typography variant="caption">triaged</Typography></Box>
      </Box>
    </Box>
    <Typography variant="caption" sx={{ display: "block", mt: 1, textAlign: "center", maxWidth: 210 }}>{total} candidate gaps in the selected KB, region, and channel</Typography>
  </Box>;
}

export default function SuperAdminReport() {
  const [personaMode] = usePersonaMode();
  const navigate = useNavigate();
  const { reportType: routeType } = useParams();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const reportType = (routeType && routeType in reportConfig ? routeType : "gaps") as ReportType;
  const current = reportConfig[reportType];
  const regionFromUrl: Record<string, string> = { all: "All regions", NA: "North America (NA)", LATAM: "Latin America (LATAM)", EMEA: "Europe, Middle East & Africa (EMEA)", APAC: "Asia Pacific (APAC)" };
  const requestedView = searchParams.get("view");
  const requestedStatus = searchParams.get("status");
  const initialView = requestedView === "new" || requestedView === "priority" ? requestedView : "all";
  const requestedWorkspace = searchParams.get("workspace");
  const initialWorkspace = requestedWorkspace === "opportunities" || requestedWorkspace === "mitigation" ? requestedWorkspace : requestedStatus && ["Assigned", "In progress", "Measuring impact", "Verified", "Dismissed"].includes(requestedStatus) ? "mitigation" : "candidates";
  const initialStatus = initialView !== "all" ? "All" : statuses.includes(requestedStatus as GapStatus | "All") ? requestedStatus as GapStatus | "All" : initialWorkspace === "mitigation" ? "All" : "Needs decision";
  const [region, setRegion] = useState(regionFromUrl[searchParams.get("region") ?? "all"] ?? "All regions");
  const [dateRange, setDateRange] = useState("Month to date");
  const [channel, setChannel] = useState("All channels");
  const [status, setStatus] = useState<GapStatus | "All">(initialStatus);
  const [queueView, setQueueView] = useState<"all" | "new" | "priority">(initialView);
  const [gapWorkspace, setGapWorkspace] = useState<"candidates" | "opportunities" | "mitigation">(initialWorkspace);
  const [selectedOpportunity, setSelectedOpportunity] = useState<(typeof knowledgeOpportunities)[number] | null>(null);
  const [opportunityDecision, setOpportunityDecision] = useState("");
  const [selectedGap, setSelectedGap] = useState<(typeof gapRows)[number] | null>(null);
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [assignee, setAssignee] = useState("");
  const [workType, setWorkType] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [successMeasure, setSuccessMeasure] = useState("");

  const scopeGaps = useMemo(() => gapRows.filter((gap) => {
    const regionMatch = region === "All regions" || gap.region === "all" || region.includes(gap.region);
    const channelMatch = channel === "All channels" || gap.channels.includes(channel);
    return regionMatch && channelMatch;
  }), [region, channel]);
  const visibleGaps = useMemo(() => scopeGaps.filter((gap) => {
    const statusMatch = status === "All" || gap.status === status;
    const workspaceMatch = gapWorkspace === "candidates" ? gap.status === "Needs decision" || gap.status === "Monitoring" : gapWorkspace === "mitigation" ? gap.status !== "Needs decision" && gap.status !== "Monitoring" : true;
    const viewMatch = queueView === "new" ? gap.newThisMonth === true : queueView === "priority" ? (gap.priority === "Critical" || gap.priority === "High") && gap.status !== "Verified" && gap.status !== "Dismissed" : true;
    const searchMatch = !query.trim() || [gap.topic, gap.scope, gap.coverage, gap.recommendation].join(" ").toLowerCase().includes(query.toLowerCase());
    return statusMatch && workspaceMatch && viewMatch && searchMatch;
  }), [scopeGaps, status, gapWorkspace, queueView, query]);
  const visibleOpportunities = useMemo(() => knowledgeOpportunities.filter((item) => {
    const regionMatch = region === "All regions" || item.region === "all" || region.includes(item.region);
    const channelMatch = channel === "All channels" || item.channels.includes(channel);
    return regionMatch && channelMatch;
  }), [region, channel]);
  const needsDecisionCount = scopeGaps.filter((gap) => gap.status === "Needs decision").length;
  const monitoringCount = scopeGaps.filter((gap) => gap.status === "Monitoring").length;
  const underwayCount = scopeGaps.filter((gap) => ["Assigned", "In progress", "Measuring impact"].includes(gap.status)).length;
  const closedCount = scopeGaps.filter((gap) => ["Verified", "Dismissed"].includes(gap.status)).length;
  const triagedPercent = scopeGaps.length ? Math.round(((scopeGaps.length - needsDecisionCount) / scopeGaps.length) * 100) : 0;
  const assignmentRequired = decision === "Confirm as a gap" || decision === "Route to Team Admin";
  const opportunityAssignmentRequired = opportunityDecision === "Approve new knowledge recommendation" || opportunityDecision === "Split into scoped recommendations";
  const pageCount = Math.max(1, Math.ceil(visibleGaps.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);

  if (personaMode !== "super-admin") return <Navigate to="/" replace />;

  const exportReport = () => {
    const header = reportType === "gaps"
      ? ["Priority","Topic","Channels","Demand","Trend","Scope","Existing coverage","AI recommendation","Status"]
      : genericReports[reportType].headers;
    const rows = reportType === "gaps"
      ? visibleGaps.map((g) => [g.priority,g.topic,g.channels.join(" + "),g.demand,g.trend,g.scope,g.coverage,g.recommendation,g.status])
      : genericReports[reportType].rows;
    const csv = [header, ...rows].map((row) => row.map((cell) => "\"" + String(cell).replaceAll("\"", "\"\"") + "\"").join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "content-engine-" + reportType + "-report.csv"; anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ maxWidth: 1500, mx: "auto" }}>
      <Button size="small" startIcon={<ArrowBackOutlinedIcon />} onClick={() => navigate("/super-admin")}>Back to dashboard</Button>
      <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ lg: "flex-start" }} gap={2.5} sx={{ mt: 1.5 }}>
        <Box>
          <Typography variant="overline">{current.eyebrow}</Typography>
          <Typography variant="h4" sx={{ mt: 0.25 }}>{current.title}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 820 }}>{current.description}</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={exportReport}>Export</Button>
          <Button variant="contained" startIcon={<EventRepeatOutlinedIcon />} onClick={() => navigate("/super-admin/reports-schedules?create=" + reportType)}>Save or schedule report</Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
          <FormControl size="small" sx={{ minWidth: 190 }}><InputLabel>Knowledge base</InputLabel><Select value="myPepsiCo KB" label="Knowledge base"><MenuItem value="myPepsiCo KB">myPepsiCo KB</MenuItem></Select></FormControl>
          <FormControl size="small" sx={{ minWidth: 210 }}><InputLabel>Region</InputLabel><Select value={region} label="Region" onChange={(e) => setRegion(e.target.value)}>{regionOptions.map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>Date range</InputLabel><Select value={dateRange} label="Date range" onChange={(e) => setDateRange(e.target.value)}>{["Month to date","Last 30 days","Last quarter","Custom range"].map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
          {reportType === "gaps" && <>
            <FormControl size="small" sx={{ minWidth: 150 }}><InputLabel>Channel</InputLabel><Select value={channel} label="Channel" onChange={(e) => setChannel(e.target.value)}>{["All channels","Search","Genius","Ask Pep","Cases"].map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
            {gapWorkspace !== "opportunities" && <><FormControl size="small" sx={{ minWidth: 190 }}><InputLabel>Queue view</InputLabel><Select value={queueView} label="Queue view" onChange={(e) => { setQueueView(e.target.value as "all" | "new" | "priority"); setStatus("All"); setPage(0); }}><MenuItem value="all">All lifecycle records</MenuItem><MenuItem value="new">New this month</MenuItem><MenuItem value="priority">High-priority unresolved</MenuItem></Select></FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}><InputLabel>Status</InputLabel><Select value={status} label="Status" onChange={(e) => { setStatus(e.target.value as GapStatus | "All"); setQueueView("all"); setPage(0); }}>{statuses.map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
            <TextField size="small" label="Search this queue" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ minWidth: 230 }} /></>}
          </>}
        </Stack>
      </Paper>

      {reportType === "gaps" ? (
        <>
          <Paper variant="outlined" sx={{ mt: 2.5 }}>
            <Tabs value={gapWorkspace} onChange={(_, value) => { setGapWorkspace(value); setQueueView("all"); setPage(0); if (value === "candidates") setStatus("Needs decision"); if (value === "mitigation") setStatus("All"); }} variant="scrollable" scrollButtons="auto" aria-label="Knowledge gap workspace views">
              <Tab value="candidates" label="Candidate Gaps" />
              <Tab value="opportunities" label={"New Knowledge Opportunities (" + visibleOpportunities.length + ")"} />
              <Tab value="mitigation" label="Mitigation and Impact" />
            </Tabs>
          </Paper>

          {gapWorkspace === "opportunities" && <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert icon={<AutoAwesomeOutlinedIcon />} severity="info">These are AI recommendations for new knowledge after reviewing existing coverage and alternative causes. A Super Admin must approve, redirect, split, monitor, or reject each recommendation.</Alert>
            {visibleOpportunities.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.15fr) minmax(360px, 0.85fr)" }, gap: 3 }}>
                <Box>
                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap"><Chip size="small" label={"Confidence: " + item.confidence} color="primary" variant="outlined" />{item.channels.map((value) => <Chip size="small" key={value} label={value} />)}</Stack>
                  <Typography variant="overline" sx={{ display: "block", mt: 1.5 }}>Proposed article</Typography><Typography variant="h6">{item.proposedTitle}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{item.intent}</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 2 }}>Why existing knowledge is insufficient</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>{item.coverage}</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 1.5 }}>AI recommendation</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>{item.whyNew}</Typography>
                  <Typography variant="caption" sx={{ display: "block", mt: 1.25 }}>{item.scope}</Typography>
                  <Button variant="contained" endIcon={<ArrowForwardOutlinedIcon />} sx={{ mt: 2 }} onClick={() => { setSelectedOpportunity(item); setOpportunityDecision(""); setAssignee(""); setWorkType("Create new content"); setDueDate(""); setSuccessMeasure(item.success); setNotes(""); }}>Review recommendation</Button>
                </Box>
                <Box><SearchDemandBars months={item.months} values={item.searches} increase={item.searchIncrease} /><Typography variant="subtitle2" sx={{ mt: 2 }}>Supporting signals</Typography><Stack component="ul" spacing={0.5} sx={{ mt: 0.75, pl: 2.2 }}>{item.otherSignals.map((signal) => <Typography component="li" variant="body2" key={signal}>{signal}</Typography>)}</Stack></Box>
              </Box>
            </Paper>)}
          </Stack>}

          <Box sx={{ display: gapWorkspace === "opportunities" ? "none" : "block" }}>
          <Paper variant="outlined" sx={{ mt: 2.5, p: { xs: 2, md: 2.5 }, display: gapWorkspace === "mitigation" ? "block" : "none" }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px minmax(0, 1fr)" }, gap: 3, alignItems: "center" }}>
              <GapProgressDonut needsDecision={needsDecisionCount} monitoring={monitoringCount} underway={underwayCount} closed={closedCount} />
              <Box>
                <Typography variant="overline">Mitigation progress</Typography>
                <Typography variant="h6" sx={{ mt: 0.25 }}>Work the next meaningful slice, not the whole library</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, maxWidth: 760 }}>Rates show progress across the selected scope. The queue below defaults to items needing your decision, then supports search, filters, saved reports, and manageable page sizes whether the KB contains 10 articles or 10,000.</Typography>
                <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 1 }}>
                  {[
                    ["Needs decision", needsDecisionCount, "#F5A623"],
                    ["Monitoring", monitoringCount, "#9AA6B2"],
                    ["Mitigation underway", underwayCount, "#0066B3"],
                    ["Verified or closed", closedCount, "#00843D"],
                  ].map(([label, count, color]) => <Box key={String(label)} sx={{ p: 1.25, border: "1px solid " + t.border, borderRadius: 1.5 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center"><Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: String(color) }} /><Typography variant="caption">{label}</Typography></Stack>
                    <Typography sx={{ mt: 0.35, fontSize: "1.25rem", fontWeight: 700 }}>{count}</Typography>
                  </Box>)}
                </Box>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                  <Button size="small" variant={status === "Needs decision" ? "contained" : "outlined"} onClick={() => { setQueueView("all"); setStatus("Needs decision"); setPage(0); }}>My next decisions</Button>
                  <Button size="small" variant={status === "In progress" ? "contained" : "outlined"} onClick={() => { setQueueView("all"); setStatus("In progress"); setPage(0); }}>In progress</Button>
                  <Button size="small" variant={status === "Measuring impact" ? "contained" : "outlined"} onClick={() => { setQueueView("all"); setStatus("Measuring impact"); setPage(0); }}>Measure impact</Button>
                  <Button size="small" variant={status === "All" ? "contained" : "outlined"} onClick={() => { setQueueView("all"); setStatus("All"); setPage(0); }}>All candidate gaps</Button>
                </Stack>
              </Box>
            </Box>
          </Paper>

          <Alert icon={<AutoAwesomeOutlinedIcon />} severity="info" sx={{ mt: 2 }}>
            Similar wording does not mean policies can be combined. AI checks KB, sector, region, country, audience, access, authority, and dates; you make the final decision.
          </Alert>
          <Paper variant="outlined" sx={{ mt: 2, overflow: "hidden" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ px: 2.5, py: 2, borderBottom: "1px solid " + t.border }}>
              <Box><Typography variant="subtitle1">{gapWorkspace === "mitigation" ? "Mitigation and impact queue" : "Candidate gaps"}</Typography><Typography variant="caption">{visibleGaps.length} topics match the current filters · aggregated, anonymous signals</Typography></Box>
              <Chip label="Human confirmation required" variant="outlined" size="small" />
            </Stack>
            <TableContainer sx={{ display: { xs: "none", md: "block" }, overflowX: "visible" }}>
              <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
                <TableHead><TableRow>
                  <TableCell sx={{ width: "9%" }}>Priority</TableCell>
                  <TableCell sx={{ width: "19%" }}>Candidate</TableCell>
                  <TableCell sx={{ width: "18%" }}>Evidence</TableCell>
                  <TableCell sx={{ width: "27%" }}>Scope and existing coverage</TableCell>
                  <TableCell sx={{ width: "13%" }}>Status</TableCell>
                  <TableCell sx={{ width: "14%" }}>Action</TableCell>
                </TableRow></TableHead>
                <TableBody>{visibleGaps.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((gap) => (
                  <TableRow hover key={gap.topic}>
                    <TableCell sx={{ verticalAlign: "top", overflowWrap: "anywhere" }}>
                      <Chip size="small" label={gap.priority} sx={{ maxWidth: "100%", height: "auto", fontWeight: 700, bgcolor: gap.priority === "Critical" ? t.errorBg : gap.priority === "High" ? t.emberBg : t.mist, color: gap.priority === "Critical" ? t.errorInk : gap.priority === "High" ? t.emberStrong : t.slate, "& .MuiChip-label": { whiteSpace: "normal", py: 0.45 } }} />
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top", overflowWrap: "anywhere" }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{gap.topic}</Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top", overflowWrap: "anywhere" }}>
                      <Stack direction="row" gap={0.4} flexWrap="wrap">{gap.channels.map((channel) => <Chip key={channel} size="small" variant="outlined" label={channel} />)}</Stack>
                      <Typography variant="caption" sx={{ display: "block", mt: 0.75 }}>{gap.demand}</Typography><Typography variant="caption" color="success.main">{gap.trend}</Typography>
                    </TableCell>
                    <TableCell sx={{ verticalAlign: "top", overflowWrap: "anywhere" }}><Typography variant="body2" fontWeight={650}>{gap.scope}</Typography><Typography variant="caption" sx={{ display: "block", mt: 0.6 }}>{gap.coverage}</Typography></TableCell>
                    <TableCell sx={{ verticalAlign: "top", overflowWrap: "anywhere" }}><Chip size="small" label={gap.status} sx={{ maxWidth: "100%", height: "auto", "& .MuiChip-label": { whiteSpace: "normal", py: 0.5 } }} /></TableCell>
                    <TableCell sx={{ verticalAlign: "top" }}><Button size="small" sx={{ px: 0, minWidth: 0 }} endIcon={<ArrowForwardOutlinedIcon />} onClick={() => { setSelectedGap(gap); setDecision(""); setNotes(""); setAssignee(""); setWorkType(""); setDueDate(""); setSuccessMeasure(""); }}>Review</Button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </TableContainer>
            <Stack spacing={1.25} sx={{ display: { xs: "flex", md: "none" }, p: 1.5 }}>
              {visibleGaps.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((gap) => <Paper key={gap.topic} variant="outlined" sx={{ p: 1.75 }}>
                <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start"><Box><Chip size="small" label={gap.priority} /><Typography variant="subtitle2" sx={{ mt: 0.75 }}>{gap.topic}</Typography></Box><Chip size="small" label={gap.status} /></Stack>
                <Stack direction="row" gap={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>{gap.channels.map((channel) => <Chip key={channel} size="small" variant="outlined" label={channel} />)}</Stack>
                <Typography variant="caption" sx={{ display: "block", mt: 1 }}>{gap.demand} - {gap.trend}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 1.5 }}>Scope and coverage</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>{gap.scope}. {gap.coverage}</Typography>
                <Button size="small" endIcon={<ArrowForwardOutlinedIcon />} sx={{ mt: 1.25 }} onClick={() => { setSelectedGap(gap); setDecision(""); setNotes(""); setAssignee(""); setWorkType(""); setDueDate(""); setSuccessMeasure(""); }}>Review candidate</Button>
              </Paper>)}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ px: 2.5, py: 1.5, borderTop: "1px solid " + t.border }}>
              <Typography variant="caption">Showing {visibleGaps.length === 0 ? 0 : currentPage * pageSize + 1}-{Math.min(visibleGaps.length, (currentPage + 1) * pageSize)} of {visibleGaps.length} matching candidate gaps</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 130 }}><InputLabel>Rows per page</InputLabel><Select value={pageSize} label="Rows per page" onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}>{[10,25,50,100].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl>
                <Button size="small" disabled={currentPage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</Button>
                <Typography variant="caption">Page {currentPage + 1} of {pageCount}</Typography>
                <Button size="small" disabled={currentPage >= pageCount - 1} onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}>Next</Button>
              </Stack>
            </Stack>
            {visibleGaps.length === 0 && <Box sx={{ py: 7, textAlign: "center" }}><Typography color="text.secondary">No candidate gaps match these filters.</Typography></Box>}
          </Paper>
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 1.5 }}>
            {genericReports[reportType].metrics.map(([label,value,change]) => <Paper variant="outlined" sx={{ p: 2 }} key={label}><Typography variant="overline">{label}</Typography><Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}><Typography sx={{ fontSize: "1.6rem", fontWeight: 650 }}>{value}</Typography><Typography variant="caption" color="success.main">{change}</Typography></Stack></Paper>)}
          </Box>
          <Paper variant="outlined" sx={{ mt: 2, overflow: "hidden" }}>
            <Box sx={{ p: 2.5, borderBottom: "1px solid " + t.border }}><Typography variant="subtitle1">Report details</Typography><Typography variant="caption">Select filters above to refine this prototype report.</Typography></Box>
            <TableContainer><Table size="small"><TableHead><TableRow>{genericReports[reportType].headers.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{genericReports[reportType].rows.map((row) => <TableRow hover key={row[0]}>{row.map((cell,i) => <TableCell key={i} sx={{ fontWeight: i === 0 ? 650 : 400 }}>{cell}</TableCell>)}</TableRow>)}</TableBody></Table></TableContainer>
          </Paper>
        </>
      )}

      <Dialog open={Boolean(selectedOpportunity)} onClose={() => setSelectedOpportunity(null)} maxWidth="md" fullWidth>
        {selectedOpportunity && <>
          <DialogTitle>Review new knowledge recommendation</DialogTitle>
          <DialogContent>
            <Typography variant="overline">Proposed article</Typography><Typography variant="h6">{selectedOpportunity.proposedTitle}</Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>{selectedOpportunity.channels.map((value) => <Chip key={value} size="small" label={value} />)}<Chip size="small" variant="outlined" label={"Confidence: " + selectedOpportunity.confidence} /></Stack>
            <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <Box><Typography variant="subtitle2">Employee need</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedOpportunity.intent}</Typography></Box>
              <Box><Typography variant="subtitle2">Coverage review</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedOpportunity.coverage}</Typography></Box>
            </Box>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Suggested content outline</Typography><Stack component="ul" spacing={0.4} sx={{ mt: 0.5, pl: 2.2 }}>{selectedOpportunity.outline.map((value) => <Typography component="li" variant="body2" key={value}>{value}</Typography>)}</Stack>
            <Alert severity="info" icon={<AutoAwesomeOutlinedIcon />} sx={{ mt: 2 }}><strong>AI recommendation:</strong> {selectedOpportunity.whyNew}</Alert>
            <FormControl fullWidth sx={{ mt: 2 }}><InputLabel>Decision</InputLabel><Select value={opportunityDecision} label="Decision" onChange={(e) => setOpportunityDecision(e.target.value)}>{["Approve new knowledge recommendation","Improve an existing article instead","Fix search, access, or taxonomy","Split into scoped recommendations","Monitor for more evidence","Reject recommendation"].map((value) => <MenuItem value={value} key={value}>{value}</MenuItem>)}</Select></FormControl>
            {opportunityAssignmentRequired && <Paper variant="outlined" sx={{ mt: 2, p: 2 }}><Typography variant="subtitle2">Assignment and success plan</Typography><Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              <FormControl fullWidth><InputLabel>Team Admin</InputLabel><Select value={assignee} label="Team Admin" onChange={(e) => setAssignee(e.target.value)}>{["Alfonso Ibarra - Content Governance","Alexis Nguyen - People Operations","Cameron Reed - Finance Operations","Jamie Park - Supply Chain Enablement","Casey Morgan - Employee Services"].map((value) => <MenuItem value={value} key={value}>{value}</MenuItem>)}</Select></FormControl>
              <FormControl fullWidth><InputLabel>Work type</InputLabel><Select value={workType} label="Work type" onChange={(e) => setWorkType(e.target.value)}>{["Create new content","Improve existing content","Search or configuration fix","Further research"].map((value) => <MenuItem value={value} key={value}>{value}</MenuItem>)}</Select></FormControl>
              <TextField fullWidth type="date" label="Target completion date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField fullWidth label="Success measure" value={successMeasure} onChange={(e) => setSuccessMeasure(e.target.value)} />
            </Box></Paper>}
            <TextField fullWidth multiline minRows={3} label="Decision rationale or routing note" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 2 }} />
          </DialogContent>
          <DialogActions><Button onClick={() => setSelectedOpportunity(null)}>Cancel</Button><Button variant="contained" disabled={!opportunityDecision || !notes.trim() || (opportunityAssignmentRequired && (!assignee || !workType || !dueDate || !successMeasure.trim()))} onClick={() => setSelectedOpportunity(null)}>{opportunityAssignmentRequired ? "Send assignment" : "Save decision"}</Button></DialogActions>
        </>}
      </Dialog>

      <Dialog open={Boolean(selectedGap)} onClose={() => setSelectedGap(null)} maxWidth="md" fullWidth>
        {selectedGap && <>
          <DialogTitle>Review candidate gap</DialogTitle>
          <DialogContent>
            <Typography variant="h6">{selectedGap.topic}</Typography>
            <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>{selectedGap.channels.map((c) => <Chip key={c} size="small" label={c} />)}<Chip size="small" variant="outlined" label={selectedGap.scope} /></Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2">Evidence</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedGap.evidence}</Typography>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Scope compatibility</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedGap.coverage}. Review audience, access, country, authority, and effective dates before merging or assigning.</Typography>
            <Alert severity="info" icon={<AutoAwesomeOutlinedIcon />} sx={{ mt: 2 }}><strong>AI recommendation:</strong> {selectedGap.recommendation}</Alert>
            <FormControl fullWidth sx={{ mt: 2 }}><InputLabel>Decision</InputLabel><Select value={decision} label="Decision" onChange={(e) => setDecision(e.target.value)}>{["Confirm as a gap","Monitor for more evidence","Mark as false positive","Identify access or search configuration problem","Split by scope","Route to Team Admin"].map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
            {assignmentRequired && <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle2">Assignment and mitigation plan</Typography>
              <Typography variant="caption">AI can recommend a destination; the Super Admin confirms the accountable Team Admin and outcome.</Typography>
              <Box sx={{ mt: 1.5, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                <FormControl fullWidth><InputLabel>Team Admin</InputLabel><Select value={assignee} label="Team Admin" onChange={(e) => setAssignee(e.target.value)}>{["Alfonso Ibarra - Content Governance","Alexis Nguyen - People Operations","Cameron Reed - Finance Operations","Jamie Park - Supply Chain Enablement","Casey Morgan - Employee Services"].map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
                <FormControl fullWidth><InputLabel>Work type</InputLabel><Select value={workType} label="Work type" onChange={(e) => setWorkType(e.target.value)}>{["Create new content","Improve existing content","Search or configuration fix","Further research"].map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
                <TextField fullWidth type="date" label="Target completion date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                <TextField fullWidth label="Success measure" placeholder="Example: no-answer rate below 5%" value={successMeasure} onChange={(e) => setSuccessMeasure(e.target.value)} />
              </Box>
              <Typography variant="caption" sx={{ display: "block", mt: 1.25 }}>The Team Admin may accept, collaborate, suggest another team, ask for clarification, or challenge the assignment with a reason.</Typography>
            </Paper>}
            <TextField fullWidth multiline minRows={3} label="Decision rationale or routing note" value={notes} onChange={(e) => setNotes(e.target.value)} sx={{ mt: 2 }} />
            <Typography variant="caption" sx={{ display: "block", mt: 1.25 }}>AI cannot merge, retire, publish, or change access. Team Admin challenges and Super Admin overrides remain recorded in the audit history.</Typography>
          </DialogContent>
          <DialogActions><Button onClick={() => setSelectedGap(null)}>Cancel</Button><Button variant="contained" disabled={!decision || !notes.trim() || (assignmentRequired && (!assignee || !workType || !dueDate || !successMeasure.trim()))} onClick={() => setSelectedGap(null)}>{assignmentRequired ? "Send assignment" : "Save decision"}</Button></DialogActions>
        </>}
      </Dialog>
    </Box>
  );
}
