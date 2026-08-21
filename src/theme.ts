import { createTheme, alpha } from "@mui/material/styles";

// ============================================================================
// Tokens — clean, Google-style: white surfaces, neutral greys, blue primary.
// Token keys are kept stable so components don't need to change; only values
// move. (paper/surface = white, ink/slate/granite = Google text greys, etc.)
// ============================================================================

const tokens = {
  paper: "#FFFFFF",     // app background — original white
  surface: "#FFFFFF",   // cards, panels — white
  // Material 3 surface tint hierarchy. Subtle blue-grey washes layered on
  // top of pure white. The page background is `paper`; cards sit on
  // `surfaceContainer` for visual separation without a stroke.
  surfaceContainerLow: "#F8FAFC",     // 1-2% blue-grey tint — backdrop under header bars
  surfaceContainer: "#F1F4F8",        // 3-4% — quiet container surfaces
  surfaceContainerHigh: "#E9EEF5",    // 5-6% — emphasized containers, drawer
  mist: "#F1F3F4",      // hover / secondary surface (Google grey)
  border: "#DDE5EC",    // default border + divider, slightly cooler for myPepsiCo pages
  borderStrong: "#B9C6D2",
  granite: "#6B7785",   // tertiary text, disabled
  slate: "#5E6B76",     // secondary text, labels
  ink: "#1F2933",       // primary text, headings
  inkSoft: "#334155",   // hover on ink text

  // Attention accent — used only for "needs attention" signals (pending review,
  // unsaved changes, in-flight job, active trace step). Primary actions use blue.
  ember: "#D56E0C",
  emberBg: "#FEEFC3",
  emberStrong: "#A8530A",

  successInk: "#188038",  // Google green
  successBg: "#E6F4EA",
  errorInk: "#C5221F",    // Google red
  errorBg: "#FCE8E6",
  infoInk: "#0067B1",
  infoBg: "#EAF4FB",

  // PepsiCo brand. Doubles as the primary/interactive color across the system
  // (buttons, links, active nav) and the article-document branding.
  pepsiBlue: "#155798",
  pepsiBlueStrong: "#003B5C",
  pepsiBlueSubtle: "#EAF4FB",
  pepsiBlueDeep: "#02355A",
  pepsiNavy: "#02355A",
  articleFrameBg: "#FFFFFF",
  articleDocumentBg: "#FAFAFA",
  articleRailBg: "#FAFAFA",
  articleDivider: "#E5EAF0",
  pepsiRed: "#E32934",
};

// Inter across the entire system. Keys kept (sans/serif/mono) so existing
// component references resolve; all point to Inter now.
const fontInter = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
const fontPoppins = '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
const fontBarlowSemiCondensed = '"Barlow Semi Condensed", "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
const fontSans = fontInter;
const fontSerif = fontBarlowSemiCondensed;
const fontMono = fontInter;

// Google-style elevation. Cards stay flat (border only); these are for
// floating surfaces — menus, dialogs, the article document.
const elevation = {
  menu: "0 1px 3px 0 rgba(60,64,67,0.15), 0 4px 8px 3px rgba(60,64,67,0.08)",
  dialog: "0 4px 8px 3px rgba(60,64,67,0.08), 0 1px 3px 0 rgba(60,64,67,0.2)",
};

declare module "@mui/material/styles" {
  interface Palette {
    tokens: typeof tokens;
    fonts: { sans: string; serif: string; mono: string; articleTitle: string; articleBody: string };
  }
  interface PaletteOptions {
    tokens?: typeof tokens;
    fonts?: { sans: string; serif: string; mono: string; articleTitle: string; articleBody: string };
  }
}

// Register the Material 3 "filled tonal" button as a typed variant so
// callers can use <Button variant="tonal"> without TS complaining.
declare module "@mui/material/Button" {
  interface ButtonPropsVariantOverrides {
    tonal: true;
  }
}

// ============================================================================

