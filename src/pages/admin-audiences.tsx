import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardActionArea,
  Collapse,
  Divider,
  useTheme,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { api, type AudienceProfile } from "../lib/api";

export default function AdminAudiences() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = theme.palette.tokens;
  const [profiles, setProfiles] = useState<AudienceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .listAudiences()
      .then(setProfiles)
      .catch((e) => setError(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" component="h1">
        Audience Profiles
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.75, mb: 4, maxWidth: "62ch" }}>
        Personas the country agent writes for. Click an audience to see the full profile, or
        open Edit to tune the tone, reading context, or guidelines.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
          <CircularProgress size={24} sx={{ color: t.slate }} />
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {profiles.map((p) => {
            const open = expanded.has(p.id);
            return (
              <Card key={p.id} variant="outlined">
                <CardActionArea
                  onClick={() => toggle(p.id)}
                  sx={{ "&:hover": { bgcolor: t.mist } }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                    sx={{ px: 2.5, py: 1.75 }}
                  >
                    <Stack direction="row" alignItems="baseline" spacing={1.5} minWidth={0}>
                      <Typography
                        sx={{ fontSize: "1rem", fontWeight: 500, color: t.ink }}
                        noWrap
                      >
                        {p.label}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: theme.palette.fonts.mono,
                          fontSize: "0.75rem",
                          color: t.slate,
                        }}
                      >
                        {p.id}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/audiences/${p.id}`);
                        }}
                      >
                        Edit
                      </Button>
                      <KeyboardArrowDownIcon
                        sx={{
                          fontSize: 20,
                          color: t.slate,
                          transform: open ? "rotate(180deg)" : "none",
                          transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    </Stack>
                  </Stack>
                </CardActionArea>

                <Collapse in={open} timeout={200}>
                  <Divider />
                  <Box sx={{ px: 2.5, py: 2.5 }}>
                    <Stack spacing={2.5}>
                      <Field label="Summary" value={p.summary} />
                      <Field label="Tone of voice" value={p.toneOfVoice} />
                      <Field label="Reading context" value={p.readingContext} />
                      <Field label="Content guidelines" value={p.contentGuidelines} />
                    </Stack>
                  </Box>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="overline" sx={{ display: "block", mb: 0.75 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: "72ch" }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}
