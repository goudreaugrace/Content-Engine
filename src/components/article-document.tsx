import { Box, Chip, Divider, Stack, Typography, useTheme } from "@mui/material";
import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ContentType, Market } from "../lib/api";
import { localeFor } from "../lib/market";

type Props = {
  body: string;
  market?: Market;
  title?: string;
  lead?: string;
  contentType?: ContentType;
  canonicalSlug?: string;
  showContents?: boolean;
  showMastheadMeta?: boolean;
  presentation?: "standard" | "immersive";
  showMasthead?: boolean;
};

export function articleAnchorId(value: string) {
  return `section-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
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
  showContents = true,
  showMastheadMeta = true,
  presentation = "standard",
  showMasthead = true,
}: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const locale = market ? localeFor(market) : "en-US";
  const parsedTitle = body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim();
  const title = titleProp?.trim() || parsedTitle || "Knowledge article";
  const readerBody = body.replace(/^#\s+.+\n+/, "").trim();
  const sections = Array.from(readerBody.matchAll(/^##\s+(.+?)\s*$/gm)).map((m) =>
    m[1].trim(),
  );
  const isImmersive = presentation === "immersive";

  return (
    <Box
      sx={{
        bgcolor: "#FFFFFF",
        border: `1px solid ${t.border}`,
        borderRadius: isImmersive ? 2.5 : 0,
        overflow: "hidden",
        maxWidth: isImmersive ? "none" : 820,
        boxShadow: isImmersive ? "0 18px 45px rgba(0, 46, 93, 0.10)" : "none",
      }}
    >
      {isImmersive && showMasthead && <Box sx={{ height: 8, bgcolor: t.pepsiBlueStrong }} />}
      {/* Reader masthead */}
      {showMasthead && (
        <Box
          sx={{
            px: { xs: 2.5, md: 4 },
            py: 1.25,
            borderBottom: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            bgcolor: isImmersive ? "#F7FBFF" : t.paper,
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
                color: t.pepsiBlueStrong,
              }}
            >
              pepsico
            </Typography>
            <Box
              sx={{
                width: 1,
                height: 14,
                bgcolor: t.border,
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
          pt: { xs: 3, md: isImmersive ? 5 : 4 },
          pb: 2,
        }}
      >
        <Typography
          component="h1"
          sx={{
            fontFamily: theme.palette.fonts.sans,
            fontSize: { xs: "2rem", md: isImmersive ? "2.75rem" : "2.35rem" },
            fontWeight: isImmersive ? 750 : 500,
            letterSpacing: 0,
            lineHeight: 1.12,
            color: t.ink,
            mb: 1.25,
          }}
        >
          {title}
        </Typography>
        {lead && (
          <Typography
            sx={{
              maxWidth: isImmersive ? 860 : 680,
              color: t.ink,
              fontSize: isImmersive ? "1.125rem" : "1.0625rem",
              lineHeight: 1.65,
              mb: 1.75,
            }}
          >
            {lead}
          </Typography>
        )}
        {canonicalSlug && (
          <Typography sx={{ fontFamily: theme.palette.fonts.mono, fontSize: "0.75rem", color: t.granite }}>
            Article ID: {canonicalSlug}
          </Typography>
        )}
      </Box>

      {showContents && sections.length > 1 && (
        <Box
          sx={{
            mx: { xs: 2.5, md: isImmersive ? 5 : 4 },
            mb: 2,
            p: 2,
            border: `1px solid ${t.border}`,
            bgcolor: isImmersive ? "#F7FBFF" : t.surfaceContainerLow,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: t.pepsiBlueStrong,
              textTransform: "uppercase",
              letterSpacing: 0,
              mb: 1,
            }}
          >
            Contents
          </Typography>
          <Box
            component="ol"
            sx={{
              m: 0,
              pl: 2.25,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              columnGap: 3,
              rowGap: 0.5,
              color: t.pepsiBlueStrong,
              fontSize: "0.875rem",
              "& li::marker": { color: t.granite },
            }}
          >
            {sections.map((section) => (
              <li key={section}>{section}</li>
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ borderColor: t.border }} />

      {/* Article body */}
      <Box
        sx={{
          px: { xs: 2.5, md: isImmersive ? 5 : 4 },
          py: { xs: 3, md: isImmersive ? 5 : 4 },
          fontFamily: theme.palette.fonts.sans,
          color: t.ink,
          fontSize: isImmersive ? "1.0625rem" : "1rem",
          lineHeight: 1.72,

          "& > *:first-of-type": { mt: 0 },
          "& > *:last-child": { mb: 0 },

          "& h1": {
            display: "none",
          },
          "& h2": {
            fontFamily: theme.palette.fonts.sans,
            fontSize: "1.45rem",
            fontWeight: 600,
            letterSpacing: 0,
            lineHeight: 1.3,
            color: t.ink,
            mt: 4,
            mb: 1.5,
            pb: 0.75,
            borderBottom: `1px solid ${t.border}`,
            scrollMarginTop: 24,
          },
          "& h3": {
            fontFamily: theme.palette.fonts.sans,
            fontSize: "1.0625rem",
            fontWeight: 600,
            letterSpacing: 0,
            lineHeight: 1.35,
            color: t.pepsiBlueStrong,
            mt: 3.5,
            mb: 1,
            scrollMarginTop: 24,
          },
          "& h4": {
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: t.ink,
            mt: 3,
            mb: 0.75,
          },

          "& p": { my: 1.5, color: t.ink, maxWidth: isImmersive ? 860 : 700 },

          "& ul, & ol": { my: 1.5, pl: 3, maxWidth: isImmersive ? 860 : 700 },
          "& li": {
            mb: 0.5,
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
            fontFamily: theme.palette.fonts.sans,
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
            borderRadius: 1,
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
            py: 0.75,
            my: 2.5,
            color: t.slate,
            "& p": { my: 0.5 },
          },

          "& table": {
            borderCollapse: "collapse",
            width: "100%",
            my: 2.5,
            fontSize: "0.875rem",
          },
          "& th": {
            textAlign: "left",
            fontWeight: 600,
            color: t.pepsiBlue,
            fontSize: "0.6875rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            py: 1,
            px: 1.5,
            borderBottom: `2px solid ${t.pepsiBlue}`,
            bgcolor: t.pepsiBlueSubtle,
          },
          "& td": {
            py: 1.25,
            px: 1.5,
            borderBottom: `1px solid ${t.border}`,
            verticalAlign: "top",
          },
          "& tr:last-of-type td": { borderBottom: 0 },

          "& hr": {
            border: 0,
            borderTop: `1px solid ${t.border}`,
            my: 5,
          },
        }}
      >
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
