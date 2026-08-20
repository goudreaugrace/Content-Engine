import { Box, Button, Chip, Stack, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ContentType, Market } from "../lib/api";
import { localeFor } from "../lib/market";
import ArticleReaderActions from "./article-reader-actions";

type Props = {
  body: string;
  market?: Market;
  title?: string;
  lead?: string;
  contentType?: ContentType;
  canonicalSlug?: string;
  localeLabel?: string;
  updatedLabel?: string;
  viewCount?: number;
  showReaderActions?: boolean;
  availableLocales?: string[];
  selectedLocale?: string;
  onLocaleSelect?: (locale: string) => void;
  showContents?: boolean;
  showMastheadMeta?: boolean;
  presentation?: "standard" | "immersive";
  showMasthead?: boolean;
  editableSections?: EditableArticleSection[];
  editingKey?: string | null;
  onEdit?: (key: string) => void;
  onDoneEditing?: () => void;
  onTitleChange?: (value: string) => void;
  onLeadChange?: (value: string) => void;
  titleRecommendations?: string[];
  leadRecommendations?: string[];
  /** Optional owner-view marker, displayed outside the article content. */
  readDepthPercent?: number;
};

export type EditableArticleSection = {
  key: string;
  title: string;
  body: string;
  hideHeading?: boolean;
  recommendations?: string[];
  editor?: ReactNode;
  preview?: ReactNode;
  onTitleChange?: (value: string) => void;
  onBodyChange: (value: string) => void;
};

