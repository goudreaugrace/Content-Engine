import { useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Collapse,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import type { ApprovalRuleResult } from "../lib/api";

/**
 * Renders the Phase C rules-engine output. Two parts:
 *  1. A status banner — green "Safe to approve" with one-click Approve when
 *     `autoApproveCandidate` is true. Yellow "Needs attention" when not.
 *  2. A collapsible pass/fail checklist below.
 *
 * Stays mounted on article-detail and the review queue — same component, both
 * surfaces. No-op render when there are no results (legacy articles created
 * before Phase C).
 */
export default function ApprovalChecklist({
  results,
  autoApproveCandidate,
  onApprove,
  approving,
}: {
  results: ApprovalRuleResult[] | undefined;
  autoApproveCandidate: boolean | undefined;
  /** Optional one-click approve callback — banner only renders the button when this is set. */
  onApprove?: () => void;
  approving?: boolean;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [open, setOpen] = useState(false);

  if (!results || results.length === 0) return null;

  const errorCount = results.filter((r) => r.severity === "error").length;
  const warningCount = results.filter((r) => r.severity === "warning").length;
  const okCount = results.filter((r) => r.severity === "ok").length;

  const isCandidate = autoApproveCandidate && errorCount === 0;
  const accent = isCandidate ? t.successInk : t.ember;
  const bg = isCandidate ? t.successBg : "rgba(213, 110, 12, 0.08)";

  return (
    <Box
      sx={{
        mb: 3,
        // M3 outlined container for severity surfaces: the colored border
        // carries the meaning. Slightly larger radius matches the M3 card spec.
        border: `1px solid ${accent}`,
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: bg,
      }}
    >
      {/* ─── Banner ─── */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 2, py: 1.5 }}
      >
        {isCandidate ? (
          <CheckCircleIcon sx={{ color: accent, fontSize: 20 }} />
        ) : (
          <WarningAmberIcon sx={{ color: accent, fontSize: 20 }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.875rem", fontWeight: 600, color: t.ink }}>
            {isCandidate
              ? "Safe to approve — all checks passed"
              : `Needs attention — ${errorCount > 0 ? `${errorCount} error${errorCount === 1 ? "" : "s"}` : ""}${
                  errorCount > 0 && warningCount > 0 ? ", " : ""
                }${warningCount > 0 ? `${warningCount} warning${warningCount === 1 ? "" : "s"}` : ""}`}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: t.slate, mt: 0.25 }}>
            {okCount} of {results.length} checks passed
          </Typography>
        </Box>
        {isCandidate && onApprove && (
          <Button
            variant="contained"
            size="small"
            onClick={onApprove}
            disabled={approving}
          >
            {approving ? "Approving…" : "Approve"}
          </Button>
        )}
        <Button
          size="small"
          onClick={() => setOpen((o) => !o)}
          endIcon={
            open ? (
              <ExpandLessIcon sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
            )
          }
          sx={{ color: t.slate, fontSize: "0.75rem" }}
        >
          {open ? "Hide" : "Details"}
        </Button>
      </Stack>

      {/* ─── Checklist ─── */}
      <Collapse in={open}>
        <Box
          sx={{
            borderTop: `1px solid ${t.border}`,
            bgcolor: t.paper,
            px: 2,
            py: 1.5,
          }}
        >
          <Stack spacing={1}>
            {results.map((r) => (
              <RuleRow key={r.id} result={r} />
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

function RuleRow({ result }: { result: ApprovalRuleResult }) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const Icon =
    result.severity === "ok"
      ? CheckCircleIcon
      : result.severity === "warning"
        ? WarningAmberIcon
        : ErrorOutlineIcon;
  const color =
    result.severity === "ok"
      ? t.successInk
      : result.severity === "warning"
        ? t.ember
        : t.errorInk;
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Icon sx={{ fontSize: 16, color, mt: "1px", flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.8125rem", color: t.ink, lineHeight: 1.4 }}>
          {result.label}
        </Typography>
        {result.reason && (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: t.slate,
              lineHeight: 1.45,
              mt: 0.25,
            }}
          >
            {result.reason}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
