import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Stack,
  useTheme,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";

/**
 * Shared filter-chip Select used on every dashboard. Reads as a Material 3
 * filter chip:
 *
 *   - Inactive: outlined pill, gray label-then-value
 *   - Active:   filled tonal pill, leading checkmark, bold value
 *
 * Behaves as a single-select dropdown internally — the chip look is purely
 * visual. We use Select instead of MUI's Chip because we need the menu
 * affordance.
 */
export type FilterSelectOption = { value: string; label: string };

export default function FilterSelect({
  label,
  value,
  onChange,
  options,
  /** The sentinel value treated as "not filtered". Defaults to "all". */
  noFilterValue = "all",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterSelectOption[];
  noFilterValue?: string;
}) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const isActive = value !== noFilterValue;
  const selected = options.find((o) => o.value === value);

  return (
    <FormControl size="small">
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as string)}
        // Render the trigger as a Material 3 filter chip rather than a
        // standard select. The internal Select still drives the dropdown.
        // aria-label preserves the "Sector" / "Status" / etc. semantic
        // even though the trigger doesn't render the name — screen
        // readers still know which filter this chip controls.
        inputProps={{ "aria-label": label }}
        renderValue={() => (
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ overflow: "hidden" }}
          >
            {isActive && (
              <CheckIcon
                sx={{
                  fontSize: 16,
                  color: t.pepsiBlueStrong,
                  flexShrink: 0,
                  ml: -0.25,
                }}
              />
            )}
            <Box
              component="span"
              sx={{
                color: isActive ? t.pepsiBlueStrong : t.slate,
                fontSize: "0.8125rem",
                fontWeight: isActive ? 600 : 400,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {selected?.label ?? "All"}
            </Box>
          </Stack>
        )}
        sx={{
          // M3 filter chip: 32-px tall pill. Background swaps between
          // transparent (inactive) and pepsiBlueSubtle (active).
          height: 32,
          borderRadius: 999,
          bgcolor: isActive ? t.pepsiBlueSubtle : "transparent",
          transition: "background-color 120ms ease, border-color 120ms ease",
          "& .MuiSelect-select": {
            py: 0,
            pl: 1.5,
            pr: "30px !important",
            display: "flex",
            alignItems: "center",
            minHeight: "0 !important",
          },
          // Outlined notch becomes the chip's border.
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: isActive ? alpha(t, "pepsiBlue", 0.4) : t.border,
            borderRadius: 999,
          },
          "&:hover": {
            bgcolor: isActive ? alpha(t, "pepsiBlue", 0.16) : t.mist,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: isActive ? alpha(t, "pepsiBlue", 0.5) : t.borderStrong,
          },
          "& .MuiSelect-icon": {
            color: isActive ? t.pepsiBlueStrong : t.slate,
            right: 6,
            fontSize: 18,
          },
        }}
      >
        {options.map((o) => (
          <MenuItem
            key={o.value}
            value={o.value}
            sx={{
              fontSize: "0.875rem",
              minHeight: 36,
              // Highlight the currently-selected option inside the menu so
              // the user can verify their pick on re-open.
              "&.Mui-selected": {
                backgroundColor: t.pepsiBlueSubtle,
                "&:hover": { backgroundColor: t.pepsiBlueSubtle },
              },
            }}
          >
            {o.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Small local alpha helper — the theme's `alpha()` is from @mui/material/styles
// but we don't need a full import here; this is enough for our usage.
function alpha(t: any, key: string, opacity: number) {
  // Resolve color from the tokens map. Falls back to the raw value if it
  // isn't a hex string we can decompose.
  const hex: string = t[key];
  if (!hex || !hex.startsWith("#") || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}
