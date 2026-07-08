import { Box, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";

/**
 * Small stat block shared across the three All-Articles tabs. Each tab's
 * KPI row surfaces different counts (needs-review shows priority buckets,
 * pre-published shows draft statuses, published shows staleness), but
 * the visual pattern is identical so the page reads as one surface.
 */
export function KpiItem({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  /** Optional colored dot rendered before the value, e.g. for urgency
   *  counts. Pass a theme-tokens color to display. */
  accent?: string;
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
        {accent ? (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: accent,
              }}
            />
            <span>{value}</span>
          </Stack>
        ) : (
          value
        )}
      </Typography>
    </Box>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        mt: 1,
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexWrap: "wrap",
      }}
    >
      {children}
    </Box>
  );
}
