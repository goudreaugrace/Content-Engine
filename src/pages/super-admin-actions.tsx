import { useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { usePersonaMode } from "../lib/persona";
import {
  ACTION_CATEGORY_LABELS,
  actionItems,
  type ActionCategory,
  type RegionKey,
} from "./super-admin-dashboard";

const REGIONS: Array<{ value: RegionKey; label: string }> = [
  { value: "all", label: "All regions" },
  { value: "NA", label: "North America (NA)" },
  { value: "LATAM", label: "Latin America (LATAM)" },
  { value: "EMEA", label: "Europe, Middle East & Africa (EMEA)" },
  { value: "APAC", label: "Asia Pacific (APAC)" },
];

function recommendationFor(category: Exclude<ActionCategory, "all">) {
  const recommendations: Record<Exclude<ActionCategory, "all">, string> = {
    gaps: "Review the aggregated evidence, compare related content and scope conflicts, then confirm, monitor, split, merge, or dismiss the candidate gap.",
    ownership: "Review the proposed team, challenge history, authoritative source, and workload before confirming or changing the ownership request.",
    "content-risk": "Review the article, deadline, traffic, and business risk. AI cannot retire, archive, merge, or publish content without your decision.",
    feedback: "Compare normalized feedback across Article, Genius, and Ask Pep signals before deciding whether content or findability needs attention.",
    reports: "Work with AI on the narrative, approve a data-only fallback, delay this delivery, or skip this reporting cycle.",
    search: "Confirm that useful content exists and has compatible access before changing metadata, taxonomy, synonyms, or retrieval configuration.",
  };
  return recommendations[category];
}

export default function SuperAdminActions() {
  const [personaMode] = usePersonaMode();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const requestedRegion = searchParams.get("region");
  const [region, setRegion] = useState<RegionKey>(
    REGIONS.some((option) => option.value === requestedRegion)
      ? (requestedRegion as RegionKey)
      : "all",
  );
  const [category, setCategory] = useState<ActionCategory>("all");
  const [selectedTask, setSelectedTask] = useState<(typeof actionItems)[number] | null>(null);

  if (personaMode !== "super-admin") return <Navigate to="/" replace />;

  const regionMatches = actionItems.filter(
    (item) => region === "all" || item.region === "all" || item.region === region,
  );
  const visibleTasks = regionMatches.filter(
    (item) => category === "all" || item.category === category,
  );

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Button
        size="small"
        startIcon={<ArrowBackOutlinedIcon />}
        onClick={() => navigate("/super-admin")}
      >
        Back to dashboard
      </Button>

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "flex-start" }}
        gap={2}
        sx={{ mt: 1.5 }}
      >
        <Box>
          <Typography variant="overline">Super Admin governance</Typography>
          <Typography variant="h4" sx={{ mt: 0.25 }}>Recommended Tasks</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 760 }}>
            Review AI-recommended work across knowledge gaps, ownership, content risk, feedback, reports, and search configuration. Every recommendation requires human judgment.
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="task-region-label">Region</InputLabel>
          <Select
            labelId="task-region-label"
            value={region}
            label="Region"
            onChange={(event) => setRegion(event.target.value as RegionKey)}
          >
            {REGIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          {(Object.keys(ACTION_CATEGORY_LABELS) as ActionCategory[]).map((value) => {
            const count = regionMatches.filter(
              (item) => value === "all" || item.category === value,
            ).length;
            return (
              <Button
                key={value}
                size="small"
                variant={category === value ? "contained" : "outlined"}
                onClick={() => setCategory(value)}
                sx={{ textTransform: "none" }}
              >
                {ACTION_CATEGORY_LABELS[value]} ({count})
              </Button>
            );
          })}
        </Stack>
      </Paper>

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {visibleTasks.map((item) => (
          <Paper
            key={item.id}
            variant="outlined"
            sx={{
              p: { xs: 2, md: 2.5 },
              borderLeft: `4px solid ${
                item.priority === "Critical"
                  ? t.errorInk
                  : item.priority === "High"
                    ? t.emberStrong
                    : t.pepsiBlue
              }`,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) auto" },
                gap: 2,
                alignItems: "center",
              }}
            >
              <Box>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
                  <Chip
                    size="small"
                    label={item.priority}
                    sx={{
                      bgcolor:
                        item.priority === "Critical"
                          ? t.errorBg
                          : item.priority === "High"
                            ? t.emberBg
                            : t.mist,
                      color:
                        item.priority === "Critical"
                          ? t.errorInk
                          : item.priority === "High"
                            ? t.emberStrong
                            : t.slate,
                      fontWeight: 700,
                    }}
                  />
                  <Chip size="small" variant="outlined" label={ACTION_CATEGORY_LABELS[item.category]} />
                  <Typography variant="caption">Waiting {item.waiting}</Typography>
                </Stack>
                <Typography sx={{ mt: 0.9, fontSize: "1rem", fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.45 }}>
                  {item.reason}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 0.75 }}>
                  {item.scope}
                </Typography>
              </Box>
              <Button
                variant={item.priority === "Critical" ? "contained" : "outlined"}
                endIcon={<ArrowForwardOutlinedIcon />}
                onClick={() => setSelectedTask(item)}
                sx={{ justifySelf: { lg: "end" }, whiteSpace: "nowrap" }}
              >
                {item.action}
              </Button>
            </Box>
          </Paper>
        ))}
        {visibleTasks.length === 0 && (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <Typography color="text.secondary">No recommended tasks match these filters.</Typography>
          </Box>
        )}
      </Stack>

      <Dialog
        open={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedTask && (
          <>
            <DialogTitle>{selectedTask.title}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={selectedTask.priority} />
                  <Chip size="small" variant="outlined" label={ACTION_CATEGORY_LABELS[selectedTask.category]} />
                  <Chip size="small" variant="outlined" label={selectedTask.scope} />
                </Stack>
                <Box>
                  <Typography variant="subtitle2">Why AI flagged this</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {selectedTask.reason}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
                  <AutoAwesomeOutlinedIcon color="primary" sx={{ mt: 0.15 }} />
                  <Box>
                    <Typography variant="subtitle2">Recommended review</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {recommendationFor(selectedTask.category)}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption">
                  This prototype shows the handoff into detailed review. AI cannot complete the governance decision on its own.
                </Typography>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedTask(null)}>Close</Button>
              <Button
                variant="contained"
                onClick={() => navigate(`/super-admin?detail=${selectedTask.detail}`)}
              >
                View supporting data
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
