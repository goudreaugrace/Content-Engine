import { Box, Tooltip, Typography, useTheme } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Market } from "../lib/api";
import { localeFor } from "../lib/market";

type Props = {
  body: string;
  market?: Market;
  /** Optional owner-view marker, displayed outside the article content. */
  readDepthPercent?: number;
};

/**
 * Renders an article body as a "real document" — a white-paper container with
 * a PepsiCo-blue branding band at the top, headings/links in PepsiCo blue,
 * Gilroy throughout. This is one of two documented exceptions to the
 * Flat-By-Default rule in DESIGN.md (the other is the sticky save bar).
 */
export default function ArticleDocument({ body, market, readDepthPercent }: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  const locale = market ? localeFor(market) : "en-US";

  return (
    <Box
      sx={{
        // White paper container against the off-white page
        bgcolor: "#FFFFFF",
        border: `1px solid ${t.border}`,
        borderRadius: 1,
        overflow: "hidden",
        maxWidth: 820,
        // Subtle ambient shadow = the document is "laid on" the desk.
        // Documented exception to flat-by-default in DESIGN.md.
        boxShadow: "0 1px 2px rgba(42,37,29,0.04), 0 8px 24px rgba(42,37,29,0.06)",
      }}
    >
      {/* ───── PepsiCo branding band ───── */}
      <Box
        sx={{
          bgcolor: t.pepsiBlue,
          color: "#FFFFFF",
          px: { xs: 3, md: 5 },
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <PepsiMark />
          <Typography
            sx={{
              fontFamily: theme.palette.fonts.sans,
              fontWeight: 700,
              fontSize: "0.875rem",
              letterSpacing: "0.04em",
              color: "#FFFFFF",
            }}
          >
            PEPSICO
          </Typography>
          <Box
            sx={{
              width: 1,
              height: 14,
              bgcolor: "rgba(255,255,255,0.35)",
              mx: 0.5,
            }}
          />
          <Typography
            sx={{
              fontFamily: theme.palette.fonts.sans,
              fontWeight: 500,
              fontSize: "0.8125rem",
              color: "rgba(255,255,255,0.92)",
            }}
            noWrap
          >
            MyPepsiCo · Knowledge Article
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: theme.palette.fonts.sans,
            fontWeight: 500,
            fontSize: "0.6875rem",
            letterSpacing: "0.04em",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {locale.toUpperCase()}
        </Typography>
      </Box>

      {/* ───── Document body ───── */}
      <Box
        sx={{
          position: "relative",
          px: { xs: 3, md: 6 },
          py: { xs: 4, md: 6 },
          fontFamily: theme.palette.fonts.sans,
          color: t.ink,
          fontSize: "0.9375rem",
          lineHeight: 1.7,

          "& > *:first-of-type": { mt: 0 },
          "& > *:last-child": { mb: 0 },

          // Headings — H2 in PepsiCo blue
          "& h1": {
            fontFamily: theme.palette.fonts.sans,
            fontSize: "1.875rem",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: t.ink,
            mt: 0,
            mb: 3,
          },
          "& h2": {
            fontFamily: theme.palette.fonts.sans,
            fontSize: "1.375rem",
            fontWeight: 700,
            letterSpacing: "-0.015em",
            lineHeight: 1.3,
            color: t.pepsiBlue,
            mt: 5,
            mb: 1.5,
          },
          "& h3": {
            fontFamily: theme.palette.fonts.sans,
            fontSize: "1.0625rem",
            fontWeight: 600,
            letterSpacing: "-0.005em",
            lineHeight: 1.35,
            color: t.ink,
            mt: 3.5,
            mb: 1,
          },
          "& h4": {
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: t.ink,
            mt: 3,
            mb: 0.75,
          },

          "& p": { my: 1.75, color: t.ink },

          // Lists
          "& ul, & ol": { my: 1.75, pl: 3 },
          "& li": {
            mb: 0.5,
            "&::marker": { color: t.pepsiBlue, fontWeight: 600 },
          },
          "& li > p": { my: 0.25 },
          "& ul ul, & ol ol, & ul ol, & ol ul": { my: 0.5 },

          "& strong": { fontWeight: 600, color: t.ink },
          "& em": { fontStyle: "italic" },

          // Links — PepsiCo blue
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

          // Inline code
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

          // Code blocks
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

          // Blockquote
          "& blockquote": {
            borderLeft: `3px solid ${t.pepsiBlue}`,
            pl: 2,
            py: 0.75,
            my: 2.5,
            color: t.slate,
            "& p": { my: 0.5 },
          },

          // Tables — PepsiCo blue header underline
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

          // Horizontal rule
          "& hr": {
            border: 0,
            borderTop: `1px solid ${t.border}`,
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
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </Box>

      {/* ───── Footer accent ───── */}
      <Box
        sx={{
          height: 4,
          bgcolor: t.pepsiBlue,
        }}
      />
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
      sx={{ width: 22, height: 22, color: "#FFFFFF", flexShrink: 0 }}
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
