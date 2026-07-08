import { Box, useTheme } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  children: string;
  /** Max measure for body prose. Defaults to 65ch per DESIGN.md. */
  maxWidth?: string;
};

/**
 * Renders article body markdown styled to match the system.
 * No serifs, no mono (per DESIGN.md). Hierarchy via Gilroy weights + size.
 */
export default function MarkdownContent({ children, maxWidth = "65ch" }: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;

  return (
    <Box
      sx={{
        maxWidth,
        color: t.ink,
        fontSize: "0.9375rem",
        lineHeight: 1.7,

        "& > *:first-of-type": { mt: 0 },
        "& > *:last-child": { mb: 0 },

        // Headings
        "& h1": {
          fontSize: "1.875rem",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          color: t.ink,
          mt: 5,
          mb: 2,
        },
        "& h2": {
          fontSize: "1.375rem",
          fontWeight: 700,
          letterSpacing: "-0.015em",
          lineHeight: 1.3,
          color: t.ink,
          mt: 5,
          mb: 1.5,
        },
        "& h3": {
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

        // Paragraphs
        "& p": {
          my: 1.75,
          color: t.ink,
        },

        // Lists
        "& ul, & ol": {
          my: 1.75,
          pl: 3,
        },
        "& li": {
          mb: 0.5,
          "&::marker": { color: t.slate },
        },
        "& li > p": { my: 0.25 },
        "& ul ul, & ol ol, & ul ol, & ol ul": {
          my: 0.5,
        },

        // Strong / em
        "& strong": { fontWeight: 600, color: t.ink },
        "& em": { fontStyle: "italic" },

        // Links
        "& a": {
          color: t.ink,
          textDecoration: "underline",
          textDecorationColor: t.borderStrong,
          textUnderlineOffset: "3px",
          transition: "text-decoration-color 150ms",
          "&:hover": { textDecorationColor: t.ink },
        },

        // Inline code
        "& code": {
          fontFamily: theme.palette.fonts.sans,
          fontSize: "0.85em",
          fontWeight: 500,
          bgcolor: t.mist,
          px: 0.625,
          py: 0.125,
          borderRadius: 0.5,
          color: t.ink,
        },

        // Code block
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
          },
        },

        // Blockquote
        "& blockquote": {
          borderLeft: `2px solid ${t.borderStrong}`,
          pl: 2,
          py: 0.5,
          my: 2,
          color: t.slate,
          "& p": { my: 0.5 },
        },

        // Tables
        "& table": {
          borderCollapse: "collapse",
          width: "100%",
          my: 2.5,
          fontSize: "0.875rem",
        },
        "& th": {
          textAlign: "left",
          fontWeight: 600,
          color: t.slate,
          fontSize: "0.6875rem",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          py: 1,
          px: 1.5,
          borderBottom: `1px solid ${t.border}`,
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
          my: 4,
        },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </Box>
  );
}