export function articleAnchorId(value: string) {
  return `section-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function articleSectionsFromMarkdown(body: string): string[] {
  const readerBody = body.replace(/^#\s+.+\n+/, "").trim();
  return Array.from(readerBody.matchAll(/^##\s+(.+?)\s*$/gm)).map((m) =>
    m[1].trim(),
  );
}

function textFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textFromChildren).join("");
  if (isValidElement<{ children?: ReactNode }>(children)) return textFromChildren(children.props.children);
  return "";
}

/**
 * Renders the employee-facing article itself: a PepsiCo-flavored wiki page,
 * not an admin card or PDF export. Governance metadata lives outside this
 * component; this surface should read like what an employee came here to read.
 */
export default function ArticleDocument({
  body,
  market,
  title: titleProp,
  lead,
  contentType,
  canonicalSlug,
  updatedLabel = "Updated: recently",
  viewCount,
  showReaderActions = true,
  availableLocales,
  selectedLocale,
  onLocaleSelect,
  showContents = true,
  showMastheadMeta = true,
  presentation = "standard",
  showMasthead = true,
  editableSections,
  editingKey,
  onEdit,
  onDoneEditing,
  onTitleChange,
  onLeadChange,
  titleRecommendations = [],
  leadRecommendations = [],
  readDepthPercent,
}: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const locale = market ? localeFor(market) : "en-US";
  const parsedTitle = body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim();
  const title = titleProp?.trim() || parsedTitle || "Knowledge article";
  const readerBody = body.replace(/^#\s+.+\n+/, "").trim();
  const sections =
    editableSections?.map((section) => section.title).filter(Boolean) ??
    articleSectionsFromMarkdown(body);
  const isImmersive = presentation === "immersive";
  const isEditable = !!onEdit;
  const editableTitle = titleProp ?? title;
  const editableLead = lead ?? "";

  const editButton = (key: string) =>
    isEditable ? (
      <Button
        size="small"
        variant="outlined"
        className="article-edit-action"
        onClick={() => onEdit?.(key)}
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          minHeight: 30,
          px: 1.25,
          borderRadius: 999,
          bgcolor: "#FFFFFF",
          borderColor: t.border,
          color: t.pepsiBlueStrong,
          fontSize: "0.75rem",
          fontWeight: 700,
          opacity: { xs: 1, md: 0 },
          transition: "opacity 140ms, border-color 140ms, background-color 140ms",
          "&:hover": {
            bgcolor: t.pepsiBlueSubtle,
            borderColor: t.pepsiBlue,
          },
        }}
      >
        Edit
      </Button>
    ) : null;

  const editableBlockSx = {
    position: "relative",
    pr: { xs: 0, md: isEditable ? 8 : 0 },
    py: isEditable ? 0.5 : 0,
    borderRadius: 1.5,
    "&:hover .article-edit-action": {
      opacity: 1,
    },
  } as const;

  const recommendationCallouts = (items?: string[]) => {
    if (!items?.length) return null;
    return (
      <Stack spacing={0.75} sx={{ mt: 1.25, mb: 1.5 }}>
        {items.map((item) => (
          <Stack
            key={item}
            direction="row"
            spacing={0.75}
            alignItems="flex-start"
            sx={{
              maxWidth: isImmersive ? 1040 : 760,
              px: 1.25,
              py: 1,
              borderRadius: 1.25,
              bgcolor: "#FFF8E6",
              border: "1px solid rgba(197, 123, 0, 0.28)",
              color: t.ink,
            }}
          >
            <ErrorOutlineIcon sx={{ mt: 0.1, fontSize: 16, color: t.ember, flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontSize: "0.6875rem", fontWeight: 800, color: t.ember, textTransform: "uppercase", letterSpacing: 0 }}>
                Recommended improvement
              </Typography>
              <Typography sx={{ fontSize: "0.8125rem", color: t.slate, lineHeight: 1.45 }}>
                {item}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    );
  };

  return (
    <Box
      id="top"
      sx={{
        bgcolor: t.surface,
        border: isImmersive ? `1px solid ${t.articleDivider}` : 0,
        borderRadius: isImmersive ? "8px" : 0,
        overflow: "hidden",
        maxWidth: isImmersive ? "none" : 960,
        boxShadow: isImmersive ? "0 1px 3px rgba(15, 23, 42, 0.05)" : "none",
      }}
    >
      {isImmersive && showMasthead && <Box sx={{ height: 6, bgcolor: t.pepsiBlueDeep }} />}
      {/* Reader masthead */}
      {showMasthead && (
        <Box
          sx={{
            px: { xs: 2.5, md: 4 },
            py: 1.25,
            borderBottom: `1px solid ${t.articleDivider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            bgcolor: isImmersive ? t.articleRailBg : t.paper,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <PepsiMark />
            <Typography
              sx={{
                fontFamily: theme.palette.fonts.sans,
                fontWeight: 800,
                fontSize: "0.8125rem",
                letterSpacing: 0,
                color: t.pepsiNavy,
              }}
            >
              pepsico
            </Typography>
            <Box
              sx={{
                width: 1,
                height: 14,
                  bgcolor: t.articleDivider,
                mx: 0.5,
              }}
            />
            <Typography
              sx={{
                fontFamily: theme.palette.fonts.sans,
                fontWeight: 500,
                fontSize: "0.8125rem",
                color: t.slate,
              }}
              noWrap
            >
              myPortal Knowledge
            </Typography>
            {isImmersive && (
              <Typography
                sx={{
                  display: { xs: "none", md: "block" },
                  fontSize: "0.75rem",
                  color: t.granite,
                  ml: 0.5,
                }}
                noWrap
              >
                Food. Drinks. Smiles.
              </Typography>
            )}
          </Box>
          {showMastheadMeta && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              {contentType && <Chip size="small" label={contentType} sx={{ height: 22 }} />}
              <Typography
                sx={{
                  fontFamily: theme.palette.fonts.mono,
                  fontWeight: 500,
                  fontSize: "0.6875rem",
                  letterSpacing: 0,
                  color: t.granite,
                }}
              >
                {locale.toUpperCase()}
              </Typography>
            </Stack>
          )}
        </Box>
      )}

      {/* Article header */}
      <Box
        sx={{
          px: { xs: 2.5, md: isImmersive ? 5 : 4 },
          pt: { xs: 2.75, md: isImmersive ? 4.25 : 3.5 },
          pb: { xs: 2, md: 2.25 },
        }}
      >
        {showReaderActions && (
          <ArticleReaderActions
            selectedLocale={selectedLocale ?? locale}
            availableLocales={availableLocales ?? [selectedLocale ?? locale]}
            onLocaleSelect={onLocaleSelect}
          />
        )}
        <Box sx={editableBlockSx}>
          {editingKey === "title" && onTitleChange ? (
            <Stack spacing={1}>
              <TextField
                autoFocus
                fullWidth
                variant="standard"
                value={editableTitle}
                onChange={(event) => onTitleChange(event.target.value)}
                InputProps={{
                  disableUnderline: true,
                sx: {
                    fontFamily: theme.palette.fonts.articleTitle,
                    fontSize: { xs: "2.25rem", md: isImmersive ? "2.85rem" : "2.5rem" },
                    fontWeight: 800,
                    lineHeight: 0.95,
                    color: t.pepsiNavy,
                  },
                }}
              />
              <Box>
                <Button size="small" variant="contained" onClick={onDoneEditing}>
                  Done
                </Button>
              </Box>
              {recommendationCallouts(titleRecommendations)}
            </Stack>
          ) : (
            <>
              <Typography
                component="h1"
                sx={{
                  fontFamily: theme.palette.fonts.articleTitle,
                  fontSize: { xs: "2.45rem", md: isImmersive ? "3.35rem" : "2.85rem" },
                  fontWeight: 800,
                  letterSpacing: 0,
                  lineHeight: 0.92,
                  color: t.pepsiNavy,
                  mb: 1.4,
                }}
              >
                {title}
              </Typography>
              {editButton("title")}
              {recommendationCallouts(titleRecommendations)}
            </>
          )}
        </Box>
        {showMastheadMeta && (
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            flexWrap="wrap"
            alignItems="center"
            sx={{
              mb: 1.5,
              fontFamily: theme.palette.fonts.articleBody,
              color: t.ink,
              fontSize: "0.875rem",
            }}
          >
            <Typography sx={{ fontSize: "inherit", fontWeight: 500, color: t.ink }}>
              {updatedLabel}
            </Typography>
            {viewCount !== undefined && (
              <Stack direction="row" spacing={1} alignItems="center">
                <VisibilityOutlinedIcon sx={{ fontSize: 18, color: t.ink }} />
                <Typography sx={{ fontSize: "inherit", fontWeight: 500, color: t.ink }}>
                  {viewCount} Views
                </Typography>
              </Stack>
            )}
          </Stack>
        )}
        {(lead || editingKey === "lead" || leadRecommendations.length > 0) && (
          <Box sx={editableBlockSx}>
            {editingKey === "lead" && onLeadChange ? (
              <Stack spacing={1}>
                <TextField
                  autoFocus
                  fullWidth
                  multiline
                  minRows={3}
                  variant="filled"
                  label="Summary"
                  value={editableLead}
                  onChange={(event) => onLeadChange(event.target.value)}
                  InputProps={{ disableUnderline: true }}
                  sx={{
                    "& .MuiInputBase-root": {
                      bgcolor: t.surfaceContainerLow,
                      borderRadius: 1.5,
                      fontSize: isImmersive ? "1.125rem" : "1.0625rem",
                      lineHeight: 1.65,
                    },
                  }}
                />
                <Box>
                  <Button size="small" variant="contained" onClick={onDoneEditing}>
                    Done
                  </Button>
                </Box>
                {recommendationCallouts(leadRecommendations)}
              </Stack>
            ) : (
              <>
          <Typography
            sx={{
              maxWidth: isImmersive ? 1040 : 760,
              color: t.inkSoft,
              fontSize: { xs: "0.9375rem", md: "1rem" },
              lineHeight: 1.65,
              mb: 2.25,
            }}
          >
            {lead}
          </Typography>
                {editButton("lead")}
                {recommendationCallouts(leadRecommendations)}
              </>
            )}
          </Box>
        )}
        {!isImmersive && canonicalSlug && (
          <Typography sx={{ fontFamily: theme.palette.fonts.mono, fontSize: "0.75rem", color: t.granite }}>
            Article ID: {canonicalSlug}
          </Typography>
        )}
      </Box>

      {showContents && sections.length > 1 && (
        <Box
          sx={{
            mx: { xs: 2.5, md: isImmersive ? 5 : 4 },
            mt: { xs: 0.5, md: 1 },
            mb: { xs: 3, md: 4 },
            pb: 2.25,
            borderBottom: `1px solid ${t.articleDivider}`,
          }}
        >
          <Typography
            sx={{
              fontFamily: theme.palette.fonts.articleBody,
              fontSize: { xs: "1.5rem", md: "1.85rem" },
              fontWeight: 800,
              color: t.pepsiNavy,
              textTransform: "none",
              letterSpacing: 0,
              lineHeight: 1.05,
              mb: 1.25,
            }}
          >
            Table Of Contents
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2,
              display: "flex",
              flexDirection: "column",
              gap: 0.45,
              color: t.pepsiBlue,
              fontFamily: theme.palette.fonts.articleBody,
              fontSize: { xs: "0.9375rem", md: "1rem" },
              lineHeight: 1.5,
              "& li::marker": { color: t.pepsiBlue },
              "& a": {
                color: t.pepsiBlue,
                fontWeight: 700,
                textDecoration: "none",
                "&:hover": {
                  color: t.pepsiBlueStrong,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                },
              },
            }}
          >
            {sections.map((section) => (
              <li key={section}>
                <a href={`#${articleAnchorId(section)}`}>{section}</a>
              </li>
            ))}
          </Box>
        </Box>
      )}

      {/* Article body */}
      <Box
        sx={{
          position: "relative",
          px: { xs: 2.5, md: isImmersive ? 5 : 4 },
          py: { xs: 2.5, md: isImmersive ? 4 : 3.5 },
          fontFamily: theme.palette.fonts.articleBody,
          color: t.ink,
          fontSize: { xs: "0.9375rem", md: "1rem" },
          fontWeight: 500,
          lineHeight: 1.65,

          "& > *:first-of-type": { mt: 0 },
          "& > *:last-child": { mb: 0 },

          "& h1": {
            display: "none",
          },
          "& h2": {
            fontFamily: theme.palette.fonts.articleTitle,
            fontSize: { xs: "1.85rem", md: "2.35rem" },
            fontWeight: 800,
            letterSpacing: 0,
            lineHeight: 0.98,
            color: t.pepsiNavy,
            mt: { xs: 4.5, md: 5.25 },
            mb: 1.15,
            pb: 0,
            borderBottom: 0,
            scrollMarginTop: 24,
          },
          "& h3": {
            fontFamily: theme.palette.fonts.articleTitle,
            fontSize: { xs: "1.45rem", md: "1.75rem" },
            fontWeight: 800,
            letterSpacing: 0,
            lineHeight: 1.05,
            color: t.pepsiNavy,
            mt: 3.25,
            mb: 0.85,
            scrollMarginTop: 24,
          },
          "& h4": {
            fontFamily: theme.palette.fonts.articleBody,
            fontSize: "0.875rem",
            fontWeight: 600,
            color: t.slate,
            mt: 2.25,
            mb: 0.5,
          },

          "& p": { my: 1.25, color: t.ink, maxWidth: "none" },

          "& ul, & ol": { my: 1.1, pl: 3, maxWidth: "none" },
          "& li": {
            mb: 0.35,
            "&::marker": { color: t.pepsiBlue, fontWeight: 600 },
          },
          "& li > p": { my: 0.25 },
          "& ul ul, & ol ol, & ul ol, & ol ul": { my: 0.5 },

          "& strong": { fontWeight: 600, color: t.ink },
          "& em": { fontStyle: "italic" },

          "& a": {
            color: t.pepsiBlue,
            textDecoration: "underline",
            textDecorationColor: "rgba(0, 75, 147, 0.35)",
            textUnderlineOffset: "3px",
            fontWeight: 500,
            transition: "text-decoration-color 150ms, color 150ms",
            "&:hover": {
              color: t.pepsiBlueStrong,
              textDecorationColor: t.pepsiBlueStrong,
            },
          },

          "& code": {
            fontFamily: theme.palette.fonts.articleBody,
            fontSize: "0.85em",
            fontWeight: 500,
            bgcolor: t.pepsiBlueSubtle,
            px: 0.625,
            py: 0.125,
            borderRadius: 0.5,
            color: t.pepsiBlueStrong,
          },

          "& pre": {
            bgcolor: t.mist,
            p: 2,
            borderRadius: "8px",
            overflow: "auto",
            my: 2,
            "& code": {
              bgcolor: "transparent",
              p: 0,
              fontSize: "0.8125rem",
              lineHeight: 1.6,
              color: t.ink,
            },
          },

          "& blockquote": {
            borderLeft: `3px solid ${t.pepsiBlue}`,
            pl: 2,
            py: 0.7,
            my: 2.5,
            color: t.slate,
            bgcolor: t.pepsiBlueSubtle,
            borderRadius: "8px",
            "& p": { my: 0.5 },
          },

          "& table": {
            borderCollapse: "collapse",
            width: "100%",
            my: 2.25,
            fontSize: "0.8125rem",
            border: `1px solid ${t.articleDivider}`,
          },
          "& th": {
            textAlign: "left",
            fontWeight: 600,
            color: "#FFFFFF",
            fontSize: "0.8125rem",
            fontFamily: theme.palette.fonts.articleBody,
            textTransform: "none",
            letterSpacing: 0,
            py: 1,
            px: 1.5,
            borderBottom: 0,
            bgcolor: t.pepsiBlueDeep,
          },
          "& td": {
            py: 1.05,
            px: 1.5,
            borderBottom: `1px solid ${t.articleDivider}`,
            verticalAlign: "top",
          },
          "& tbody tr:nth-of-type(even)": { bgcolor: "#F8FAFC" },
          "& tr:last-of-type td": { borderBottom: 0 },

          "& details": {
            my: 1.5,
            maxWidth: "none",
            borderRadius: "8px",
            overflow: "hidden",
            bgcolor: t.pepsiBlue,
            p: 0.75,
          },
          "& summary": {
            cursor: "pointer",
            listStyle: "none",
            bgcolor: t.pepsiBlue,
            color: "#FFFFFF",
            fontWeight: 500,
            fontSize: { xs: "1rem", md: "1.125rem" },
            lineHeight: 1.25,
            px: 0.75,
            py: 0.6,
            display: "flex",
            alignItems: "center",
            gap: 1,
            "&::-webkit-details-marker": { display: "none" },
            "&::after": {
              content: "\"⌄\"",
              marginLeft: "auto",
              fontSize: "1.25rem",
              lineHeight: 1,
              transition: "transform 140ms",
            },
            "&:focus-visible": {
              outline: `2px solid ${t.pepsiBlueStrong}`,
              outlineOffset: 2,
            },
          },
          "& details[open]": {
            border: 0,
            bgcolor: t.pepsiBlue,
          },
          "& details[open] summary": {
            mb: 0.75,
            "&::after": {
              transform: "rotate(180deg)",
            },
          },
          "& details > p, & details > ul, & details > ol, & details > table, & details > blockquote": {
            bgcolor: "#FFFFFF",
            color: t.ink,
            borderRadius: "8px",
            mx: 0,
            mb: 0,
            px: { xs: 1.5, md: 2 },
            py: { xs: 1.25, md: 1.6 },
          },
          "& details > p + p, & details > ul + p, & details > p + ul, & details > ol + p": {
            mt: 0.75,
          },

          "& hr": {
            border: 0,
            borderTop: `1px solid ${t.articleDivider}`,
            my: 5,
          },
        }}
      >
        {readDepthPercent !== undefined && (
          <Tooltip title={`Typical reader depth: ${readDepthPercent}%`} placement="left" arrow>
            <Box
              aria-label={`Typical reader depth: ${readDepthPercent}%`}
              sx={{
                position: "absolute",
                top: `${Math.min(94, Math.max(6, readDepthPercent))}%`,
                right: { xs: 8, md: 15 },
                transform: "translateY(-50%)",
                width: 18,
                height: 18,
                borderRadius: "50%",
                bgcolor: t.errorInk,
                border: "3px solid #FFFFFF",
                boxShadow: "0 0 0 3px rgba(197,34,31,0.20), 0 2px 5px rgba(197,34,31,0.45)",
                cursor: "help",
                zIndex: 1,
              }}
            />
          </Tooltip>
        )}
        {editableSections ? (
          <Stack spacing={1.5}>
            {editableSections.map((section) => {
              const isEditing = editingKey === section.key;
              return (
                <Box
                  key={section.key}
                  id={section.hideHeading ? articleAnchorId(section.title) : undefined}
                  sx={editableBlockSx}
                >
                  {isEditing ? (
                    <Stack spacing={1.25}>
                      {section.editor ?? (
                        <>
                          {section.onTitleChange && (
                            <TextField
                              autoFocus
                              fullWidth
                              variant="filled"
                              label="Section heading"
                              value={section.title}
                              onChange={(event) => section.onTitleChange?.(event.target.value)}
                              InputProps={{ disableUnderline: true }}
                              sx={{
                                "& .MuiInputBase-root": {
                                  bgcolor: t.surfaceContainerLow,
                                  borderRadius: 1.5,
                                  fontWeight: 650,
                                },
                              }}
                            />
                          )}
                          <TextField
                            autoFocus={!section.onTitleChange}
                            fullWidth
                            multiline
                            minRows={6}
                            variant="filled"
                            label="Article content"
                            value={section.body}
                            onChange={(event) => section.onBodyChange(event.target.value)}
                            InputProps={{ disableUnderline: true }}
                            sx={{
                              "& .MuiInputBase-root": {
                                bgcolor: t.surfaceContainerLow,
                                borderRadius: 1.5,
                                fontSize: isImmersive ? "1rem" : "0.9375rem",
                                lineHeight: 1.65,
                              },
                            }}
                          />
                        </>
                      )}
                      {recommendationCallouts(section.recommendations)}
                      <Box>
                        <Button size="small" variant="contained" onClick={onDoneEditing}>
                          Done
                        </Button>
                      </Box>
                    </Stack>
                  ) : (
                    <>
                      {!section.hideHeading && (
                        <h2 id={articleAnchorId(section.title)}>{section.title}</h2>
                      )}
                      {section.preview ? (
                        section.preview
                      ) : section.body.trim() ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {section.body}
                        </ReactMarkdown>
                      ) : (
                        <Typography sx={{ color: t.granite, fontStyle: "italic" }}>
                          Add content for this section.
                        </Typography>
                      )}
                      {editButton(section.key)}
                      {recommendationCallouts(section.recommendations)}
                    </>
                  )}
                </Box>
              );
            })}
          </Stack>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                const text = textFromChildren(children);
                return <h2 id={articleAnchorId(text)}>{children}</h2>;
              },
              h3: ({ children }) => {
                const text = textFromChildren(children);
                return <h3 id={articleAnchorId(text)}>{children}</h3>;
              },
            }}
          >
            {readerBody}
          </ReactMarkdown>
        )}
      </Box>
    </Box>
  );
}

// Simple inline PepsiCo-style globe mark. Geometric, monochrome so it
// works on the blue header band. Kept compact and confident.
function PepsiMark() {
  return (
    <Box
      component="svg"
      viewBox="0 0 28 28"
      sx={{ width: 22, height: 22, color: "#004B93", flexShrink: 0 }}
      aria-hidden
    >
      <circle cx="14" cy="14" r="13" fill="currentColor" opacity="0.18" />
      <path
        d="M 4 11 A 12 12 0 0 1 24 11 L 4 11 Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M 4 17 A 12 12 0 0 0 24 17 L 4 17 Z"
        fill="currentColor"
        opacity="0.55"
      />
    </Box>
  );
}
