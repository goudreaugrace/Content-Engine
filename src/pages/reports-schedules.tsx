import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
  useTheme,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import EventRepeatOutlinedIcon from "@mui/icons-material/EventRepeatOutlined";
import { usePersonaMode } from "../lib/persona";

const reportNames: Record<string,string> = {
  gaps: "Knowledge Demand and Gaps", discovery: "Search and Answer Performance",
  governance: "Content Governance and Maintenance", feedback: "Employee Feedback and Content Quality",
  optimization: "Optimization Outcomes",
};

type ScheduleRow = { name: string; cadence: string; next: string; owner: string; collaborators: string; recipients: string; format: string; status: string };

export default function ReportsSchedules() {
  const [personaMode] = usePersonaMode();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const createType = params.get("create") ?? "";
  const [createOpen, setCreateOpen] = useState(Boolean(createType));
  const [reviewOpen, setReviewOpen] = useState(false);
  const [draft, setDraft] = useState("Knowledge health improved this month, with stronger search success and review compliance. The largest remaining risks are regional policy gaps, overdue high-risk pages, and unresolved ownership.");
  const [instruction, setInstruction] = useState("");
  const [rows, setRows] = useState<ScheduleRow[]>([
    { name: "Monthly Knowledge Health", cadence: "Monthly · 1st", next: "September 16, 2026", owner: "Alfonso Ibarra", collaborators: "Alina Corral · Sofia Gonzalez", recipients: "Global Content LT distribution list", format: "PDF + Excel", status: "Summary review due" },
    { name: "Quarterly Search & AI Outcomes", cadence: "Quarterly", next: "October 5, 2026", owner: "Alfonso Ibarra", collaborators: "Marco Diaz", recipients: "Portal Governance Council", format: "PDF", status: "Approved" },
    { name: "Weekly Governance Exceptions", cadence: "Weekly · Monday", next: "September 7, 2026", owner: "Alfonso Ibarra", collaborators: "Itzel Ayala Quezada", recipients: "myPepsiCo Content Operations", format: "Excel", status: "Data only" },
  ]);

  if (personaMode !== "super-admin") return <Navigate to="/" replace />;

  const addPreset = () => {
    setRows((old) => [{ name: reportNames[createType] ? "Monthly " + reportNames[createType] : "Custom Knowledge Health Report", cadence: "Monthly · 1st", next: "October 1, 2026", owner: "Alfonso Ibarra", collaborators: "Not assigned", recipients: "Draft recipients", format: "PDF", status: "Draft" }, ...old]);
    setCreateOpen(false);
  };

  return <Box sx={{ maxWidth: 1400, mx: "auto" }}>
    <Button size="small" startIcon={<ArrowBackOutlinedIcon />} onClick={() => navigate("/super-admin")}>Back to dashboard</Button>
    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-start" }} gap={2} sx={{ mt: 1.5 }}>
      <Box><Typography variant="overline">Super Admin reporting</Typography><Typography variant="h4" sx={{ mt: 0.25 }}>Reports & Schedules</Typography><Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 780 }}>Build reusable reports, collaborate on AI-assisted narratives, and manage delivery to Content Engine users or email distribution lists.</Typography></Box>
      <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => setCreateOpen(true)}>Create custom report</Button>
    </Stack>

    <Alert severity="warning" sx={{ mt: 3 }}>
      <strong>You haven’t completed the AI summary review for Monthly Knowledge Health.</strong> Its next publication is in 12 days. Review with AI, send data only, delay this cycle, or skip it. If no one decides, delivery remains on hold.
    </Alert>

    <Paper variant="outlined" sx={{ mt: 2.5, overflow: "hidden" }}>
      <Box sx={{ px: 2.5, py: 2, borderBottom: "1px solid " + t.border }}><Typography variant="subtitle1">Saved reports</Typography><Typography variant="caption">Owners control the schedule; collaborators and backup reviewers can help prepare and approve each cycle.</Typography></Box>
      <TableContainer><Table size="small" sx={{ minWidth: 1120 }}>
        <TableHead><TableRow>{["Report","Cadence / next delivery","Owner & collaborators","Recipients","Format","Status","Actions"].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map((row) => <TableRow hover key={row.name}>
          <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
          <TableCell><Typography variant="body2">{row.cadence}</Typography><Typography variant="caption">{row.next}</Typography></TableCell>
          <TableCell><Typography variant="body2">{row.owner}</Typography><Typography variant="caption">{row.collaborators}</Typography></TableCell>
          <TableCell>{row.recipients}</TableCell><TableCell>{row.format}</TableCell>
          <TableCell><Chip size="small" label={row.status} sx={{ bgcolor: row.status.includes("due") ? t.emberBg : t.mist, color: row.status.includes("due") ? t.emberStrong : t.slate, fontWeight: 650 }} /></TableCell>
          <TableCell><Stack direction="row" spacing={0.5}>{row.status.includes("due") && <Button size="small" startIcon={<AutoAwesomeOutlinedIcon />} onClick={() => setReviewOpen(true)}>Review with AI</Button>}<Button size="small">Manage</Button></Stack></TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </Paper>

    <Paper variant="outlined" sx={{ mt: 2.5, p: 2.5 }}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start"><EventRepeatOutlinedIcon color="primary" /><Box><Typography variant="subtitle1">Delivery safeguards in this prototype</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>External recipients receive a PDF or Excel attachment—not Content Engine access. AI narrative and human commentary stay editable while source metrics remain locked. Reminders scale by cadence; monthly and quarterly cycles notify reviewers 14, 7, and 1 day before delivery.</Typography></Box></Stack>
    </Paper>

    <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Save or schedule report</DialogTitle><DialogContent>
        <TextField fullWidth label="Report name" defaultValue={reportNames[createType] ? "Monthly " + reportNames[createType] : ""} sx={{ mt: 1 }} />
        <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 2 }}>
          <FormControl fullWidth><InputLabel>Cadence</InputLabel><Select defaultValue="Monthly" label="Cadence">{["One time","Weekly","Monthly","Quarterly"].map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
          <FormControl fullWidth><InputLabel>Format</InputLabel><Select defaultValue="PDF" label="Format">{["PDF","Excel","PDF + Excel"].map((v) => <MenuItem value={v} key={v}>{v}</MenuItem>)}</Select></FormControl>
        </Stack>
        <TextField fullWidth label="Collaborators or backup reviewer" placeholder="Search the PepsiCo directory" sx={{ mt: 2 }} />
        <TextField fullWidth label="Recipients or distribution lists" placeholder="People, email addresses, or distribution lists" helperText="Recipients without tool access receive attachments only." sx={{ mt: 2 }} />
        <FormControl fullWidth sx={{ mt: 2 }}><InputLabel>AI summary</InputLabel><Select defaultValue="Draft and require human approval" label="AI summary"><MenuItem value="Draft and require human approval">Draft and require human approval</MenuItem><MenuItem value="Data only">Data only</MenuItem></Select></FormControl>
      </DialogContent><DialogActions><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="contained" onClick={addPreset}>Save report</Button></DialogActions>
    </Dialog>

    <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>Review AI summary · Monthly Knowledge Health</DialogTitle><DialogContent>
        <Alert severity="info">Source metrics are locked. AI narrative and human commentary can be revised without changing the underlying data.</Alert>
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Current draft</Typography>
        <TextField fullWidth multiline minRows={5} value={draft} onChange={(e) => setDraft(e.target.value)} sx={{ mt: 1 }} />
        <Typography variant="subtitle2" sx={{ mt: 2 }}>Work with AI</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}><TextField fullWidth value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="For example: Make this more concise and lead with measurable progress." /><Button variant="outlined" disabled={!instruction.trim()} onClick={() => { setDraft(draft + "\n\nRevision note: " + instruction); setInstruction(""); }}>Apply revision</Button></Stack>
      </DialogContent><DialogActions><Button onClick={() => setReviewOpen(false)}>Send data only</Button><Button onClick={() => setReviewOpen(false)}>Delay</Button><Button onClick={() => setReviewOpen(false)}>Skip cycle</Button><Button variant="contained" onClick={() => setReviewOpen(false)}>Approve summary</Button></DialogActions>
    </Dialog>
  </Box>;
}
