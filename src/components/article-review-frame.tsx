import { Box, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";

type DetailRow = {
  label: string;
  value: ReactNode;
};

export type DetailCard = {
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
  showHeader?: boolean;
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
  showHeader = true,
}: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const articleColumn =
    typeof maxArticleWidth === "number" ? `${maxArticleWidth}px` : maxArticleWidth;
  const useFluidArticleColumn = articleColumn === "minmax(0, 1fr)";

  return (
    <Box>
      {showHeader && (
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
      )}

      <Box
        sx={{
          bgcolor: "transparent",
          borderRadius: 0,
          px: 0,
          pt: 0,
          pb: 0,
          overflowX: "auto",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: leftRail
                ? useFluidArticleColumn
                  ? "164px minmax(0, 1fr) 244px"
                  : `164px minmax(0, ${articleColumn}) 244px`
                : useFluidArticleColumn
                  ? "minmax(0, 1fr) 244px"
                  : `minmax(0, ${articleColumn}) 244px`,
              xl: leftRail
                ? useFluidArticleColumn
                  ? "176px minmax(0, 1fr) 252px"
                  : `176px minmax(0, ${articleColumn}) 252px`
                : useFluidArticleColumn
                  ? "minmax(0, 1fr) 252px"
                  : `minmax(0, ${articleColumn}) 252px`,
            },
            width: "100%",
            gap: { xs: 2, lg: 2.5 },
            alignItems: "start",
            justifyContent: useFluidArticleColumn ? "stretch" : "center",
          }}
        >
          {leftRail}
          {article}
          <Stack spacing={1.5} sx={{ position: { lg: "sticky" }, top: { lg: 0 } }}>
            {detailsNode}
            {details.map((card) => (
              <Box
                key={card.title}
                sx={{
                  p: 2,
                  borderRadius: "8px",
                  bgcolor: t.articleRailBg,
                  border: 0,
                  boxShadow: "none",
                }}
              >
                <Typography sx={{ fontFamily: theme.palette.fonts.articleBody, fontSize: "1rem", fontWeight: 700, color: t.ink, mb: 1.5 }}>
                  {card.title}
                </Typography>
                {card.rows && (
                  <Stack spacing={1.1}>
                    {card.rows.map((row) => (
                      <Box key={row.label}>
                        <Typography sx={{ fontSize: "0.72rem", color: t.granite, mb: 0.25, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {row.label}
                        </Typography>
                        <Box sx={{ fontSize: "0.8125rem", fontWeight: 600, color: t.ink, lineHeight: 1.45 }}>
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
