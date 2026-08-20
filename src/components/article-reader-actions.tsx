import { useState } from "react";
import { Box, Button, ListItemText, Menu, MenuItem, Stack, useTheme } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";

type Props = {
  selectedLocale: string;
  availableLocales?: string[];
  onLocaleSelect?: (locale: string) => void;
};

function languageLabelForLocale(locale: string): string {
  if (locale === "global") return "Global";
  const language = locale.toLowerCase().split("-")[0];
  const names: Record<string, string> = {
    en: "English",
    es: "Spanish",
    pt: "Portuguese",
    hi: "Hindi",
    fr: "French",
    de: "German",
    it: "Italian",
    ja: "Japanese",
    zh: "Chinese",
    ko: "Korean",
  };
  return `${names[language] ?? locale} (${locale})`;
}

export default function ArticleReaderActions({
  selectedLocale,
  availableLocales = [selectedLocale],
  onLocaleSelect,
}: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const locales = Array.from(new Set([selectedLocale, ...availableLocales].filter(Boolean)));

  const close = () => setAnchorEl(null);
  const selectLocale = (locale: string) => {
    onLocaleSelect?.(locale);
    close();
  };

  const filterButtonSx = {
    borderRadius: "8px",
    borderWidth: 1,
    borderColor: t.pepsiNavy,
    color: t.pepsiNavy,
    bgcolor: t.articleRailBg,
    minHeight: 30,
    px: 1,
    py: 0.4,
    fontFamily: theme.palette.fonts.articleBody,
    fontSize: "0.75rem",
    fontWeight: 500,
    textTransform: "none",
    "&:hover": {
      borderWidth: 1,
      borderColor: t.pepsiNavy,
      bgcolor: t.pepsiBlueSubtle,
    },
  } as const;

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="flex-end"
      sx={{ mb: { xs: 2.5, md: 3.5 } }}
    >
      <FavoriteBorderIcon sx={{ fontSize: 24, color: "#D0021B" }} />
      <Button
        variant="outlined"
        endIcon={<ExpandMoreIcon />}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : undefined}
        aria-label={`Available translations. Current language is ${languageLabelForLocale(selectedLocale)}`}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={filterButtonSx}
      >
        Available Translations
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        MenuListProps={{
          dense: true,
          sx: { py: 0.75 },
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 236,
            borderRadius: "8px",
            bgcolor: t.articleRailBg,
            border: `1px solid ${t.articleDivider}`,
            boxShadow: "0 10px 28px rgba(2, 53, 90, 0.14)",
          },
        }}
      >
        {locales.map((locale) => {
          const selected = locale === selectedLocale;
          return (
            <MenuItem
              key={locale}
              selected={selected}
              onClick={() => selectLocale(locale)}
              sx={{
                mx: 0.75,
                my: 0.25,
                minHeight: 38,
                borderRadius: "8px",
                color: selected ? t.pepsiNavy : t.ink,
                bgcolor: selected ? t.pepsiBlueSubtle : "transparent",
                fontFamily: theme.palette.fonts.articleBody,
                "&.Mui-selected": {
                  bgcolor: t.pepsiBlueSubtle,
                },
                "&:hover": {
                  bgcolor: t.pepsiBlueSubtle,
                },
              }}
            >
              <ListItemText
                primary={languageLabelForLocale(locale)}
                secondary={selected ? "Current article language" : undefined}
                primaryTypographyProps={{
                  fontFamily: theme.palette.fonts.articleBody,
                  fontSize: "0.8125rem",
                  fontWeight: selected ? 700 : 500,
                  color: selected ? t.pepsiNavy : t.ink,
                }}
                secondaryTypographyProps={{
                  fontFamily: theme.palette.fonts.articleBody,
                  fontSize: "0.6875rem",
                  color: t.granite,
                }}
              />
              {selected && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: t.pepsiBlue,
                    ml: 1.5,
                  }}
                />
              )}
            </MenuItem>
          );
        })}
      </Menu>
      <Button variant="outlined" endIcon={<ExpandMoreIcon />} sx={filterButtonSx}>
        Give Feedback
      </Button>
    </Stack>
  );
}