export const theme = createTheme({
  palette: {
    mode: "light",
    tokens,
    fonts: {
      sans: fontSans,
      serif: fontSerif,
      mono: fontMono,
      articleTitle: fontBarlowSemiCondensed,
      articleBody: fontPoppins,
    },
    primary: {
      main: tokens.pepsiBlue,
      light: tokens.pepsiBlueSubtle,
      dark: tokens.pepsiBlueStrong,
      contrastText: "#FFFFFF",
    },
    secondary: { main: tokens.slate, contrastText: "#FFFFFF" },
    warning: {
      main: tokens.ember,
      light: tokens.emberBg,
      dark: tokens.emberStrong,
      contrastText: "#FFFFFF",
    },
    success: {
      main: tokens.successInk,
      light: tokens.successBg,
      dark: "#0F6B2E",
      contrastText: "#FFFFFF",
    },
    error: {
      main: tokens.errorInk,
      light: tokens.errorBg,
      dark: "#A50E0E",
      contrastText: "#FFFFFF",
    },
    info: {
      main: tokens.infoInk,
      light: tokens.infoBg,
      dark: "#1456A8",
      contrastText: "#FFFFFF",
    },
    background: { default: tokens.paper, paper: tokens.surface },
    text: {
      primary: tokens.ink,
      secondary: tokens.slate,
      disabled: tokens.granite,
    },
    divider: tokens.border,
    action: {
      hover: tokens.mist,
      selected: tokens.pepsiBlueSubtle,
      focus: alpha(tokens.pepsiBlue, 0.12),
      disabled: tokens.granite,
      disabledBackground: tokens.mist,
    },
  },

  shape: { borderRadius: 8 },

  typography: {
    fontFamily: fontInter,
    // The MUI variant names below map to Material 3 type roles:
    //   h1/h2/h3 → Display (Large/Medium/Small)
    //   h4/h5/h6 → Headline (Large/Medium/Small)
    //   subtitle1/2 → Title (Large/Medium)
    //   body1/2  → Body (Large/Medium)
    //   button   → Label (Large)
    //   caption  → Label (Small)
    //   overline → Label (Tiny — Google's mini caps)
    //
    // M3 spec uses positive letter-spacing at small sizes (better readability)
    // and negative at display sizes (tighter, more refined).
    h1: { fontWeight: 400, fontSize: "clamp(2.25rem, 5vw, 3.5625rem)", lineHeight: 1.12, letterSpacing: "-0.016em" },
    h2: { fontWeight: 400, fontSize: "clamp(1.875rem, 4vw, 2.8125rem)", lineHeight: 1.15, letterSpacing: "-0.005em" },
    h3: { fontWeight: 400, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.22, letterSpacing: 0 },
    // Page-level H1 (most pages use variant="h4"). Google uses lighter weights
    // at display sizes — restrained, not bold.
    h4: {
      fontWeight: 400,
      fontSize: "clamp(1.5rem, 3vw, 2rem)",
      lineHeight: 1.25,
      letterSpacing: 0,
      color: tokens.pepsiNavy,
    },
    h5: { fontWeight: 400, fontSize: "1.5rem", lineHeight: 1.33, letterSpacing: 0 },
    h6: { fontWeight: 500, fontSize: "1.125rem", lineHeight: 1.4, letterSpacing: "0.005em" },
    subtitle1: { fontWeight: 500, fontSize: "1rem", lineHeight: 1.5, letterSpacing: "0.009em" },
    subtitle2: { fontWeight: 500, fontSize: "0.875rem", lineHeight: 1.45, letterSpacing: "0.007em" },
    body1: { fontSize: "0.9375rem", lineHeight: 1.55, letterSpacing: "0.015em" },
    body2: { fontSize: "0.875rem", lineHeight: 1.5, letterSpacing: "0.015em" },
    // M3 Label Large — used by button labels. M3 spec is 14px / weight 500.
    button: { fontWeight: 500, fontSize: "0.875rem", letterSpacing: "0.007em", textTransform: "none" },
    caption: { fontSize: "0.75rem", lineHeight: 1.45, letterSpacing: "0.025em", color: tokens.slate },
    overline: {
      fontSize: "0.6875rem",
      fontWeight: 600,
      letterSpacing: "0.08em",
      lineHeight: 1.4,
      color: tokens.slate,
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: { WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" },
        body: { backgroundColor: tokens.paper, color: tokens.ink },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
          },
        },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none", boxShadow: "none" },
        outlined: { borderColor: tokens.border },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0, variant: "outlined" },
      styleOverrides: {
        root: {
          borderColor: tokens.border,
          boxShadow: "none",
          backgroundColor: tokens.surface,
          borderRadius: 12,
        },
      },
    },

    MuiAppBar: {
      defaultProps: { elevation: 0, color: "transparent" },
      styleOverrides: {
        // M3 top app bar: sits on a surface tint, no hard border. The tint
        // alone provides separation from the page body.
        root: {
          backgroundColor: tokens.surfaceContainerLow,
          boxShadow: "none",
          borderBottom: "none",
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        // Drawer adopts a slightly tinted surface so it reads as a calmer
        // backdrop than the white page content. No vertical hairline.
        paper: {
          backgroundColor: tokens.surfaceContainerLow,
          borderRight: "none",
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        // Material 3: fully-rounded button shape. The corner radius scales
        // with the button height so every size renders as a pill.
        root: {
          textTransform: "none",
          boxShadow: "none",
          borderRadius: 999,
          fontWeight: 500,
          padding: "8px 20px",
          minHeight: 40,
          transition:
            "background-color 120ms ease, color 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
          "&:hover": { boxShadow: "none" },
        },
        sizeLarge: { padding: "12px 26px", fontSize: "0.9375rem", minHeight: 48 },
        sizeSmall: { padding: "5px 14px", fontSize: "0.8125rem", minHeight: 32 },
        containedPrimary: {
          backgroundColor: tokens.pepsiBlue,
          color: "#FFFFFF",
          "&:hover": {
            backgroundColor: tokens.pepsiBlueStrong,
            // M3 "hover state layer" — soft shadow appears on hover only.
            boxShadow: "0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)",
          },
        },
        outlined: {
          borderColor: alpha(tokens.pepsiBlue, 0.45),
          color: tokens.pepsiBlue,
          "&:hover": {
            borderColor: tokens.pepsiBlue,
            backgroundColor: alpha(tokens.pepsiBlue, 0.04),
          },
        },
        text: {
          color: tokens.pepsiBlue,
          "&:hover": { backgroundColor: alpha(tokens.pepsiBlue, 0.06) },
        },
      },
      // Material 3 introduces a "filled tonal" button — a softer alternative
      // to contained. Used for medium-emphasis actions (Mark as reviewed,
      // Approve & continue) where contained would be too loud. Accessed via
      // <Button color="primary" variant="contained" className="tonal"> in
      // theory; cleaner to expose as variant="tonal" via a custom variant.
      variants: [
        {
          props: { variant: "tonal" as any },
          style: {
            backgroundColor: tokens.pepsiBlueSubtle,
            color: tokens.pepsiBlueStrong,
            boxShadow: "none",
            "&:hover": {
              backgroundColor: alpha(tokens.pepsiBlue, 0.16),
              boxShadow: "none",
            },
            "&:active": {
              backgroundColor: alpha(tokens.pepsiBlue, 0.22),
            },
            "&.Mui-disabled": {
              backgroundColor: tokens.mist,
              color: tokens.granite,
            },
          },
        },
      ],
    },

    MuiIconButton: {
      styleOverrides: {
        // M3 icon buttons are circular with a generous touch target.
        root: {
          color: tokens.slate,
          borderRadius: "50%",
          padding: 8,
          "&:hover": { backgroundColor: tokens.mist, color: tokens.ink },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: "0.75rem",
          height: 28,
          // Material 3 assist/filter chips are fully rounded (8px) but read
          // as pills at this height. Bumping from 8 → 16 matches M3 spec.
          borderRadius: 16,
        },
        outlined: {
          borderColor: tokens.border,
          backgroundColor: tokens.surface,
          color: tokens.slate,
          "&.MuiChip-colorPrimary": {
            borderColor: alpha(tokens.pepsiBlue, 0.35),
            color: tokens.pepsiBlueStrong,
            backgroundColor: tokens.pepsiBlueSubtle,
          },
          "&.MuiChip-colorWarning": {
            borderColor: alpha(tokens.ember, 0.4),
            color: tokens.emberStrong,
            backgroundColor: tokens.emberBg,
          },
          "&.MuiChip-colorSuccess": {
            borderColor: alpha(tokens.successInk, 0.3),
            color: tokens.successInk,
            backgroundColor: tokens.successBg,
          },
          "&.MuiChip-colorError": {
            borderColor: alpha(tokens.errorInk, 0.3),
            color: tokens.errorInk,
            backgroundColor: tokens.errorBg,
          },
          "&.MuiChip-colorInfo": {
            borderColor: alpha(tokens.infoInk, 0.3),
            color: tokens.infoInk,
            backgroundColor: tokens.infoBg,
          },
        },
        filled: {
          backgroundColor: tokens.mist,
          color: tokens.ink,
          "&.MuiChip-colorPrimary": {
            backgroundColor: tokens.pepsiBlueSubtle,
            color: tokens.pepsiBlueStrong,
          },
          "&.MuiChip-colorWarning": {
            backgroundColor: tokens.emberBg,
            color: tokens.emberStrong,
          },
          "&.MuiChip-colorSuccess": {
            backgroundColor: tokens.successBg,
            color: tokens.successInk,
          },
          "&.MuiChip-colorError": {
            backgroundColor: tokens.errorBg,
            color: tokens.errorInk,
          },
          "&.MuiChip-colorInfo": {
            backgroundColor: tokens.infoBg,
            color: tokens.infoInk,
          },
        },
        icon: { color: "inherit" },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: tokens.border } },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.surface,
          // M3 outlined inputs sit at a clearly readable 4-12px radius;
          // larger than buttons because the field is a content surface.
          borderRadius: 8,
          transition: "background-color 150ms ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: tokens.border,
            transition: "border-color 120ms ease",
          },
          "&:hover": {
            backgroundColor: alpha(tokens.ink, 0.02),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: tokens.borderStrong,
          },
          "&.Mui-focused": {
            backgroundColor: tokens.surface,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: tokens.pepsiBlue,
            // M3 uses a 2px outline on focus for a clear, accessible ring.
            borderWidth: 2,
          },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": {
            borderColor: tokens.errorInk,
          },
        },
        input: { padding: "12px 14px" },
        inputSizeSmall: { padding: "9px 12px" },
      },
    },

    MuiFormHelperText: {
      styleOverrides: {
        // M3 supporting text: smaller, denser, slightly muted.
        root: {
          marginLeft: 0,
          fontSize: "0.75rem",
          lineHeight: 1.4,
          color: tokens.slate,
          "&.Mui-error": { color: tokens.errorInk },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: tokens.slate,
          "&.Mui-focused": { color: tokens.pepsiBlue },
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: { root: { boxShadow: "none" } },
    },

    MuiTableHead: {
      styleOverrides: {
        // M3 data-table header: lowercase weight in spec; we keep tiny uppercase
        // labels because the page-level look is closer to Google Workspace
        // (Drive / Calendar list views) than a pure M3 data table. Compromise.
        root: {
          "& .MuiTableCell-root": {
            color: tokens.slate,
            fontWeight: 500,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            backgroundColor: tokens.paper,
            borderBottom: `1px solid ${tokens.border}`,
            // Slight extra top/bottom on the header row for breathing room.
            padding: "16px 16px",
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${tokens.border}`,
          fontSize: "0.875rem",
          // 18px vertical = 56-px row height (M3 data-table row spec).
          padding: "18px 16px",
          // Color tuning: cell text picks up `ink` so rendered Typography
          // doesn't have to override it on every cell.
          color: tokens.ink,
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        // M3 state-layer hover at 8% over the row's resting surface. Subtle
        // enough not to compete with chips inside the row, strong enough that
        // the hand cursor + tint together signal "clickable".
        root: {
          transition: "background-color 100ms ease",
          "&:hover": { backgroundColor: alpha(tokens.ink, 0.04) },
          "&:last-of-type .MuiTableCell-root": { borderBottom: 0 },
        },
        // When MUI applies the `hover` prop, an MUI internal class is set on
        // the row to enable cursor pointer. Reinforce here so the affordance
        // also lands when we render rows manually with onClick.
        hover: { cursor: "pointer" },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.ink,
          color: "#FFFFFF",
          fontSize: "0.75rem",
          fontWeight: 500,
          borderRadius: 6,
          padding: "6px 10px",
        },
        arrow: { color: tokens.ink },
      },
    },

    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderColor: tokens.border,
          color: tokens.slate,
          fontWeight: 500,
          borderRadius: 8,
          "&.Mui-selected": {
            backgroundColor: tokens.pepsiBlueSubtle,
            color: tokens.pepsiBlueStrong,
            borderColor: alpha(tokens.pepsiBlue, 0.3),
            "&:hover": { backgroundColor: alpha(tokens.pepsiBlue, 0.12) },
          },
        },
      },
    },

    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: tokens.border,
          "&.Mui-active": { color: tokens.pepsiBlue },
          "&.Mui-completed": { color: tokens.pepsiBlue },
        },
        text: { fill: "#FFFFFF", fontWeight: 500 },
      },
    },

    MuiStepLabel: {
      styleOverrides: {
        label: {
          fontSize: "0.875rem",
          "&.Mui-active": { fontWeight: 600, color: tokens.ink },
          "&.Mui-completed": { color: tokens.slate },
        },
      },
    },

    MuiAlert: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: { borderRadius: 8, padding: "10px 14px", fontSize: "0.875rem" },
        outlinedInfo: {
          borderColor: tokens.border,
          backgroundColor: tokens.mist,
          color: tokens.ink,
          "& .MuiAlert-icon": { color: tokens.slate },
        },
        outlinedWarning: {
          borderColor: alpha(tokens.ember, 0.35),
          backgroundColor: tokens.emberBg,
          color: tokens.emberStrong,
          "& .MuiAlert-icon": { color: tokens.ember },
        },
        outlinedSuccess: {
          borderColor: alpha(tokens.successInk, 0.25),
          backgroundColor: tokens.successBg,
          color: tokens.successInk,
        },
        outlinedError: {
          borderColor: alpha(tokens.errorInk, 0.25),
          backgroundColor: tokens.errorBg,
          color: tokens.errorInk,
        },
      },
    },

    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          backgroundColor: tokens.ink,
          color: "#FFFFFF",
          borderRadius: 8,
          boxShadow: elevation.menu,
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12, boxShadow: elevation.dialog },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          border: `1px solid ${tokens.border}`,
          boxShadow: elevation.menu,
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          padding: "8px 14px",
          "&:hover": { backgroundColor: tokens.mist },
          "&.Mui-selected": {
            backgroundColor: tokens.pepsiBlueSubtle,
            color: tokens.pepsiBlueStrong,
            "&:hover": { backgroundColor: alpha(tokens.pepsiBlue, 0.14) },
          },
        },
      },
    },

    MuiAccordion: {
      defaultProps: { elevation: 0, disableGutters: true },
      styleOverrides: {
        root: {
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          boxShadow: "none",
          backgroundColor: tokens.surface,
          overflow: "hidden",
          "&:before": { display: "none" },
          "&.Mui-expanded": { margin: 0 },
          "& + &": { marginTop: 8 },
        },
      },
    },

    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          minHeight: 44,
          padding: "0 16px",
          color: tokens.pepsiBlueStrong,
          "&.Mui-expanded": { minHeight: 44 },
          "&:hover": { backgroundColor: tokens.pepsiBlueSubtle },
          "& .MuiAccordionSummary-expandIconWrapper": {
            color: tokens.pepsiBlueStrong,
          },
        },
        content: {
          margin: "10px 0",
          "&.Mui-expanded": { margin: "10px 0" },
        },
      },
    },

    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          borderTop: `1px solid ${tokens.border}`,
          padding: "14px 16px 16px",
        },
      },
    },
  },
});

// Helper kept for back-compat with components importing { mono }.
export const mono = {
  fontFamily: fontMono,
  fontSize: "0.75rem",
  color: theme.palette.text.secondary,
  letterSpacing: 0,
} as const;
