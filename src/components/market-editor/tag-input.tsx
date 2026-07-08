import { useState } from "react";
import { Box, Chip, TextField, InputAdornment, IconButton, useTheme } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  chipColor?: "default" | "primary" | "error" | "success" | "warning";
};

export default function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter.",
  chipColor = "default",
}: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (value.includes(v)) {
      setInput("");
      return;
    }
    onChange([...value, v]);
    setInput("");
  };

  const remove = (term: string) => onChange(value.filter((t) => t !== term));

  return (
    <Box>
      <TextField
        size="small"
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !input && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={placeholder}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={add} disabled={!input.trim()} edge="end">
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {value.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
          {value.map((v) =>
            chipColor === "primary" ? (
              <Box
                key={v}
                sx={{
                  fontFamily: theme.palette.fonts.mono,
                  fontSize: "0.75rem",
                  color: t.slate,
                  bgcolor: t.mist,
                  px: 1,
                  py: 0.5,
                  borderRadius: 0.5,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover .remove-x": { opacity: 1 },
                }}
              >
                {v}
                <Box
                  component="span"
                  className="remove-x"
                  role="button"
                  onClick={() => remove(v)}
                  sx={{
                    opacity: 0,
                    cursor: "pointer",
                    color: t.granite,
                    "&:hover": { color: t.ink },
                    transition: "opacity 100ms",
                    ml: 0.25,
                    fontFamily: theme.palette.fonts.sans,
                  }}
                >
                  ×
                </Box>
              </Box>
            ) : (
              <Chip
                key={v}
                label={v}
                size="small"
                color={chipColor}
                variant={chipColor === "error" ? "filled" : "outlined"}
                onDelete={() => remove(v)}
              />
            ),
          )}
        </Box>
      )}
    </Box>
  );
}
