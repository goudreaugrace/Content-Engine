import { Box, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";

type DetailRow = {
  label: string;
  value: ReactNode;
};

type DetailCard = {
  title: string;
  rows?: DetailRow[];
  children?: ReactNode;
};

type Props = {
  eyebrow?: string;
  helper?: string;
  action?: ReactNode;
  leftRail?: ReactNode;
  article: ReactNode;
  details?: DetailCard[];
  detailsNode?: ReactNode;
  maxArticleWidth?: number | string;
};

export default function ArticleReviewFrame({
  eyebrow = "Article preview",
  helper = "Reader-facing article view with publishing metadata.",
  action,
  leftRail,
  article,
  details = [],
  detailsNode,
  maxArticleWidth = "minmax(0, 1fr)",
}: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const articleColumn =
    typeof maxArticleWidth === "number" ? `${maxArticleWidth}px` : maxArticleWidth;

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        sx={{ mb: 1.25 }}
      >
        <Box>
          <Typography sx={{ fontSize: "0.9375rem", fontWeight: 700, color: t.ink }}>
            {eyebrow}
          </Typography>
          <Typography sx={{ mt: 0.25, fontSize: "0.75rem", color: t.granite }}>
            {helper}
          </Typography>
        </Box>
        {action}
      </Stack>

      <Box
        sx={{
          bgcolor: "#EAF4FB",
          borderRadius: 2.5,
          p: { xs: 1, md: 1.75 },
          overflowX: "auto",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: leftRail
                ? "164px minmax(0, 1fr) 280px"
                : `${articleColumn} 280px`,
              xl: leftRail
                ? "176px minmax(0, 1fr) 300px"
                : `${articleColumn} 300px`,
            },
            gap: { xs: 1.5, xl: 2 },
            alignItems: "start",
          }}
        >
          {leftRail}
          {article}
          <Stack spacing={2} sx={{ position: { lg: "sticky" }, top: { lg: 20 } }}>
            {detailsNode}
            {details.map((card) => (
              <Box
                key={card.title}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: "#FFFFFF",
                  boxShadow: "0 12px 32px rgba(0, 46, 93, 0.10)",
                }}
              >
                <Typography sx={{ fontSize: "1rem", fontWeight: 800, color: t.ink, mb: 1.5 }}>
                  {card.title}
                </Typography>
                {card.rows && (
                  <Stack spacing={1.1}>
                    {card.rows.map((row) => (
                      <Box key={row.label}>
                        <Typography sx={{ fontSize: "0.6875rem", color: t.granite, mb: 0.25 }}>
                          {row.label}
                        </Typography>
                        <Box sx={{ fontSize: "0.8125rem", fontWeight: 650, color: t.ink, lineHeight: 1.35 }}>
                          {row.value}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
                {card.children}
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
