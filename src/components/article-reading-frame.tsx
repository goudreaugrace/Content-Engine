import { Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  const frameRef = useRef<HTMLDivElement | null>(null);
  const sections = useMemo(() => articleSectionsFromMarkdown(body), [body]);
  const sectionIds = useMemo(() => sections.map(articleAnchorId), [sections]);
  const [activeSectionId, setActiveSectionId] = useState(sectionIds[0] ?? "");

  useEffect(() => {
    setActiveSectionId(sectionIds[0] ?? "");
  }, [sectionIds]);

  useEffect(() => {
    const root = frameRef.current;
    if (!root || sectionIds.length === 0) return;

    const headings = sectionIds
      .map((id) => root.querySelector<HTMLElement>(`#${CSS.escape(id)}`))
      .filter((heading): heading is HTMLElement => Boolean(heading));

    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) {
          setActiveSectionId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: [0, 1],
      },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <Box ref={frameRef}>
      <ArticleReviewFrame
        showHeader={false}
        article={article}
        detailsNode={
          <ArticleSideRail
            tags={tags}
            sections={sections}
            activeSectionId={activeSectionId}
            onSectionClick={setActiveSectionId}
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
  sections,
  activeSectionId,
  onSectionClick,
  quickLinks,
  selectedLocale,
  primaryLocale,
  availableLocales,
}: {
  tags: string[];
  sections: string[];
  activeSectionId: string;
  onSectionClick: (id: string) => void;
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

      <RailCard title="Table of Contents">
        {sections.length ? (
          <Stack spacing={1.25}>
            {sections.map((section) => {
              const id = articleAnchorId(section);
              const selected = id === activeSectionId;
              return (
                <Button
                  key={section}
                  component="a"
                  href={`#${id}`}
                  size="small"
                  variant="text"
                  onClick={() => onSectionClick(id)}
                  startIcon={<DescriptionOutlinedIcon sx={{ fontSize: 22 }} />}
                  endIcon={<KeyboardArrowRightIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    justifyContent: "space-between",
                    minHeight: 48,
                    px: 1.125,
                    py: 1,
                    borderRadius: "8px",
                    border: `1px solid ${selected ? t.pepsiNavy : t.articleDivider}`,
                    color: t.pepsiBlue,
                    bgcolor: selected ? t.pepsiBlueSubtle : "transparent",
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
                  {section}
                </Button>
              );
            })}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: "0.75rem", color: t.granite }}>
            No sections detected.
          </Typography>
        )}
      </RailCard>

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
