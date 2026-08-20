import { Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
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
                startIcon={<FolderOutlinedIcon sx={{ fontSize: 22 }} />}
                endIcon={<KeyboardArrowRightIcon sx={{ fontSize: 16 }} />}
                sx={{
                  justifyContent: "space-between",
                  minHeight: 48,
                  px: 1.125,
                  py: 1,
                  borderRadius: "8px",
                  borderColor: t.articleDivider,
                  color: t.pepsiBlue,
                  fontFamily: theme.palette.fonts.articleBody,
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  lineHeight: 1.25,
                  textAlign: "left",
                  whiteSpace: "normal",
                  textTransform: "none",
                  "& .MuiButton-startIcon": { color: t.pepsiNavy, mr: 1 },
                  "& .MuiButton-endIcon": { color: t.pepsiNavy, ml: 0.75 },
                  "& .MuiButton-icon": { flexShrink: 0 },
                  "&:hover": {
                    bgcolor: t.pepsiBlueSubtle,
                    borderColor: t.pepsiNavy,
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
