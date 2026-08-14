import { Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import ArticleReviewFrame, { type DetailCard } from "./article-review-frame";
import { articleAnchorId, articleSectionsFromMarkdown } from "./article-document";

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
  body,
  article,
  tags = [],
  quickLinks = [],
  selectedLocale,
  primaryLocale,
  availableLocales = [],
  details = [],
}: Props) {
  const sections = articleSectionsFromMarkdown(body);

  return (
    <ArticleReviewFrame
      showHeader={false}
      article={article}
      detailsNode={
        <ArticleSideRail
          tags={tags}
          sections={sections}
          quickLinks={quickLinks}
          selectedLocale={selectedLocale}
          primaryLocale={primaryLocale}
          availableLocales={availableLocales}
        />
      }
      details={details}
    />
  );
}

function ArticleSideRail({
  tags,
  sections,
  quickLinks,
  selectedLocale,
  primaryLocale,
  availableLocales,
}: {
  tags: string[];
  sections: string[];
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
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: "#FFFFFF",
        border: `1px solid ${t.articleDivider}`,
      }}
    >
      <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: t.pepsiNavy, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );

  return (
    <Stack spacing={1.5}>
      {tags.length > 0 && (
        <RailCard title="Tags">
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
            {tags.slice(0, 6).map((label) => (
              <Chip
                key={label}
                size="small"
                label={label}
                color="primary"
                variant="outlined"
                sx={{ height: 24, fontSize: "0.6875rem" }}
              />
            ))}
          </Stack>
        </RailCard>
      )}

      <RailCard title="Table of Contents">
        {sections.length ? (
          <Stack spacing={0.35}>
            {sections.map((section) => (
              <Button
                key={section}
                component="a"
                href={`#${articleAnchorId(section)}`}
                size="small"
                variant="text"
                sx={{
                  justifyContent: "flex-start",
                  minHeight: 28,
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 1,
                  color: t.pepsiBlue,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  lineHeight: 1.25,
                  textAlign: "left",
                  whiteSpace: "normal",
                }}
              >
                {section}
              </Button>
            ))}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
            No sections detected.
          </Typography>
        )}
      </RailCard>

      {quickLinks.length > 0 && (
        <RailCard title="Quick Links">
          <Stack spacing={0.75}>
            {quickLinks.map((link) => (
              <Button
                key={link.label}
                component={link.href ? "a" : "button"}
                href={link.href}
                size="small"
                variant="outlined"
                onClick={link.onClick}
                disabled={link.disabled}
                sx={{ justifyContent: "flex-start", borderRadius: 1.25 }}
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
