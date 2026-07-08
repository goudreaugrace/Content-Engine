import { useState } from "react";
import {
  Box,
  TextField,
  IconButton,
  Stack,
  Typography,
  Button,
  useTheme,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import EastIcon from "@mui/icons-material/East";

type Props = {
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
};

export default function TerminologyEditor({ value, onChange }: Props) {
  const theme = useTheme();
  const t = theme.palette.tokens;
  const entries = Object.entries(value);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

  const update = (oldKey: string, newKey: string, newValue: string) => {
    const next: Record<string, string> = {};
    for (const [k, v] of entries) {
      if (k === oldKey) next[newKey] = newValue;
      else next[k] = v;
    }
    onChange(next);
  };

  const remove = (key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  };

  const add = () => {
    const f = draftFrom.trim();
    const v = draftTo.trim();
    if (!f || !v) return;
    onChange({ ...value, [f]: v });
    setDraftFrom("");
    setDraftTo("");
  };

  return (
    <Box>
      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No terminology mappings yet. Add one below.
        </Typography>
      ) : (
        <Stack spacing={1.25} sx={{ mb: 2.5 }}>
          {entries.map(([key, val]) => (
            <Stack key={key} direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                value={key}
                onChange={(e) => update(key, e.target.value, val)}
                placeholder="Source term"
                sx={{ flex: 1 }}
              />
              <EastIcon sx={{ fontSize: 14, color: t.granite }} />
              <TextField
                size="small"
                value={val}
                onChange={(e) => update(key, key, e.target.value)}
                placeholder="Replacement"
                sx={{ flex: 1 }}
              />
              <IconButton size="small" onClick={() => remove(key)}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          p: 1.25,
          borderRadius: 1,
          bgcolor: t.mist,
          border: `1px dashed ${t.borderStrong}`,
        }}
      >
        <TextField
          size="small"
          value={draftFrom}
          onChange={(e) => setDraftFrom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Source (e.g. 'soda')"
          sx={{ flex: 1 }}
          InputProps={{ sx: { bgcolor: t.surface } }}
        />
        <EastIcon sx={{ fontSize: 14, color: t.granite }} />
        <TextField
          size="small"
          value={draftTo}
          onChange={(e) => setDraftTo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Replacement (e.g. 'beverage')"
          sx={{ flex: 1 }}
          InputProps={{ sx: { bgcolor: t.surface } }}
        />
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={add}
          disabled={!draftFrom.trim() || !draftTo.trim()}
        >
          Add
        </Button>
      </Stack>
    </Box>
  );
}
