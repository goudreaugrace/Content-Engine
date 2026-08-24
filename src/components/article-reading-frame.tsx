import { Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { type ReactNode } from "react";
import ArticleReviewFrame, { type DetailCard } from "./article-review-frame";

type QuickLink = {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
};

type Props = {
  body: string;
  article: ReactNode;
  tags?: string[];
  quickLinks?: QuickLink[];
  selectedLocale?: string;
  primaryLocale?: string;
  availableLocales?: string[];
  details?: DetailCard[];
};

export default function ArticleReadingFrame({
  article,
  tags = [],
  quickLinks = [],
  selectedLocale,
  primaryLocale,
  availableLocales = [],
  details = [],
}: Props) {
  return (
    <Box>
      <ArticleReviewFrame
        showHeader={false}
        article={article}
        detailsNode={
          <ArticleSideRail
            tags={tags}
            quickLinks={quickLinks}
            selectedLocale={selectedLocale}
            primaryLocale={primaryLocale}
            availableLocales={availableLocales}
          />
        }
        details={details}
      />
    </Box>
  );
}

function ArticleSideRail({
  tags,
  quickLinks,
  selectedLocale,
  primaryLocale,
  availableLocales,
}: {
  tags: string[];
  quickLinks: QuickLink[];
  selectedLocale?: string;
  primaryLocale?: string;
  availableLocales: string[];
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const RailCard = ({
    title,
    children,
  }: {
    title: string;
    children: ReactNode;
  }) => (
    <Box
      sx={{
        p: 2,
        borderRadius: "8px",
        bgcolor: t.articleRailBg,
        border: 0,
        fontFamily: theme.palette.fonts.articleBody,
        "& *": {
          fontFamily: theme.palette.fonts.articleBody,
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: theme.palette.fonts.articleBody,
          fontSize: "1rem",
          fontWeight: 700,
          color: t.ink,
          mb: 1.25,
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );

  return (
    <Stack spacing={2}>
      {tags.length > 0 && (
        <RailCard title="Tags">
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {tags.slice(0, 6).map((label) => (
              <Chip
                key={label}
                size="small"
                label={label}
                variant="outlined"
                icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: t.pepsiBlue }} />}
                sx={{
                  height: 24,
                  borderRadius: 0.5,
                  borderColor: t.pepsiNavy,
                  bgcolor: "#A5CBEE",
                  color: t.pepsiNavy,
                  fontFamily: theme.palette.fonts.articleBody,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  "& .MuiChip-icon": { ml: 0.75, mr: -0.25 },
                  "& .MuiChip-label": { px: 0.75 },
                }}
              />
            ))}
          </Stack>
        </RailCard>
      )}

      {quickLinks.length > 0 && (
        <RailCard title="Quick Links">
          <Stack spacing={1.25}>
            {quickLinks.map((link) => (
              <Button
                key={link.label}
                component={link.href ? "a" : "button"}
                href={link.href}
                size="small"
                variant="outlined"
                onClick={link.onClick}
                disabled={link.disabled}
                startIcon={<DescriptionRoundedIcon sx={{ fontSize: 24 }} />}
                endIcon={<OpenInNewRoundedIcon sx={{ fontSize: 17 }} />}
                sx={{
                  justifyContent: "space-between",
                  minHeight: 48,
                  px: 1.125,
                  py: 1,
                  borderRadius: "8px",
                  borderColor: t.articleDivider,
                  bgcolor: "#FFFFFF",
                  color: t.pepsiBlue,
                  fontFamily: theme.palette.fonts.articleBody,
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  lineHeight: 1.25,
                  textAlign: "left",
                  whiteSpace: "normal",
                  textTransform: "none",
                  "& .MuiButton-startIcon": {
                    color: "#6EA8E5",
                    mr: 1.125,
                  },
                  "& .MuiButton-endIcon": {
                    color: t.pepsiBlue,
                    ml: 0.75,
                  },
                  "& .MuiButton-icon": { flexShrink: 0 },
                  "&:hover": {
                    bgcolor: "#F7FBFF",
                    borderColor: t.pepsiBlue,
                    color: t.pepsiBlueStrong,
                    boxShadow: "0 2px 6px rgba(0, 85, 150, 0.12)",
                    "& .MuiButton-startIcon": {
                      color: "#5B9DDD",
                    },
                    "& .MuiButton-endIcon": {
                      color: t.pepsiBlueStrong,
                    },
                  },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
        </RailCard>
      )}

      {selectedLocale && (
        <RailCard title="Language">
          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, color: t.ink }}>
            {selectedLocale}
          </Typography>
          <Typography sx={{ mt: 0.25, fontSize: "0.6875rem", color: t.granite }}>
            {selectedLocale === primaryLocale ? "Original" : "Translation"} · {availableLocales.length || 1} available
          </Typography>
        </RailCard>
      )}
    </Stack>
  );
}
